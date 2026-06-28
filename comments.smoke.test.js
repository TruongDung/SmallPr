const request = require('supertest');

process.env.SMTP_HOST = 'smtp.test.local';
process.env.SMTP_USER = 'smtp-user';
process.env.SMTP_PASS = 'smtp-pass';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: jest.fn().mockResolvedValue({}) })),
}));

const RUN_ID = `csmoke-${Date.now()}-${Math.round(Math.random() * 100000)}`;
const testUsername = (name) => `${RUN_ID}-${name}`;
const humanRegistrationPayload = () => ({
  human_check: { started_at: Date.now() - 2000, interaction_count: 2, website: '' },
});

const { app } = require('./server');
jest.setTimeout(30000);

const verifyRegistration = async (token) => {
  const r = await request(app).get(`/api/verify-email?token=${encodeURIComponent(token)}`);
  expect(r.statusCode).toBe(200);
};

const createAgent = async (username) => {
  const agent = request.agent(app);
  const r = await agent.post('/api/register').send({
    username, email: `${username}@example.com`, password: 'Password123!', ...humanRegistrationPayload(),
  });
  expect(r.statusCode).toBe(200);
  await verifyRegistration(r.body.verification_token);
  const l = await agent.post('/api/login').send({ username, password: 'Password123!' });
  expect(l.statusCode).toBe(200);
  return agent;
};

describe('Task comments (multi-comment)', () => {
  test('add, list, edit, delete; ownership + validation enforced', async () => {
    const owner = await createAgent(testUsername('owner'));
    const other = await createAgent(testUsername('other'));

    const created = await owner.post('/api/tasks').send({ title: 'Has comments' });
    expect(created.statusCode).toBe(200);
    const taskId = created.body.task.id;

    // Empty list initially, and detail includes comments: []
    const detail = await owner.get(`/api/tasks/${taskId}`);
    expect(detail.statusCode).toBe(200);
    expect(Array.isArray(detail.body.task.comments)).toBe(true);
    expect(detail.body.task.comments).toHaveLength(0);

    // Add two comments
    const c1 = await owner.post(`/api/tasks/${taskId}/comments`).send({ body: '<p>First</p>' });
    expect(c1.statusCode).toBe(200);
    expect(c1.body.comment).toMatchObject({ body: '<p>First</p>', task_id: taskId });
    const c2 = await owner.post(`/api/tasks/${taskId}/comments`).send({ body: 'Second' });
    expect(c2.statusCode).toBe(200);

    const list = await owner.get(`/api/tasks/${taskId}/comments`);
    expect(list.body.comments).toHaveLength(2);
    expect(list.body.comments[0].body).toBe('<p>First</p>');
    expect(list.body.comments[0].author_username).toContain('owner');

    // Empty comment rejected
    const empty = await owner.post(`/api/tasks/${taskId}/comments`).send({ body: '   ' });
    expect(empty.statusCode).toBe(400);

    // Over-length rejected
    const tooLong = await owner.post(`/api/tasks/${taskId}/comments`).send({ body: 'x'.repeat(10001) });
    expect(tooLong.statusCode).toBe(400);

    // Edit own comment
    const edited = await owner.put(`/api/tasks/${taskId}/comments/${c1.body.comment.id}`).send({ body: 'Edited first' });
    expect(edited.statusCode).toBe(200);
    expect(edited.body.comment.body).toBe('Edited first');

    // Another user with no access cannot see or comment (404)
    const noAccessList = await other.get(`/api/tasks/${taskId}/comments`);
    expect(noAccessList.statusCode).toBe(404);
    const noAccessAdd = await other.post(`/api/tasks/${taskId}/comments`).send({ body: 'sneaky' });
    expect(noAccessAdd.statusCode).toBe(404);

    // Delete own comment
    const del = await owner.delete(`/api/tasks/${taskId}/comments/${c2.body.comment.id}`);
    expect(del.statusCode).toBe(200);
    const afterDelete = await owner.get(`/api/tasks/${taskId}/comments`);
    expect(afterDelete.body.comments).toHaveLength(1);

    // Legacy single comment field still works (regression guard)
    const legacy = await owner.put(`/api/tasks/${taskId}`).send({ comment: 'legacy note' });
    expect(legacy.statusCode).toBe(200);
    expect(legacy.body.task.comment).toBe('legacy note');
  });
});
