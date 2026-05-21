const request = require('supertest');

process.env.TASK_ALERT_TO = '';
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';

const mockSendMail = jest.fn().mockResolvedValue({});
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

const RUN_ID = `test-${Date.now()}-${Math.round(Math.random() * 100000)}`;
const testUsername = (name) => `${RUN_ID}-${name}`;

const { app, db, dbReady } = require('./server');
const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.setTimeout(30000);

const createAgent = async (username = testUsername(`user-${Math.random()}`)) => {
  const agent = request.agent(app);
  const response = await agent
    .post('/api/signup')
    .send({ username, password: 'Password123!' });

  expect(response.statusCode).toBe(200);
  expect(response.body.user).toMatchObject({ username });

  return agent;
};

const attachment = (name = 'notes.txt', data = 'hello') => ({
  name,
  type: 'text/plain',
  data: `data:text/plain;base64,${Buffer.from(data).toString('base64')}`,
  size: Buffer.byteLength(data),
});

beforeAll(async () => {
  await dbReady;
});

afterAll(async () => {
  warnSpy.mockRestore();
  try {
    await db.query('DELETE FROM users WHERE username LIKE $1', [`${RUN_ID}%`]);
  } catch (error) {
    if (process.env.JEST_WORKER_ID) {
      console.error('Test cleanup skipped:', error.message);
    }
  } finally {
    await db.end();
  }
});

describe('Auth API', () => {
  test('signs up a new user and logs in successfully', async () => {
    const username = testUsername('testuser');
    const signupResponse = await request(app)
      .post('/api/signup')
      .send({ username, password: 'Password123!' });

    expect(signupResponse.statusCode).toBe(200);
    expect(signupResponse.body.user).toMatchObject({ username });

    const loginResponse = await request(app)
      .post('/api/login')
      .send({ username, password: 'Password123!' });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.body.user).toMatchObject({ username });
  });

  test('rejects signup without required fields', async () => {
    const response = await request(app)
      .post('/api/signup')
      .send({ username: '' });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error', 'Username and password are required');
  });

  test('rejects duplicate usernames', async () => {
    const username = testUsername('duplicate-user');
    await createAgent(username);

    const response = await request(app)
      .post('/api/signup')
      .send({ username, password: 'Password123!' });

    expect(response.statusCode).toBe(409);
    expect(response.body).toHaveProperty('error', 'Username already exists');
  });

  test('rejects invalid login credentials for nonexistent user', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({ username: 'nonexistent', password: 'wrongpass' });

    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty('error', 'Invalid credentials');
  });

  test('rejects login with incorrect password for existing user', async () => {
    const username = testUsername('existinguser');
    await createAgent(username);

    const loginResponse = await request(app)
      .post('/api/login')
      .send({ username, password: 'WrongPass1!' });

    expect(loginResponse.statusCode).toBe(401);
    expect(loginResponse.body).toHaveProperty('error', 'Invalid credentials');
  });
});

describe('Task API', () => {
  test('requires authentication before listing tasks', async () => {
    const response = await request(app).get('/api/tasks');

    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty('error', 'Authentication required');
  });

  test('creates and lists a task with rich text and an attachment', async () => {
    const agent = await createAgent(testUsername('task-owner'));
    const file = attachment('plan.txt', 'project notes');

    const createResponse = await agent
      .post('/api/tasks')
      .send({
        title: 'Plan',
        tag: 'Launch',
        priority: 'high',
        status: 'in_progress',
        description: '<p><strong>Ship it</strong></p>',
        reminder_at: '2026-05-13T09:30',
        attachment: file,
      });

    expect(createResponse.statusCode).toBe(200);
    expect(createResponse.body.task).toMatchObject({
      title: 'Plan',
      tag: 'Launch',
      priority: 'high',
      status: 'in_progress',
      completed: 0,
      description: '<p><strong>Ship it</strong></p>',
      reminder_at: '2026-05-13T09:30',
      attachment_name: 'plan.txt',
      attachment_type: 'text/plain',
      attachment_size: file.size,
    });

    const listResponse = await agent.get('/api/tasks');

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.body.tasks).toHaveLength(1);
    expect(listResponse.body.tasks[0]).toMatchObject({
      title: 'Plan',
      tag: 'Launch',
      priority: 'high',
      status: 'in_progress',
      attachment_name: 'plan.txt',
    });
  });

  test('defaults task priority to medium', async () => {
    const agent = await createAgent(testUsername('default-priority-owner'));

    const response = await agent
      .post('/api/tasks')
      .send({ title: 'Default' });

    expect(response.statusCode).toBe(200);
    expect(response.body.task).toMatchObject({
      title: 'Default',
      priority: 'medium',
    });
  });

  test('defaults task status to todo', async () => {
    const agent = await createAgent(testUsername('default-status-owner'));

    const response = await agent
      .post('/api/tasks')
      .send({ title: 'Default status' });

    expect(response.statusCode).toBe(200);
    expect(response.body.task).toMatchObject({
      title: 'Default status',
      status: 'todo',
      completed: 0,
    });
  });

  test('lists higher priority tasks first', async () => {
    const agent = await createAgent(testUsername('priority-order-owner'));

    await agent
      .post('/api/tasks')
      .send({ title: 'Low item', priority: 'low' });
    await agent
      .post('/api/tasks')
      .send({ title: 'High item', priority: 'high' });
    await agent
      .post('/api/tasks')
      .send({ title: 'Medium item', priority: 'medium' });

    const response = await agent.get('/api/tasks');

    expect(response.statusCode).toBe(200);
    expect(response.body.tasks.map((task) => task.title)).toEqual([
      'High item',
      'Medium item',
      'Low item',
    ]);
  });

  test('rejects invalid task priorities', async () => {
    const agent = await createAgent(testUsername('bad-priority-owner'));

    const response = await agent
      .post('/api/tasks')
      .send({ title: 'Bad priority', priority: 'urgent' });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error', 'Task priority must be low, medium, or high');
  });

  test('rejects invalid task statuses', async () => {
    const agent = await createAgent(testUsername('bad-status-owner'));

    const response = await agent
      .post('/api/tasks')
      .send({ title: 'Bad status', status: 'blocked' });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error', 'Task status must be todo, in_progress, or done');
  });

  test('rejects task titles over 20 characters', async () => {
    const agent = await createAgent(testUsername('long-title-owner'));

    const response = await agent
      .post('/api/tasks')
      .send({ title: 'This title is definitely too long' });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error', 'Task title must be 20 characters or less');
  });

  test('rejects task tags over 40 characters', async () => {
    const agent = await createAgent(testUsername('long-tag-owner'));

    const response = await agent
      .post('/api/tasks')
      .send({ title: 'Tagged', tag: 'x'.repeat(41) });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error', 'Task tag must be 40 characters or less');
  });

  test('rejects invalid attachment payloads', async () => {
    const agent = await createAgent(testUsername('bad-attachment-owner'));

    const response = await agent
      .post('/api/tasks')
      .send({
        title: 'Bad file',
        attachment: {
          name: 'bad.txt',
          type: 'text/plain',
          data: 'not-a-data-url',
          size: 12,
        },
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error', 'Invalid attachment');
  });

  test('updates task fields while preserving the existing attachment', async () => {
    const agent = await createAgent(testUsername('preserve-attachment-owner'));

    const createResponse = await agent
      .post('/api/tasks')
      .send({
        title: 'Draft',
        description: 'Old description',
        attachment: attachment('original.txt', 'original file'),
      });

    const taskId = createResponse.body.task.id;
    const updateResponse = await agent
      .put(`/api/tasks/${taskId}`)
      .send({
        title: 'Final',
        tag: 'Review',
        priority: 'low',
        status: 'done',
        description: '<p>New description</p>',
        comment: 'Ready for review',
      });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.task).toMatchObject({
      id: taskId,
      title: 'Final',
      tag: 'Review',
      priority: 'low',
      status: 'done',
      description: '<p>New description</p>',
      comment: 'Ready for review',
      completed: 1,
      attachment_name: 'original.txt',
    });

    const listResponse = await agent.get('/api/tasks');
    expect(listResponse.body.tasks.find((task) => task.id === taskId)).toMatchObject({
      comment: 'Ready for review',
    });
  });

  test('saves a comment-only task update', async () => {
    const agent = await createAgent(testUsername('comment-only-owner'));

    const createResponse = await agent
      .post('/api/tasks')
      .send({
        title: 'Comment',
        description: 'Task detail',
      });

    const taskId = createResponse.body.task.id;
    const updateResponse = await agent
      .put(`/api/tasks/${taskId}`)
      .send({
        comment: 'Saved from task detail',
      });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.task).toMatchObject({
      id: taskId,
      title: 'Comment',
      description: 'Task detail',
      comment: 'Saved from task detail',
    });

    const listResponse = await agent.get('/api/tasks');
    expect(listResponse.body.tasks.find((task) => task.id === taskId)).toMatchObject({
      comment: 'Saved from task detail',
    });
  });

  test('replaces an attachment when editing a task', async () => {
    const agent = await createAgent(testUsername('replace-attachment-owner'));

    const createResponse = await agent
      .post('/api/tasks')
      .send({
        title: 'Upload',
        attachment: attachment('before.txt', 'before'),
      });

    const taskId = createResponse.body.task.id;
    const newAttachment = attachment('after.txt', 'after');
    const updateResponse = await agent
      .put(`/api/tasks/${taskId}`)
      .send({
        title: 'Upload',
        attachment: newAttachment,
      });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.task).toMatchObject({
      id: taskId,
      attachment_name: 'after.txt',
      attachment_type: 'text/plain',
      attachment_size: newAttachment.size,
    });
    expect(updateResponse.body.task.attachment_data).toBe(newAttachment.data);
  });

  test('archives and restores a task', async () => {
    const agent = await createAgent(testUsername('archive-owner'));

    const createResponse = await agent
      .post('/api/tasks')
      .send({ title: 'Archive me' });

    const taskId = createResponse.body.task.id;
    const archiveResponse = await agent
      .put(`/api/tasks/${taskId}`)
      .send({ archived: true });

    expect(archiveResponse.statusCode).toBe(200);
    expect(archiveResponse.body.task).toMatchObject({
      id: taskId,
      archived: 1,
    });

    const activeResponse = await agent.get('/api/tasks');
    expect(activeResponse.body.tasks).toHaveLength(0);

    const archivedResponse = await agent.get('/api/tasks?archived=true');
    expect(archivedResponse.body.tasks).toHaveLength(1);
    expect(archivedResponse.body.tasks[0]).toMatchObject({
      id: taskId,
      title: 'Archive me',
      archived: 1,
    });

    const restoreResponse = await agent
      .put(`/api/tasks/${taskId}`)
      .send({ archived: false });

    expect(restoreResponse.statusCode).toBe(200);
    expect(restoreResponse.body.task).toMatchObject({
      id: taskId,
      archived: 0,
    });
  });

  test('deletes only tasks owned by the signed-in user', async () => {
    const owner = await createAgent(testUsername('delete-owner'));
    const otherUser = await createAgent(testUsername('delete-other'));

    const createResponse = await owner
      .post('/api/tasks')
      .send({ title: 'Private task' });

    const taskId = createResponse.body.task.id;
    const forbiddenResponse = await otherUser.delete(`/api/tasks/${taskId}`);

    expect(forbiddenResponse.statusCode).toBe(404);
    expect(forbiddenResponse.body).toHaveProperty('error', 'Task not found');

    const deleteResponse = await owner.delete(`/api/tasks/${taskId}`);
    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.body).toHaveProperty('success', true);
  });

  test('manages tags and keeps task tag values in sync', async () => {
    const agent = await createAgent(testUsername('tag-manager-owner'));

    const createTagResponse = await agent
      .post('/api/tags')
      .send({ name: 'Work' });

    expect(createTagResponse.statusCode).toBe(200);
    expect(createTagResponse.body.tag).toMatchObject({ name: 'Work' });

    const duplicateTagResponse = await agent
      .post('/api/tags')
      .send({ name: 'work' });

    expect(duplicateTagResponse.statusCode).toBe(200);
    expect(duplicateTagResponse.body.tag.id).toBe(createTagResponse.body.tag.id);

    const createTaskResponse = await agent
      .post('/api/tasks')
      .send({ title: 'Tagged', tag: 'Work' });

    expect(createTaskResponse.statusCode).toBe(200);
    expect(createTaskResponse.body.task).toMatchObject({ tag: 'Work' });

    const renameResponse = await agent
      .put(`/api/tags/${createTagResponse.body.tag.id}`)
      .send({ name: 'Client' });

    expect(renameResponse.statusCode).toBe(200);
    expect(renameResponse.body.tag).toMatchObject({ name: 'Client' });

    const renamedTasksResponse = await agent.get('/api/tasks');
    expect(renamedTasksResponse.body.tasks[0]).toMatchObject({ title: 'Tagged', tag: 'Client' });

    const deleteResponse = await agent.delete(`/api/tags/${createTagResponse.body.tag.id}`);

    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.body).toHaveProperty('success', true);

    const clearedTasksResponse = await agent.get('/api/tasks');
    expect(clearedTasksResponse.body.tasks[0]).toMatchObject({ title: 'Tagged', tag: '' });
  });

  test('sends task summary email with an HTML table', async () => {
    const originalEnv = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
    };
    const agent = await createAgent(testUsername('summary-email-owner'));
    const comment = [
      '- TPA -> RDU',
      '-- Dung Truong : HKZMZR',
      '-- ngoc ngo + jennie:',
      'H282KG',
      '',
      '- RDU -> TPA',
      '-- Dung Truong + jennie:',
      'H2PXRG',
      '-- ngoc ngo + sophia:',
      'H24344',
      '',
      '- da cancel : H3H2MS',
    ].join('\n');
    const description = [
      '- TPA -> RDU',
      '-- Dung Truong : HKZMZR',
      '',
      '- RDU -> TPA',
      '-- ngoc ngo + sophia:',
      'H24344',
    ].join('\n');
    await agent
      .post('/api/tasks')
      .send({
        title: 'Email table',
        tag: 'Client',
        priority: 'high',
        status: 'in_progress',
        description,
        comment,
        reminder_at: '2026-05-13T09:30',
      });
    await agent
      .post('/api/tasks')
      .send({
        title: 'Todo email',
        tag: 'Client',
        priority: 'medium',
      });

    process.env.SMTP_HOST = 'smtp.test.local';
    process.env.SMTP_USER = 'sender@test.local';
    process.env.SMTP_PASS = 'secret';
    mockSendMail.mockClear();

    const response = await agent
      .post('/api/tasks/send-email')
      .send({ language: 'vi' });

    expect(response.statusCode).toBe(200);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailOptions = mockSendMail.mock.calls[0][0];
    expect(mailOptions.html).toContain('<table');
    expect(mailOptions.subject).toBe('Tóm tắt công việc');
    expect(mailOptions.html).toContain('<th style="border:1px solid #d1d5db;padding:8px;background:#f3f4f6;text-align:left;">Tiêu đề</th>');
    expect(mailOptions.html).toContain('<td style="border:1px solid #d1d5db;padding:8px;">Email table</td>');
    expect(mailOptions.html).toContain('<td style="border:1px solid #d1d5db;padding:8px;">Client</td>');
    expect(mailOptions.html).toContain('<td style="border:1px solid #d1d5db;padding:8px;">Cần làm</td>');
    expect(mailOptions.html).toContain([
      '<td style="border:1px solid #d1d5db;padding:8px;white-space:pre-line;">',
      '- TPA -&gt; RDU',
      '<br>-- Dung Truong : HKZMZR',
      '<br>',
      '<br>- RDU -&gt; TPA',
      '<br>-- ngoc ngo + sophia:',
      '<br>H24344',
      '</td>',
    ].join(''));
    expect(mailOptions.html).toContain([
      '<td style="border:1px solid #d1d5db;padding:8px;white-space:pre-line;">',
      '- TPA -&gt; RDU',
      '<br>-- Dung Truong : HKZMZR',
      '<br>-- ngoc ngo + jennie:',
      '<br>H282KG',
      '<br>',
      '<br>- RDU -&gt; TPA',
      '<br>-- Dung Truong + jennie:',
      '<br>H2PXRG',
      '<br>-- ngoc ngo + sophia:',
      '<br>H24344',
      '<br>',
      '<br>- da cancel : H3H2MS',
      '</td>',
    ].join(''));
    expect(mailOptions.html.indexOf('Email table')).toBeLessThan(mailOptions.html.indexOf('Todo email'));
    const headerLine = mailOptions.text.split('\n').find((line) => line.startsWith('#\t'));
    expect(headerLine.split('\t')).toHaveLength(9);
    expect(mailOptions.text).toContain(`Email table\tClient\tCao\tĐang làm\t${description}\t${comment}`);
    expect(mailOptions.text).toContain('Todo email\tClient\tTrung bình\tCần làm\tKhông có mô tả.\tKhông có bình luận');
    expect(mailOptions.text.indexOf('Email table')).toBeLessThan(mailOptions.text.indexOf('Todo email'));

    process.env.SMTP_HOST = originalEnv.SMTP_HOST;
    process.env.SMTP_USER = originalEnv.SMTP_USER;
    process.env.SMTP_PASS = originalEnv.SMTP_PASS;
  });
});
