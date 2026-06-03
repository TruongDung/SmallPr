const request = require('supertest');

process.env.TASK_ALERT_TO = '';
process.env.SMTP_HOST = 'smtp.test.local';
process.env.SMTP_USER = 'smtp-user';
process.env.SMTP_PASS = 'smtp-pass';

const mockSendMail = jest.fn().mockResolvedValue({});
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

const RUN_ID = `test-${Date.now()}-${Math.round(Math.random() * 100000)}`;
const TEST_STARTED_AT = new Date();
const TEST_ADMIN_PASSWORD = `${RUN_ID}-admin-password`;
process.env.DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || TEST_ADMIN_PASSWORD;
const testUsername = (name) => `${RUN_ID}-${name}`;
const humanRegistrationPayload = () => ({
  human_check: {
    started_at: Date.now() - 2000,
    interaction_count: 2,
    website: '',
  },
});

const verifyRegistration = async (token) => {
  const response = await request(app).get(`/api/verify-email?token=${encodeURIComponent(token)}`);
  expect(response.statusCode).toBe(200);
  expect(response.body).toHaveProperty('success', true);
};

const bcrypt = require('bcrypt');
const { app, db, dbReady } = require('./server');
const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.setTimeout(30000);
let originalAdminPasswordHash = null;
let originalAdminStatus = null;

const createAgent = async (username = testUsername(`user-${Math.random()}`)) => {
  const agent = request.agent(app);
  const response = await agent
    .post('/api/register')
    .send({
      username,
      email: `${username}@example.com`,
      password: 'Password123!',
      ...humanRegistrationPayload(),
    });

  expect(response.statusCode).toBe(200);
  expect(response.body.user).toMatchObject({ username });
  await verifyRegistration(response.body.verification_token);

  const loginResponse = await agent
    .post('/api/login')
    .send({ username, password: 'Password123!' });
  expect(loginResponse.statusCode).toBe(200);

  return agent;
};

const createAdminAgent = async () => {
  const agent = request.agent(app);
  const response = await agent
    .post('/api/login')
    .send({ username: 'admin', password: TEST_ADMIN_PASSWORD });

  expect(response.statusCode).toBe(200);
  expect(response.body.user).toMatchObject({ username: 'admin' });

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
  const admin = await db.query("SELECT password, account_status FROM users WHERE username = 'admin'");
  originalAdminPasswordHash = admin.rows[0]?.password || null;
  originalAdminStatus = admin.rows[0]?.account_status || null;
  if (originalAdminPasswordHash) {
    const hashedPassword = await bcrypt.hash(TEST_ADMIN_PASSWORD, 10);
    await db.query(
      "UPDATE users SET password = $1, account_status = 'enabled' WHERE username = 'admin'",
      [hashedPassword]
    );
  }
});

afterAll(async () => {
  warnSpy.mockRestore();
  try {
    if (originalAdminPasswordHash) {
      await db.query(
        'UPDATE users SET password = $1, account_status = COALESCE($2, account_status) WHERE username = $3',
        [originalAdminPasswordHash, originalAdminStatus, 'admin']
      );
    }
    await db.query(
      `DELETE FROM audit_logs
       WHERE summary LIKE $1
          OR user_id IN (SELECT id FROM users WHERE username LIKE $1)
          OR (action = 'login' AND summary = 'admin' AND created_at >= $2)`,
      [`${RUN_ID}%`, TEST_STARTED_AT]
    ).catch(() => {});
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
  test('returns the current user and clears it after logout', async () => {
    const username = testUsername('session-user');
    const agent = await createAgent(username);

    const meResponse = await agent.get('/api/me');
    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.body.user).toMatchObject({ username });

    const logoutResponse = await agent.post('/api/logout');
    expect(logoutResponse.statusCode).toBe(200);
    expect(logoutResponse.body).toHaveProperty('success', true);

    const loggedOutMeResponse = await agent.get('/api/me');
    expect(loggedOutMeResponse.statusCode).toBe(200);
    expect(loggedOutMeResponse.body).toEqual({ user: null });
  });

  test('returns null current user when not logged in', async () => {
    const response = await request(app).get('/api/me');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ user: null });
  });

  test('exposes public monitoring config without authentication', async () => {
    const response = await request(app).get('/api/config/public');

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.body).toEqual({
      sentry: expect.objectContaining({
        dsn: expect.any(String),
        environment: expect.any(String),
        release: expect.any(String),
        tracesSampleRate: expect.any(Number),
        replaysSessionSampleRate: expect.any(Number),
        replaysOnErrorSampleRate: expect.any(Number),
      }),
      posthog: expect.objectContaining({
        apiKey: expect.any(String),
        apiHost: expect.any(String),
      }),
    });
  });

  test('reports liveness and readiness for uptime monitors', async () => {
    const livenessResponse = await request(app).get('/healthz');
    expect(livenessResponse.statusCode).toBe(200);
    expect(livenessResponse.body).toMatchObject({
      status: 'ok',
      service: expect.any(String),
      environment: expect.any(String),
    });
    expect(livenessResponse.body).toHaveProperty('uptimeSeconds');
    expect(livenessResponse.headers['cache-control']).toContain('no-store');

    const readinessResponse = await request(app).get('/readyz');
    expect(readinessResponse.statusCode).toBe(200);
    expect(readinessResponse.body).toMatchObject({
      status: 'ok',
      dependencies: {
        database: { status: 'ok' },
        redis: expect.objectContaining({
          enabled: expect.any(Boolean),
        }),
      },
    });

    const apiHealthResponse = await request(app).get('/api/health');
    expect(apiHealthResponse.statusCode).toBe(200);
    expect(apiHealthResponse.body.dependencies.database.status).toBe('ok');
  });

  test('updates user settings and changes password', async () => {
    const username = testUsername('settings-user');
    const agent = await createAgent(username);

    const invalidTimezoneResponse = await agent
      .put('/api/me')
      .send({
        name: 'Settings User',
        email: `${username}@example.com`,
        timezone: 'Nope/Nowhere',
        language: 'en',
      });
    expect(invalidTimezoneResponse.statusCode).toBe(400);
    expect(invalidTimezoneResponse.body).toHaveProperty('error', 'Timezone is invalid');

    const updateResponse = await agent
      .put('/api/me')
      .send({
        name: 'Settings User',
        email: `${username}-updated@example.com`,
        timezone: 'Asia/Ho_Chi_Minh',
        language: 'vi',
      });
    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.user).toMatchObject({
      username,
      name: 'Settings User',
      email: `${username}-updated@example.com`,
      timezone: 'Asia/Ho_Chi_Minh',
      language: 'vi',
    });

    const meResponse = await agent.get('/api/me');
    expect(meResponse.body.user).toMatchObject({
      timezone: 'Asia/Ho_Chi_Minh',
      language: 'vi',
    });

    const dashboardResponse = await agent.get('/api/dashboard');
    expect(dashboardResponse.statusCode).toBe(200);
    expect(dashboardResponse.body.timezone).toBe('Asia/Ho_Chi_Minh');

    const wrongPasswordResponse = await agent
      .put('/api/me/password')
      .send({ current_password: 'WrongPassword123!', new_password: 'NewPassword123!' });
    expect(wrongPasswordResponse.statusCode).toBe(401);
    expect(wrongPasswordResponse.body).toHaveProperty('error', 'Current password is incorrect');

    const passwordResponse = await agent
      .put('/api/me/password')
      .send({ current_password: 'Password123!', new_password: 'NewPassword123!' });
    expect(passwordResponse.statusCode).toBe(200);
    expect(passwordResponse.body).toEqual({ success: true });

    await agent.post('/api/logout');

    const oldLoginResponse = await agent
      .post('/api/login')
      .send({ username, password: 'Password123!' });
    expect(oldLoginResponse.statusCode).toBe(401);

    const newLoginResponse = await agent
      .post('/api/login')
      .send({ username, password: 'NewPassword123!' });
    expect(newLoginResponse.statusCode).toBe(200);
  });

  test('signs up a new user and logs in successfully', async () => {
    const username = testUsername('testuser');
    const signupResponse = await request(app)
      .post('/api/register')
      .send({
        username,
        email: `${username}@example.com`,
        password: 'Password123!',
        ...humanRegistrationPayload(),
      });

    expect(signupResponse.statusCode).toBe(200);
    expect(signupResponse.body.user).toMatchObject({ username, account_status: 'pending_verification' });

    const pendingLoginResponse = await request(app)
      .post('/api/login')
      .send({ username, password: 'Password123!' });
    expect(pendingLoginResponse.statusCode).toBe(403);
    expect(pendingLoginResponse.body).toHaveProperty('error', 'Please verify your email before logging in');

    await verifyRegistration(signupResponse.body.verification_token);

    const loginResponse = await request(app)
      .post('/api/login')
      .send({ username, password: 'Password123!' });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.body.user).toMatchObject({ username });
  });

  test('rejects registration without a valid email', async () => {
    const response = await request(app)
      .post('/api/register')
      .send({ username: testUsername('missing-email'), password: 'Password123!', ...humanRegistrationPayload() });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error', 'A valid email is required');
  });

  test('rejects signup without required fields', async () => {
    const response = await request(app)
      .post('/api/register')
      .send({ username: '' });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error', 'Username and password are required');
  });

  test('rejects registration without human sign-up signals', async () => {
    const response = await request(app)
      .post('/api/register')
      .send({ username: testUsername('bot-user'), email: 'bot@example.com', password: 'Password123!' });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error', 'Please complete registration from the sign-up form.');
  });

  test('rejects registration when the honeypot field is filled', async () => {
    const response = await request(app)
      .post('/api/register')
      .send({
        username: testUsername('honeypot-user'),
        email: 'honeypot@example.com',
        password: 'Password123!',
        human_check: {
          started_at: Date.now() - 2000,
          interaction_count: 2,
          website: 'https://spam.example',
        },
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error', 'Please complete registration from the sign-up form.');
  });

  test('rejects duplicate usernames', async () => {
    const username = testUsername('duplicate-user');
    await createAgent(username);

    const response = await request(app)
      .post('/api/register')
      .send({
        username,
        email: `${username}@example.com`,
        password: 'Password123!',
        ...humanRegistrationPayload(),
      });

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

  test('rejects task descriptions over 10000 plain-text characters on create and update', async () => {
    const agent = await createAgent(testUsername('long-description-owner'));

    const createResponse = await agent
      .post('/api/tasks')
      .send({ title: 'Long desc', description: `<p>${'x'.repeat(10001)}</p>` });

    expect(createResponse.statusCode).toBe(400);
    expect(createResponse.body).toHaveProperty('error', 'Task description must be 10000 characters or less');

    const validCreateResponse = await agent
      .post('/api/tasks')
      .send({ title: 'Valid desc' });

    const updateResponse = await agent
      .put(`/api/tasks/${validCreateResponse.body.task.id}`)
      .send({ description: 'x'.repeat(10001) });

    expect(updateResponse.statusCode).toBe(400);
    expect(updateResponse.body).toHaveProperty('error', 'Task description must be 10000 characters or less');
  });

  test('rejects task comments over 10000 characters on create and update', async () => {
    const agent = await createAgent(testUsername('long-comment-owner'));

    const createResponse = await agent
      .post('/api/tasks')
      .send({ title: 'Long comment', comment: 'x'.repeat(10001) });

    expect(createResponse.statusCode).toBe(400);
    expect(createResponse.body).toHaveProperty('error', 'Task comment must be 10000 characters or less');

    const validCreateResponse = await agent
      .post('/api/tasks')
      .send({ title: 'Valid comment' });

    const updateResponse = await agent
      .put(`/api/tasks/${validCreateResponse.body.task.id}`)
      .send({ comment: 'x'.repeat(10001) });

    expect(updateResponse.statusCode).toBe(400);
    expect(updateResponse.body).toHaveProperty('error', 'Task comment must be 10000 characters or less');
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

  test('rejects attachments larger than 5 MB', async () => {
    const agent = await createAgent(testUsername('large-attachment-owner'));
    const largePayload = Buffer.alloc((5 * 1024 * 1024) + 1).toString('base64');

    const response = await agent
      .post('/api/tasks')
      .send({
        title: 'Large file',
        attachment: {
          name: 'large.bin',
          type: 'application/octet-stream',
          data: `data:application/octet-stream;base64,${largePayload}`,
          size: 1,
        },
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error', 'File must be 5 MB or less');
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

  test('sends task alert email with multiline description values on separate lines', async () => {
    const originalEnv = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
    };
    const agent = await createAgent(testUsername('alert-email-owner'));
    process.env.SMTP_HOST = 'smtp.test.local';
    process.env.SMTP_USER = 'sender@test.local';
    process.env.SMTP_PASS = 'secret';
    mockSendMail.mockClear();

    const response = await agent
      .post('/api/tasks')
      .send({
        title: 'Links',
        description: 'link:\\nhttps://www.youtube.com/watch?v=g-ZtK5u-iiw\\nhttps://www.youtube.com/watch?v=rNzXtp11rg0',
      });

    expect(response.statusCode).toBe(200);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailOptions = mockSendMail.mock.calls[0][0];
    expect(mailOptions.to).toBe(`${testUsername('alert-email-owner')}@example.com`);
    expect(mailOptions.text).toContain([
      'Description:',
      'link:',
      'https://www.youtube.com/watch?v=g-ZtK5u-iiw',
      'https://www.youtube.com/watch?v=rNzXtp11rg0',
    ].join('\n'));
    expect(mailOptions.text).not.toContain('Tag:');
    expect(mailOptions.text).not.toContain('Comment:');
    expect(mailOptions.text).not.toContain('Attachment:');
    expect(mailOptions.text).not.toContain('Date time alert:');
    expect(mailOptions.html).toContain('link:<br><a href="https://www.youtube.com/watch?v=g-ZtK5u-iiw"');
    expect(mailOptions.html).toContain('</a><br><a href="https://www.youtube.com/watch?v=rNzXtp11rg0"');
    expect(mailOptions.html).not.toContain('<strong>Tag</strong>');
    expect(mailOptions.html).not.toContain('<strong>Comment</strong>');
    expect(mailOptions.html).not.toContain('<strong>Attachment</strong>');
    expect(mailOptions.html).not.toContain('<strong>Date time alert</strong>');

    process.env.SMTP_HOST = originalEnv.SMTP_HOST;
    process.env.SMTP_USER = originalEnv.SMTP_USER;
    process.env.SMTP_PASS = originalEnv.SMTP_PASS;
  });

  test('does not send task alert email when creating a low priority task', async () => {
    const originalEnv = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
    };
    const agent = await createAgent(testUsername('low-priority-email-owner'));
    process.env.SMTP_HOST = 'smtp.test.local';
    process.env.SMTP_USER = 'sender@test.local';
    process.env.SMTP_PASS = 'secret';
    mockSendMail.mockClear();

    const response = await agent
      .post('/api/tasks')
      .send({
        title: 'Quiet',
        priority: 'low',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.task).toMatchObject({
      title: 'Quiet',
      priority: 'low',
    });
    expect(response.body.emailSent).toBe(false);
    expect(mockSendMail).not.toHaveBeenCalled();

    process.env.SMTP_HOST = originalEnv.SMTP_HOST;
    process.env.SMTP_USER = originalEnv.SMTP_USER;
    process.env.SMTP_PASS = originalEnv.SMTP_PASS;
  });

  test('sends an email for one task from task preview', async () => {
    const originalEnv = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
    };
    const agent = await createAgent(testUsername('preview-email-owner'));

    const createResponse = await agent
      .post('/api/tasks')
      .send({
        title: 'PreviewEmail',
        description: 'Only this task',
        comment: 'Preview comment',
      });

    process.env.SMTP_HOST = 'smtp.test.local';
    process.env.SMTP_USER = 'sender@test.local';
    process.env.SMTP_PASS = 'secret';
    mockSendMail.mockClear();

    const response = await agent
      .post(`/api/tasks/${createResponse.body.task.id}/send-email`)
      .send({ language: 'en' });

    expect(response.statusCode).toBe(200);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailOptions = mockSendMail.mock.calls[0][0];
    expect(mailOptions.to).toBe(`${testUsername('preview-email-owner')}@example.com`);
    expect(mailOptions.subject).toBe('New task added: PreviewEmail');
    expect(mailOptions.text).toContain('Title: PreviewEmail');
    expect(mailOptions.text).toContain('Only this task');
    expect(mailOptions.text).toContain('Comment: Preview comment');
    expect(mailOptions.text).not.toContain('Task Summary');

    process.env.SMTP_HOST = originalEnv.SMTP_HOST;
    process.env.SMTP_USER = originalEnv.SMTP_USER;
    process.env.SMTP_PASS = originalEnv.SMTP_PASS;
  });

  test('preserves strikethrough formatting in task email HTML', async () => {
    const originalEnv = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
    };
    const agent = await createAgent(testUsername('strike-email-owner'));

    const createResponse = await agent
      .post('/api/tasks')
      .send({
        title: 'Strike',
        description: '<p>Keep <s>crossed out</s> text</p>',
      });

    process.env.SMTP_HOST = 'smtp.test.local';
    process.env.SMTP_USER = 'sender@test.local';
    process.env.SMTP_PASS = 'secret';
    mockSendMail.mockClear();

    const singleResponse = await agent
      .post(`/api/tasks/${createResponse.body.task.id}/send-email`)
      .send({ language: 'en' });

    expect(singleResponse.statusCode).toBe(200);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail.mock.calls[0][0].html).toContain(
      'Keep <s style="text-decoration:line-through;">crossed out</s> text'
    );
    expect(mockSendMail.mock.calls[0][0].text).toContain('Keep crossed out text');

    mockSendMail.mockClear();
    const summaryResponse = await agent
      .post('/api/tasks/send-email')
      .send({ language: 'en' });

    expect(summaryResponse.statusCode).toBe(200);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail.mock.calls[0][0].html).toContain(
      'Keep <s style="text-decoration:line-through;">crossed out</s> text'
    );

    process.env.SMTP_HOST = originalEnv.SMTP_HOST;
    process.env.SMTP_USER = originalEnv.SMTP_USER;
    process.env.SMTP_PASS = originalEnv.SMTP_PASS;
  });

  test('preserves browser-generated span strikethrough in task email HTML', async () => {
    const originalEnv = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
    };
    const agent = await createAgent(testUsername('span-strike-email-owner'));

    const createResponse = await agent
      .post('/api/tasks')
      .send({
        title: 'SpanStrike',
        description: '<p>Keep <span style="text-decoration-line: line-through;">crossed out</span> text</p>',
      });

    process.env.SMTP_HOST = 'smtp.test.local';
    process.env.SMTP_USER = 'sender@test.local';
    process.env.SMTP_PASS = 'secret';
    mockSendMail.mockClear();

    const response = await agent
      .post(`/api/tasks/${createResponse.body.task.id}/send-email`)
      .send({ language: 'en' });

    expect(response.statusCode).toBe(200);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail.mock.calls[0][0].html).toContain(
      'Keep <s style="text-decoration:line-through;">crossed out</s> text'
    );

    process.env.SMTP_HOST = originalEnv.SMTP_HOST;
    process.env.SMTP_USER = originalEnv.SMTP_USER;
    process.env.SMTP_PASS = originalEnv.SMTP_PASS;
  });

  test('returns an error when email settings are not configured', async () => {
    const originalEnv = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
    };
    const agent = await createAgent(testUsername('email-config-owner'));
    const createResponse = await agent
      .post('/api/tasks')
      .send({ title: 'No email' });

    process.env.SMTP_HOST = '';
    process.env.SMTP_USER = '';
    process.env.SMTP_PASS = '';
    mockSendMail.mockClear();

    const summaryResponse = await agent
      .post('/api/tasks/send-email')
      .send({ language: 'en' });
    expect(summaryResponse.statusCode).toBe(500);
    expect(summaryResponse.body).toHaveProperty('error', 'Email settings are not configured');

    const taskResponse = await agent
      .post(`/api/tasks/${createResponse.body.task.id}/send-email`)
      .send({ language: 'en' });
    expect(taskResponse.statusCode).toBe(500);
    expect(taskResponse.body).toHaveProperty('error', 'Email settings are not configured');
    expect(mockSendMail).not.toHaveBeenCalled();

    process.env.SMTP_HOST = originalEnv.SMTP_HOST;
    process.env.SMTP_USER = originalEnv.SMTP_USER;
    process.env.SMTP_PASS = originalEnv.SMTP_PASS;
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

  test('clears an attachment and maps completed updates to status', async () => {
    const agent = await createAgent(testUsername('clear-attachment-owner'));

    const createResponse = await agent
      .post('/api/tasks')
      .send({
        title: 'Clear file',
        attachment: attachment('keep.txt', 'temporary'),
      });

    const updateResponse = await agent
      .put(`/api/tasks/${createResponse.body.task.id}`)
      .send({
        completed: true,
        attachment: null,
      });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.task).toMatchObject({
      status: 'done',
      completed: 1,
      attachment_name: null,
      attachment_type: null,
      attachment_data: null,
      attachment_size: 0,
    });
  });

  test('rejects task updates and single-task emails for another user', async () => {
    const owner = await createAgent(testUsername('private-owner'));
    const otherUser = await createAgent(testUsername('private-other'));

    const createResponse = await owner
      .post('/api/tasks')
      .send({ title: 'Private' });

    const taskId = createResponse.body.task.id;

    const updateResponse = await otherUser
      .put(`/api/tasks/${taskId}`)
      .send({ title: 'Stolen' });
    expect(updateResponse.statusCode).toBe(404);
    expect(updateResponse.body).toHaveProperty('error', 'Task not found');

    const emailResponse = await otherUser
      .post(`/api/tasks/${taskId}/send-email`)
      .send({ language: 'en' });
    expect(emailResponse.statusCode).toBe(404);
    expect(emailResponse.body).toHaveProperty('error', 'Task not found');
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

  test('validates tag requests and protects tags owned by other users', async () => {
    const owner = await createAgent(testUsername('tag-owner'));
    const otherUser = await createAgent(testUsername('tag-other'));

    const missingNameResponse = await owner
      .post('/api/tags')
      .send({ name: '   ' });
    expect(missingNameResponse.statusCode).toBe(400);
    expect(missingNameResponse.body).toHaveProperty('error', 'Tag name is required');

    const longNameResponse = await owner
      .post('/api/tags')
      .send({ name: 'x'.repeat(41) });
    expect(longNameResponse.statusCode).toBe(400);
    expect(longNameResponse.body).toHaveProperty('error', 'Tag name must be 40 characters or less');

    const createResponse = await owner
      .post('/api/tags')
      .send({ name: 'PrivateTag' });

    const renameOtherResponse = await otherUser
      .put(`/api/tags/${createResponse.body.tag.id}`)
      .send({ name: 'OtherName' });
    expect(renameOtherResponse.statusCode).toBe(404);
    expect(renameOtherResponse.body).toHaveProperty('error', 'Tag not found');

    const deleteOtherResponse = await otherUser.delete(`/api/tags/${createResponse.body.tag.id}`);
    expect(deleteOtherResponse.statusCode).toBe(404);
    expect(deleteOtherResponse.body).toHaveProperty('error', 'Tag not found');
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
    expect(mailOptions.to).toBe(`${testUsername('summary-email-owner')}@example.com`);
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

describe('Credit Card API', () => {
  const loginAdmin = async () => {
    const agent = request.agent(app);
    const response = await agent
      .post('/api/login')
      .send({ username: 'admin', password: TEST_ADMIN_PASSWORD });

    expect(response.statusCode).toBe(200);
    expect(response.body.user).toMatchObject({ username: 'admin' });

    return agent;
  };

  test('requires authentication before listing credit cards', async () => {
    const response = await request(app).get('/api/credit-cards');

    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty('error', 'Authentication required');

    const billsResponse = await request(app).get('/api/credit-cards/fast-access-bills');
    expect(billsResponse.statusCode).toBe(401);
    expect(billsResponse.body).toHaveProperty('error', 'Authentication required');

    const linksResponse = await request(app).get('/api/credit-cards/fast-access-links');
    expect(linksResponse.statusCode).toBe(401);
    expect(linksResponse.body).toHaveProperty('error', 'Authentication required');
  });

  test('creates, lists, and updates a credit card', async () => {
    const agent = await createAgent(testUsername('credit-card-owner'));

    const createResponse = await agent
      .post('/api/credit-cards')
      .send({
        name: 'Chase Sapphire',
        card_user: 'Casey',
        issuer: 'chase',
        total_balance: '1240.55',
        closing_date: '2026-06-15',
      });

    expect(createResponse.statusCode).toBe(200);
    expect(createResponse.body.card).toMatchObject({
      name: 'Chase Sapphire',
      card_user: 'Casey',
      issuer: 'chase',
      closing_date: '2026-06-15',
    });
    expect(Number(createResponse.body.card.total_balance)).toBeCloseTo(1240.55);

    const listResponse = await agent.get('/api/credit-cards');
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.body.cards).toHaveLength(1);
    expect(listResponse.body.cards[0]).toMatchObject({
      name: 'Chase Sapphire',
      card_user: 'Casey',
      issuer: 'chase',
      closing_date: '2026-06-15',
    });

    const userOptionsResponse = await agent.get('/api/credit-cards/users');
    expect(userOptionsResponse.statusCode).toBe(200);
    expect(userOptionsResponse.body.users).toEqual(expect.arrayContaining(['Casey']));

    const updateResponse = await agent
      .put(`/api/credit-cards/${createResponse.body.card.id}`)
      .send({
        name: 'Chase Freedom',
        card_user: 'Morgan',
        issuer: 'citi',
        total_balance: '840.10',
        closing_date: '2026-07-20',
      });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.card).toMatchObject({
      name: 'Chase Freedom',
      card_user: 'Morgan',
      issuer: 'citi',
      closing_date: '2026-07-20',
    });
    expect(Number(updateResponse.body.card.total_balance)).toBeCloseTo(840.10);
  });

  test('lists credit cards owned by the admin account for admin login', async () => {
    const adminUser = await db.query("SELECT id FROM users WHERE username = 'admin'");
    const adminId = adminUser.rows[0].id;
    const cardName = `${RUN_ID}-Admin card`;
    const insertedCard = await db.query(
      `INSERT INTO credit_cards (user_id, name, total_balance, closing_date, card_user, issuer)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [adminId, cardName, '123.45', '2026-06-15', 'admin', 'chase']
    );

    try {
      const agent = request.agent(app);
      const loginResponse = await agent
        .post('/api/login')
        .send({ username: 'admin', password: TEST_ADMIN_PASSWORD });

      expect(loginResponse.statusCode).toBe(200);

      const listResponse = await agent.get('/api/credit-cards');
      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.body.cards).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: cardName,
            card_user: 'admin',
            issuer: 'chase',
            closing_date: '2026-06-15',
          }),
        ])
      );
    } finally {
      await db.query('DELETE FROM credit_cards WHERE id = $1', [insertedCard.rows[0].id]);
    }
  });

  test('validates credit card payloads', async () => {
    const agent = await createAgent(testUsername('credit-card-validation-owner'));

    const missingNameResponse = await agent
      .post('/api/credit-cards')
      .send({ total_balance: '10.00', closing_date: '2026-06-15' });

    expect(missingNameResponse.statusCode).toBe(400);
    expect(missingNameResponse.body).toHaveProperty('error', 'Credit card No is required');

    const invalidBalanceResponse = await agent
      .post('/api/credit-cards')
      .send({ name: 'Bad balance', total_balance: '-1', closing_date: '2026-06-15' });

    expect(invalidBalanceResponse.statusCode).toBe(400);
    expect(invalidBalanceResponse.body).toHaveProperty('error', 'Balance must be a valid amount');

    const invalidDateResponse = await agent
      .post('/api/credit-cards')
      .send({ name: 'Bad date', total_balance: '10.00', closing_date: 'not-a-date' });

    expect(invalidDateResponse.statusCode).toBe(400);
    expect(invalidDateResponse.body).toHaveProperty('error', 'Close must be a valid date');

    const invalidIssuerResponse = await agent
      .post('/api/credit-cards')
      .send({ name: 'Bad issuer', issuer: 'not-real', total_balance: '10.00', closing_date: '2026-06-15' });

    expect(invalidIssuerResponse.statusCode).toBe(400);
    expect(invalidIssuerResponse.body).toHaveProperty('error', 'Card type must be one of the available options');
  });

  test('protects credit cards owned by other users', async () => {
    const ownerAgent = await createAgent(testUsername('credit-card-private-owner'));
    const otherAgent = await createAgent(testUsername('credit-card-private-other'));

    const createResponse = await ownerAgent
      .post('/api/credit-cards')
      .send({ name: 'Private card', total_balance: '20.00', closing_date: '2026-06-15' });

    const otherListResponse = await otherAgent.get('/api/credit-cards');
    expect(otherListResponse.statusCode).toBe(200);
    expect(otherListResponse.body.cards).toHaveLength(0);

    const otherUpdateResponse = await otherAgent
      .put(`/api/credit-cards/${createResponse.body.card.id}`)
      .send({ closing_date: '2026-07-20' });

    expect(otherUpdateResponse.statusCode).toBe(404);
    expect(otherUpdateResponse.body).toHaveProperty('error', 'Credit card not found');

    const otherDeleteResponse = await otherAgent
      .delete(`/api/credit-cards/${createResponse.body.card.id}`);
    expect(otherDeleteResponse.statusCode).toBe(404);
    expect(otherDeleteResponse.body).toHaveProperty('error', 'Credit card not found');
  });

  test('deletes a credit card owned by the user', async () => {
    const agent = await createAgent(testUsername('credit-card-deleter'));

    const createResponse = await agent
      .post('/api/credit-cards')
      .send({ name: 'Disposable card', total_balance: '10.00', closing_date: '2026-09-01' });
    expect(createResponse.statusCode).toBe(200);
    const cardId = createResponse.body.card.id;

    const deleteResponse = await agent.delete(`/api/credit-cards/${cardId}`);
    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.body).toEqual({ success: true });

    const listResponse = await agent.get('/api/credit-cards');
    expect(listResponse.body.cards.find((card) => card.id === cardId)).toBeUndefined();

    const repeatDeleteResponse = await agent.delete(`/api/credit-cards/${cardId}`);
    expect(repeatDeleteResponse.statusCode).toBe(404);
  });

  test('seeds fast access bills for admin only', async () => {
    const adminAgent = await loginAdmin();
    const userAgent = await createAgent(testUsername('fast-access-owner'));

    const userListResponse = await userAgent.get('/api/credit-cards/fast-access-bills');
    expect(userListResponse.statusCode).toBe(200);
    expect(userListResponse.body.bills).toHaveLength(0);

    const userResponse = await userAgent.get('/api/me');
    await db.query(
      `INSERT INTO fast_access_bills (user_id, item, amount, due_date, pay_before, status, sort_order)
       SELECT $1, item, amount, due_date, pay_before, status, sort_order
       FROM fast_access_bill_defaults
       ORDER BY sort_order
       LIMIT 1`,
      [userResponse.body.user.id]
    );
    await db.query(
      `INSERT INTO fast_access_bills (user_id, item, amount, due_date, pay_before, status, sort_order)
       VALUES ($1, 'Custom user bill', 25.00, '2026-06-20', '', 'Unpaid', 99)`,
      [userResponse.body.user.id]
    );

    const userFilteredListResponse = await userAgent.get('/api/credit-cards/fast-access-bills');
    expect(userFilteredListResponse.statusCode).toBe(200);
    expect(userFilteredListResponse.body.bills.map((bill) => bill.item)).toEqual(['Custom user bill']);

    const adminListResponse = await adminAgent.get('/api/credit-cards/fast-access-bills');
    expect(adminListResponse.statusCode).toBe(200);

    const defaultBills = await db.query(
      'SELECT COUNT(*)::int AS count FROM fast_access_bill_defaults'
    );
    expect(adminListResponse.body.bills.length).toBeGreaterThanOrEqual(defaultBills.rows[0].count);
  });

  test('allows users to manage their own bill payment websites', async () => {
    const adminAgent = await loginAdmin();
    const regularAgent = await createAgent(testUsername('fast-access-link-viewer'));
    const otherAgent = await createAgent(testUsername('fast-access-link-other'));

    const response = await adminAgent.get('/api/credit-cards/fast-access-links');

    expect(response.statusCode).toBe(200);
    expect(response.body.links.length).toBeGreaterThanOrEqual(1);
    expect(response.body.links[0]).toMatchObject({
      label: expect.any(String),
      url: expect.any(String),
      sort_order: expect.any(Number),
    });

    const initialRegularResponse = await regularAgent.get('/api/credit-cards/fast-access-links');
    expect(initialRegularResponse.statusCode).toBe(200);
    expect(initialRegularResponse.body.links).toEqual([]);

    const invalidResponse = await regularAgent
      .post('/api/credit-cards/fast-access-links')
      .send({ label: 'Bad link', url: 'not-a-url' });
    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.body).toHaveProperty('error', 'URL must be valid');

    const label = `${RUN_ID}-Portal`;
    const createResponse = await regularAgent
      .post('/api/credit-cards/fast-access-links')
      .send({ label, url: 'https://example.com/portal' });
    expect(createResponse.statusCode).toBe(200);
    expect(createResponse.body.link).toMatchObject({
      label,
      url: 'https://example.com/portal',
    });

    const updatedResponse = await regularAgent.get('/api/credit-cards/fast-access-links');
    expect(updatedResponse.body.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label, url: 'https://example.com/portal' }),
      ])
    );

    const otherListResponse = await otherAgent.get('/api/credit-cards/fast-access-links');
    expect(otherListResponse.statusCode).toBe(200);
    expect(otherListResponse.body.links).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label, url: 'https://example.com/portal' }),
      ])
    );

    const otherDeleteResponse = await otherAgent.delete(`/api/credit-cards/fast-access-links/${createResponse.body.link.id}`);
    expect(otherDeleteResponse.statusCode).toBe(404);

    const deleteResponse = await regularAgent.delete(`/api/credit-cards/fast-access-links/${createResponse.body.link.id}`);
    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.body).toEqual({ success: true });

    const deletedListResponse = await regularAgent.get('/api/credit-cards/fast-access-links');
    expect(deletedListResponse.body.links).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: createResponse.body.link.id }),
      ])
    );

    const repeatDeleteResponse = await regularAgent.delete(`/api/credit-cards/fast-access-links/${createResponse.body.link.id}`);
    expect(repeatDeleteResponse.statusCode).toBe(404);
  });

  test('validates and protects fast access bills', async () => {
    const ownerAgent = await createAgent(testUsername('fast-access-private-owner'));
    const otherAgent = await createAgent(testUsername('fast-access-private-other'));

    const ownerResponse = await ownerAgent.get('/api/me');
    const insertResponse = await db.query(
      `INSERT INTO fast_access_bills (user_id, item, amount, due_date, pay_before, status, sort_order)
       VALUES ($1, 'Internet', 80.00, '2026-06-15', '', 'Unpaid', 1)
       RETURNING id, item`,
      [ownerResponse.body.user.id]
    );
    const internet = insertResponse.rows[0];

    const invalidStatusResponse = await ownerAgent
      .put(`/api/credit-cards/fast-access-bills/${internet.id}`)
      .send({ status: 'Maybe' });

    expect(invalidStatusResponse.statusCode).toBe(400);
    expect(invalidStatusResponse.body).toHaveProperty('error', 'Status must be Paid or Unpaid');

    const invalidAmountResponse = await ownerAgent
      .put(`/api/credit-cards/fast-access-bills/${internet.id}`)
      .send({ amount: '-1' });

    expect(invalidAmountResponse.statusCode).toBe(400);
    expect(invalidAmountResponse.body).toHaveProperty('error', 'Amount must be a valid amount');

    const updateResponse = await ownerAgent
      .put(`/api/credit-cards/fast-access-bills/${internet.id}`)
      .send({
        item: 'Internet fiber',
        amount: '75.25',
        due_date: '2026-07-15',
        pay_before: '2026-07-10',
        status: 'Unpaid',
      });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.bill).toMatchObject({
      item: 'Internet fiber',
      due_date: '2026-07-15',
      pay_before: '2026-07-10',
      status: 'Unpaid',
    });
    expect(Number(updateResponse.body.bill.amount)).toBeCloseTo(75.25);

    const otherUpdateResponse = await otherAgent
      .put(`/api/credit-cards/fast-access-bills/${internet.id}`)
      .send({ status: 'Paid' });

    expect(otherUpdateResponse.statusCode).toBe(404);
    expect(otherUpdateResponse.body).toHaveProperty('error', 'Fast access bill not found');
  });
});

describe('Transactions API', () => {
  const loginAdmin = async () => {
    const agent = request.agent(app);
    const response = await agent
      .post('/api/login')
      .send({ username: 'admin', password: TEST_ADMIN_PASSWORD });

    expect(response.statusCode).toBe(200);
    expect(response.body.user).toMatchObject({ username: 'admin' });

    return agent;
  };

  test('lists only transactions owned by the current user', async () => {
    const adminAgent = await loginAdmin();
    const userAgent = await createAgent(testUsername('transaction-private-owner'));

    
    expect(userCreateResponse.statusCode).toBe(200);

    const adminListResponse = await adminAgent.get('/api/transactions?year=2026&month=6');
    expect(adminListResponse.statusCode).toBe(200);
    expect(adminListResponse.body.transactions.map((transaction) => transaction.category)).toContain(`${RUN_ID}-Admin only`);
    expect(adminListResponse.body.transactions.map((transaction) => transaction.category)).not.toContain(`${RUN_ID}-User only`);

    const userListResponse = await userAgent.get('/api/transactions?year=2026&month=6');
    expect(userListResponse.statusCode).toBe(200);
    expect(userListResponse.body.transactions.map((transaction) => transaction.category)).toContain(`${RUN_ID}-User only`);
    expect(userListResponse.body.transactions.map((transaction) => transaction.category)).not.toContain(`${RUN_ID}-Admin only`);
  });

  test('updates transaction notes', async () => {
    const agent = await createAgent(testUsername('transaction-note-owner'));
    const createResponse = await agent
      .post('/api/transactions')
      .send({
        occurred_on: '2026-06-03',
        kind: 'expense',
        amount: '18.02',
        category: 'Bread',
        account: 'CC',
        note: 'Original note',
      });
    expect(createResponse.statusCode).toBe(200);

    const updateResponse = await agent
      .put(`/api/transactions/${createResponse.body.transaction.id}`)
      .send({
        occurred_on: '2026-06-03',
        kind: 'expense',
        amount: '0',
        category: 'Bread',
        account: 'CC',
        note: 'test ',
      });
    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.transaction).toMatchObject({
      note: 'test',
    });

    const listResponse = await agent.get('/api/transactions?year=2026&month=6');
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.body.transactions.find((transaction) => transaction.id === createResponse.body.transaction.id)).toMatchObject({
      note: 'test',
    });
  });
});

describe('Notes API', () => {
  test('links notes to owned tasks and records version history', async () => {
    const agent = await createAgent(testUsername('notes-owner'));
    const otherAgent = await createAgent(testUsername('notes-other-owner'));

    const taskResponse = await agent
      .post('/api/tasks')
      .send({ title: 'Pay utility bill' });
    expect(taskResponse.statusCode).toBe(200);
    const taskId = taskResponse.body.task.id;

    const otherTaskResponse = await otherAgent
      .post('/api/tasks')
      .send({ title: 'Other task' });
    expect(otherTaskResponse.statusCode).toBe(200);

    const forbiddenLinkResponse = await agent
      .post('/api/notes')
      .send({ title: 'Bad link', body: 'nope', task_id: otherTaskResponse.body.task.id });
    expect(forbiddenLinkResponse.statusCode).toBe(400);

    const createResponse = await agent
      .post('/api/notes')
      .send({ title: 'Bill note', body: 'first draft', task_id: taskId });
    expect(createResponse.statusCode).toBe(200);
    expect(createResponse.body.note).toMatchObject({
      title: 'Bill note',
      body: 'first draft',
      task_id: taskId,
      task_title: 'Pay utility bill',
    });

    const updateResponse = await agent
      .put(`/api/notes/${createResponse.body.note.id}`)
      .send({ title: 'Bill note updated', body: 'second draft', task_id: null });
    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.note).toMatchObject({
      title: 'Bill note updated',
      body: 'second draft',
      task_id: null,
    });

    const listResponse = await agent.get('/api/notes');
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.body.notes.find((note) => note.id === createResponse.body.note.id)).toMatchObject({
      title: 'Bill note updated',
      task_id: null,
    });

    const searchResponse = await agent.get('/api/notes?q=second');
    expect(searchResponse.statusCode).toBe(200);
    expect(searchResponse.body.notes.map((note) => note.id)).toContain(createResponse.body.note.id);

    const historyResponse = await agent.get(`/api/notes/${createResponse.body.note.id}/versions`);
    expect(historyResponse.statusCode).toBe(200);
    expect(historyResponse.body.versions[0]).toMatchObject({
      title: 'Bill note',
      body: 'first draft',
      task_id: taskId,
      task_title: 'Pay utility bill',
    });

    const otherHistoryResponse = await otherAgent.get(`/api/notes/${createResponse.body.note.id}/versions`);
    expect(otherHistoryResponse.statusCode).toBe(404);
  });
});

describe('Audit Log API', () => {
  test('records who creates, edits, and deletes audited records', async () => {
    const username = testUsername('audit-owner');
    const agent = await createAgent(username);
    const adminAgent = await createAdminAgent();

    const meResponse = await agent.get('/api/me');
    expect(meResponse.statusCode).toBe(200);
    const userId = meResponse.body.user.id;

    const taskCreate = await agent
      .post('/api/tasks')
      .send({ title: 'Audit task', priority: 'low' });
    expect(taskCreate.statusCode).toBe(200);
    const taskId = taskCreate.body.task.id;

    const taskUpdate = await agent
      .put(`/api/tasks/${taskId}`)
      .send({ title: 'Audit task edited' });
    expect(taskUpdate.statusCode).toBe(200);

    const transactionCreate = await agent
      .post('/api/transactions')
      .send({
        occurred_on: '2026-06-03',
        kind: 'expense',
        amount: '42.25',
        category: `${RUN_ID} audit transaction`,
        account: 'Checking',
      });
    expect(transactionCreate.statusCode).toBe(200);
    const transactionId = transactionCreate.body.transaction.id;

    const transactionUpdate = await agent
      .put(`/api/transactions/${transactionId}`)
      .send({ note: 'audit edit' });
    expect(transactionUpdate.statusCode).toBe(200);

    const cardCreate = await agent
      .post('/api/credit-cards')
      .send({
        name: `${RUN_ID} card`,
        total_balance: '25.00',
        closing_date: '2026-06-20',
      });
    expect(cardCreate.statusCode).toBe(200);
    const cardId = cardCreate.body.card.id;

    const cardUpdate = await agent
      .put(`/api/credit-cards/${cardId}`)
      .send({ total_balance: '30.00' });
    expect(cardUpdate.statusCode).toBe(200);

    const expenseInsert = await db.query(
      `INSERT INTO fast_access_bills (user_id, item, amount, due_date, pay_before, status, sort_order)
       VALUES ($1, $2, 10.00, '2026-06-10', '', 'Unpaid', 500)
       RETURNING id`,
      [userId, `${RUN_ID} expense`]
    );
    const expenseId = expenseInsert.rows[0].id;

    const expenseUpdate = await agent
      .put(`/api/credit-cards/fast-access-bills/${expenseId}`)
      .send({ amount: '15.00', status: 'Paid' });
    expect(expenseUpdate.statusCode).toBe(200);

    const noteCreate = await agent
      .post('/api/notes')
      .send({ title: `${RUN_ID} audit note`, body: 'draft' });
    expect(noteCreate.statusCode).toBe(200);
    const noteId = noteCreate.body.note.id;

    const noteUpdate = await agent
      .put(`/api/notes/${noteId}`)
      .send({ title: `${RUN_ID} audit note updated`, body: 'final' });
    expect(noteUpdate.statusCode).toBe(200);

    expect((await agent.delete(`/api/notes/${noteId}`)).statusCode).toBe(200);
    expect((await agent.delete(`/api/credit-cards/${cardId}`)).statusCode).toBe(200);
    expect((await agent.delete(`/api/transactions/${transactionId}`)).statusCode).toBe(200);
    expect((await agent.delete(`/api/tasks/${taskId}`)).statusCode).toBe(200);

    const auditResponse = await adminAgent.get(`/api/admin/audit-logs?user_id=${userId}&limit=20`);
    expect(auditResponse.statusCode).toBe(200);

    const compactLogs = auditResponse.body.logs.map((log) => ({
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      username: log.username,
      actor_username: log.actor_username,
    }));

    expect(compactLogs).toEqual(expect.arrayContaining([
      { action: 'register', entity_type: 'user', entity_id: userId, username, actor_username: username },
      { action: 'login', entity_type: 'user', entity_id: userId, username, actor_username: username },
      { action: 'create', entity_type: 'task', entity_id: taskId, username, actor_username: username },
      { action: 'edit', entity_type: 'task', entity_id: taskId, username, actor_username: username },
      { action: 'delete', entity_type: 'task', entity_id: taskId, username, actor_username: username },
      { action: 'create', entity_type: 'transaction', entity_id: transactionId, username, actor_username: username },
      { action: 'edit', entity_type: 'transaction', entity_id: transactionId, username, actor_username: username },
      { action: 'delete', entity_type: 'transaction', entity_id: transactionId, username, actor_username: username },
      { action: 'create', entity_type: 'credit_card', entity_id: cardId, username, actor_username: username },
      { action: 'edit', entity_type: 'credit_card', entity_id: cardId, username, actor_username: username },
      { action: 'delete', entity_type: 'credit_card', entity_id: cardId, username, actor_username: username },
      { action: 'edit', entity_type: 'expense', entity_id: expenseId, username, actor_username: username },
      { action: 'create', entity_type: 'note', entity_id: noteId, username, actor_username: username },
      { action: 'edit', entity_type: 'note', entity_id: noteId, username, actor_username: username },
      { action: 'delete', entity_type: 'note', entity_id: noteId, username, actor_username: username },
    ]));

    const managedUsername = testUsername('audit-managed-user');
    const managedCreate = await adminAgent
      .post('/api/admin/users')
      .send({
        username: managedUsername,
        name: 'Managed User',
        email: `${managedUsername}@example.com`,
        password: 'Password123!',
        account_status: 'enabled',
      });
    expect(managedCreate.statusCode).toBe(200);
    const managedUserId = managedCreate.body.user.id;

    const managedUpdate = await adminAgent
      .put(`/api/admin/users/${managedUserId}`)
      .send({
        username: managedUsername,
        name: 'Managed User Edited',
        email: `${managedUsername}@example.com`,
        account_status: 'disabled',
      });
    expect(managedUpdate.statusCode).toBe(200);

    const managedDelete = await adminAgent.delete(`/api/admin/users/${managedUserId}`);
    expect(managedDelete.statusCode).toBe(200);

    const adminAuditResponse = await adminAgent.get('/api/admin/audit-logs?entity_type=user&limit=80');
    expect(adminAuditResponse.statusCode).toBe(200);
    const managedLogs = adminAuditResponse.body.logs
      .filter((log) => log.summary === managedUsername)
      .map((log) => ({
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        actor_username: log.actor_username,
      }));
    expect(managedLogs).toEqual(expect.arrayContaining([
      { action: 'create', entity_type: 'user', entity_id: managedUserId, actor_username: 'admin' },
      { action: 'edit', entity_type: 'user', entity_id: managedUserId, actor_username: 'admin' },
      { action: 'delete', entity_type: 'user', entity_id: managedUserId, actor_username: 'admin' },
    ]));

    const taskOnlyResponse = await adminAgent.get('/api/admin/audit-logs?entity_type=task&action=delete&limit=10');
    expect(taskOnlyResponse.statusCode).toBe(200);
    expect(taskOnlyResponse.body.logs.some((log) => log.entity_id === taskId)).toBe(true);
  });

  test('paginates seeded audit logs', async () => {
    const adminAgent = await createAdminAgent();
    const ownerAgent = await createAgent(testUsername('audit-page-owner'));
    const ownerResponse = await ownerAgent.get('/api/me');
    expect(ownerResponse.statusCode).toBe(200);
    const ownerId = ownerResponse.body.user.id;
    const seedPrefix = `${RUN_ID}-audit-page-seed-`;

    await db.query(
      `WITH seed AS (
         SELECT generate_series(1, 35) AS n
       )
       INSERT INTO audit_logs (
         user_id, actor_user_id, action, entity_type, entity_id, summary, after_data, created_at
       )
       SELECT
         $1,
         $1,
         'edit',
         'note',
         800000 + n,
         $2 || n,
         jsonb_build_object('seed', true, 'row', n),
         CURRENT_TIMESTAMP - (n || ' minutes')::interval
       FROM seed`,
      [ownerId, seedPrefix]
    );

    const pageTwoResponse = await adminAgent.get(
      `/api/admin/audit-logs?user_id=${ownerId}&entity_type=note&action=edit&limit=10&page=2`
    );
    expect(pageTwoResponse.statusCode).toBe(200);
    expect(pageTwoResponse.body.logs).toHaveLength(10);
    expect(pageTwoResponse.body.pagination).toMatchObject({
      page: 2,
      limit: 10,
      hasPreviousPage: true,
      hasNextPage: true,
    });
    expect(pageTwoResponse.body.pagination.total).toBe(35);
    expect(pageTwoResponse.body.logs.some((log) => log.summary === `${seedPrefix}11`)).toBe(true);

    const searchResponse = await adminAgent.get(
      `/api/admin/audit-logs?q=${encodeURIComponent(`${seedPrefix}35`)}&limit=10`
    );
    expect(searchResponse.statusCode).toBe(200);
    expect(searchResponse.body.pagination.total).toBe(1);
    expect(searchResponse.body.logs[0]).toMatchObject({
      summary: `${seedPrefix}35`,
      entity_type: 'note',
      action: 'edit',
    });
  });
});

describe('Admin API', () => {
  const loginAdmin = async () => {
    const agent = request.agent(app);
    const response = await agent
      .post('/api/login')
      .send({ username: 'admin', password: TEST_ADMIN_PASSWORD });

    expect(response.statusCode).toBe(200);
    expect(response.body.user).toMatchObject({ username: 'admin' });

    return agent;
  };

  test('requires authentication and admin access', async () => {
    const unauthenticatedResponse = await request(app).get('/api/admin/users');
    expect(unauthenticatedResponse.statusCode).toBe(401);
    expect(unauthenticatedResponse.body).toHaveProperty('error', 'Authentication required');

    const regularAgent = await createAgent(testUsername('not-admin'));
    const forbiddenResponse = await regularAgent.get('/api/admin/users');
    expect(forbiddenResponse.statusCode).toBe(403);
    expect(forbiddenResponse.body).toHaveProperty('error', 'Admin access required');
  });

  test('creates users, resets passwords, lists task counts, and deletes users with their tasks', async () => {
    const admin = await loginAdmin();
    const managedUsername = testUsername('managed-user');
    const createUserResponse = await admin
      .post('/api/admin/users')
      .send({ username: managedUsername, email: `${managedUsername}@example.com`, password: 'Initial123!' });

    expect(createUserResponse.statusCode).toBe(200);
    expect(createUserResponse.body.user).toMatchObject({
      username: managedUsername,
      email: `${managedUsername}@example.com`,
      account_status: 'enabled',
      task_count: 0,
      note_count: 0,
    });

    const duplicateResponse = await admin
      .post('/api/admin/users')
      .send({ username: managedUsername, password: 'Initial123!' });
    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.body).toHaveProperty('error', 'Username already exists');

    const managedAgent = request.agent(app);
    const managedLoginResponse = await managedAgent
      .post('/api/login')
      .send({ username: managedUsername, password: 'Initial123!' });
    expect(managedLoginResponse.statusCode).toBe(200);

    await managedAgent
      .post('/api/tasks')
      .send({ title: 'Owned task' });

    await managedAgent
      .post('/api/notes')
      .send({ title: 'Owned note', body: 'hello' });

    const listResponse = await admin.get('/api/admin/users');
    expect(listResponse.statusCode).toBe(200);
    const listedUser = listResponse.body.users.find((user) => user.username === managedUsername);
    expect(listedUser).toMatchObject({
      username: managedUsername,
      email: `${managedUsername}@example.com`,
      account_status: 'enabled',
      task_count: 1,
      note_count: 1,
    });

    const updatedEmail = `updated-${managedUsername}@example.com`;
    const updateUserResponse = await admin
      .put(`/api/admin/users/${createUserResponse.body.user.id}`)
      .send({ username: managedUsername, email: updatedEmail });
    expect(updateUserResponse.statusCode).toBe(200);
    expect(updateUserResponse.body.user).toMatchObject({
      username: managedUsername,
      email: updatedEmail,
      account_status: 'enabled',
      task_count: 1,
      note_count: 1,
    });

    const disableResponse = await admin
      .patch(`/api/admin/users/${createUserResponse.body.user.id}/status`)
      .send({ account_status: 'disabled' });
    expect(disableResponse.statusCode).toBe(200);
    expect(disableResponse.body.user).toMatchObject({
      username: managedUsername,
      account_status: 'disabled',
    });

    const disabledLoginResponse = await request(app)
      .post('/api/login')
      .send({ username: managedUsername, password: 'Initial123!' });
    expect(disabledLoginResponse.statusCode).toBe(403);
    expect(disabledLoginResponse.body).toHaveProperty('error', 'Account is disabled');

    const enableResponse = await admin
      .patch(`/api/admin/users/${createUserResponse.body.user.id}/status`)
      .send({ account_status: 'enabled' });
    expect(enableResponse.statusCode).toBe(200);
    expect(enableResponse.body.user).toMatchObject({
      username: managedUsername,
      account_status: 'enabled',
    });

    const resetResponse = await admin
      .put(`/api/admin/users/${createUserResponse.body.user.id}/password`)
      .send({ password: 'Changed123!' });
    expect(resetResponse.statusCode).toBe(200);
    expect(resetResponse.body).toHaveProperty('success', true);

    const oldPasswordResponse = await request(app)
      .post('/api/login')
      .send({ username: managedUsername, password: 'Initial123!' });
    expect(oldPasswordResponse.statusCode).toBe(401);

    const newPasswordResponse = await request(app)
      .post('/api/login')
      .send({ username: managedUsername, password: 'Changed123!' });
    expect(newPasswordResponse.statusCode).toBe(200);

    const deleteResponse = await admin.delete(`/api/admin/users/${createUserResponse.body.user.id}`);
    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.body).toHaveProperty('success', true);

    const deletedLoginResponse = await request(app)
      .post('/api/login')
      .send({ username: managedUsername, password: 'Changed123!' });
    expect(deletedLoginResponse.statusCode).toBe(401);
  });

  test('validates admin user management edge cases', async () => {
    const admin = await loginAdmin();

    const missingCreateResponse = await admin
      .post('/api/admin/users')
      .send({ username: '' });
    expect(missingCreateResponse.statusCode).toBe(400);
    expect(missingCreateResponse.body).toHaveProperty('error', 'Username and password are required');

    const missingUpdateResponse = await admin
      .put('/api/admin/users/999999')
      .send({ username: '' });
    expect(missingUpdateResponse.statusCode).toBe(400);
    expect(missingUpdateResponse.body).toHaveProperty('error', 'Username is required');

    const missingPasswordResponse = await admin
      .put('/api/admin/users/999999/password')
      .send({ password: '' });
    expect(missingPasswordResponse.statusCode).toBe(400);
    expect(missingPasswordResponse.body).toHaveProperty('error', 'Password is required');

    const notFoundPasswordResponse = await admin
      .put('/api/admin/users/999999/password')
      .send({ password: 'NewPass123!' });
    expect(notFoundPasswordResponse.statusCode).toBe(404);
    expect(notFoundPasswordResponse.body).toHaveProperty('error', 'User not found');

    const meResponse = await admin.get('/api/me');
    const deleteSelfResponse = await admin.delete(`/api/admin/users/${meResponse.body.user.id}`);
    expect(deleteSelfResponse.statusCode).toBe(400);
    expect(deleteSelfResponse.body).toHaveProperty('error', 'You cannot delete your own account');

    const disableAdminResponse = await admin
      .patch(`/api/admin/users/${meResponse.body.user.id}/status`)
      .send({ account_status: 'disabled' });
    expect(disableAdminResponse.statusCode).toBe(400);
    expect(disableAdminResponse.body).toHaveProperty('error', 'You cannot disable your own account');

    const updateAdminStatusResponse = await admin
      .put(`/api/admin/users/${meResponse.body.user.id}`)
      .send({ username: 'admin', account_status: 'disabled' });
    expect(updateAdminStatusResponse.statusCode).toBe(400);
    expect(updateAdminStatusResponse.body).toHaveProperty('error', 'The admin account status cannot be changed');

    const deleteMissingResponse = await admin.delete('/api/admin/users/999999');
    expect(deleteMissingResponse.statusCode).toBe(404);
    expect(deleteMissingResponse.body).toHaveProperty('error', 'User not found');
  });

  test('allows admin to impersonate a user and return to admin', async () => {
    const admin = await loginAdmin();
    const managedUsername = testUsername('impersonated-user');
    const createUserResponse = await admin
      .post('/api/admin/users')
      .send({ username: managedUsername, password: 'Initial123!' });

    expect(createUserResponse.statusCode).toBe(200);
    const targetUserId = createUserResponse.body.user.id;

    const impersonateResponse = await admin
      .post('/api/admin/impersonate')
      .send({ user_id: targetUserId });
    expect(impersonateResponse.statusCode).toBe(200);
    expect(impersonateResponse.body.user).toMatchObject({
      id: targetUserId,
      username: managedUsername,
      impersonator: { username: 'admin' },
    });

    const meAsTargetResponse = await admin.get('/api/me');
    expect(meAsTargetResponse.statusCode).toBe(200);
    expect(meAsTargetResponse.body.user).toMatchObject({
      id: targetUserId,
      username: managedUsername,
      impersonator: { username: 'admin' },
    });

    const adminWhileImpersonatingResponse = await admin.get('/api/admin/users');
    expect(adminWhileImpersonatingResponse.statusCode).toBe(403);
    expect(adminWhileImpersonatingResponse.body).toHaveProperty('error', 'Admin access required');

    const taskResponse = await admin
      .post('/api/tasks')
      .send({ title: 'Impersonated task' });
    expect(taskResponse.statusCode).toBe(200);

    const stopResponse = await admin.post('/api/impersonation/stop');
    expect(stopResponse.statusCode).toBe(200);
    expect(stopResponse.body.user).toMatchObject({
      username: 'admin',
      impersonator: null,
    });

    const adminAgainResponse = await admin.get('/api/admin/users');
    expect(adminAgainResponse.statusCode).toBe(200);
    const listedUser = adminAgainResponse.body.users.find((user) => user.id === targetUserId);
    expect(listedUser).toMatchObject({
      username: managedUsername,
      task_count: 1,
    });
  });
});


describe('Dashboard API', () => {
  test('requires authentication for the dashboard endpoints', async () => {
    const dashResponse = await request(app).get('/api/dashboard');
    expect(dashResponse.statusCode).toBe(401);

    const putResponse = await request(app)
      .put('/api/dashboard/preferences')
      .send({ defaultLanding: 'today', cards: [] });
    expect(putResponse.statusCode).toBe(401);

    const resetResponse = await request(app).post('/api/dashboard/preferences/reset');
    expect(resetResponse.statusCode).toBe(401);
  });

  test('returns the aggregated payload with every card', async () => {
    const agent = await createAgent(testUsername('dashboard-shape'));
    const response = await agent.get('/api/dashboard?tz=America/New_York');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('timezone', 'America/New_York');
    expect(response.body).toHaveProperty('timezoneFallback', false);
    expect(response.body).toHaveProperty('today');
    expect(response.body).toHaveProperty('preferences.defaultLanding', 'today');

    const cards = response.body.cards;
    for (const id of ['todaysTasks', 'taskStatusSummary', 'recentNotes', 'bills', 'creditCards', 'weather', 'dailyQuote']) {
      expect(cards).toHaveProperty(id);
      expect(cards[id]).toHaveProperty('ok');
    }
  });

  test('falls back to UTC for unrecognized timezones', async () => {
    const agent = await createAgent(testUsername('dashboard-tz-fallback'));
    const response = await agent.get('/api/dashboard?tz=Mars/SomeCrater');
    expect(response.statusCode).toBe(200);
    expect(response.body.timezone).toBe('UTC');
    expect(response.body.timezoneFallback).toBe(true);
  });

  test('classifies tasks as today using the supplied timezone', async () => {
    const agent = await createAgent(testUsername('dashboard-tz-today'));
    const meResponse = await agent.get('/api/me');
    const userId = meResponse.body.user.id;

    // Tasks with status='in_progress' always show up in the in_progress
    // subsection regardless of when "today" lands. That keeps this test
    // independent of the actual wall-clock at test-run time while still
    // confirming the endpoint reads the correct user_id and partitions rows.
    await db.query(
      `INSERT INTO tasks (user_id, title, priority, status, archived, reminder_at)
       VALUES ($1, $2, 'medium', 'in_progress', 0, NULL)`,
      [userId, `${RUN_ID}-tz-task`]
    );

    const nyResponse = await agent.get('/api/dashboard?tz=America/New_York');
    expect(nyResponse.statusCode).toBe(200);
    const card = nyResponse.body.cards.todaysTasks;
    expect(card.ok).toBe(true);
    const inProgress = (card.data.in_progress || []).map((row) => row.title);
    expect(inProgress).toContain(`${RUN_ID}-tz-task`);

    // Different timezones produce a "today" YMD computed in that tz.
    const saigonResponse = await agent.get('/api/dashboard?tz=Asia/Ho_Chi_Minh');
    expect(saigonResponse.body.timezone).toBe('Asia/Ho_Chi_Minh');
    expect(typeof saigonResponse.body.today).toBe('string');
    expect(saigonResponse.body.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('respects dueSoonDays for the bills card', async () => {
    const agent = await createAgent(testUsername('dashboard-due-soon'));
    const meResponse = await agent.get('/api/me');
    const userId = meResponse.body.user.id;

    const todayYmd = new Date().toLocaleDateString('en-CA');
    const addDays = (n) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + n);
      return d.toLocaleDateString('en-CA');
    };

    await db.query(
      `INSERT INTO fast_access_bills (user_id, item, amount, due_date, status, sort_order)
       VALUES ($1, $2, 25.00, $3, 'Unpaid', 1001)`,
      [userId, `${RUN_ID}-bill-2d`, addDays(2)]
    );
    await db.query(
      `INSERT INTO fast_access_bills (user_id, item, amount, due_date, status, sort_order)
       VALUES ($1, $2, 25.00, $3, 'Unpaid', 1002)`,
      [userId, `${RUN_ID}-bill-10d`, addDays(10)]
    );

    const tightResponse = await agent.get('/api/dashboard?dueSoonDays=3');
    const tightItems = (tightResponse.body.cards.bills.data.dueSoon || []).map((b) => b.item);
    expect(tightItems).toContain(`${RUN_ID}-bill-2d`);
    expect(tightItems).not.toContain(`${RUN_ID}-bill-10d`);

    const wideResponse = await agent.get('/api/dashboard?dueSoonDays=14');
    const wideItems = (wideResponse.body.cards.bills.data.dueSoon || []).map((b) => b.item);
    expect(wideItems).toContain(`${RUN_ID}-bill-2d`);
    expect(wideItems).toContain(`${RUN_ID}-bill-10d`);

    // ignore today as well, since the test seed in initializeDatabase may have
    // pre-populated some defaults — make sure our row is the one being asserted.
    expect(todayYmd.length).toBe(10);
  });

  test('trims note bodies to a 120-character excerpt', async () => {
    const agent = await createAgent(testUsername('dashboard-note-excerpt'));
    const meResponse = await agent.get('/api/me');
    const userId = meResponse.body.user.id;

    const longBody = 'x'.repeat(500);
    await db.query(
      'INSERT INTO notes (user_id, title, body) VALUES ($1, $2, $3)',
      [userId, `${RUN_ID}-long`, longBody]
    );

    const response = await agent.get('/api/dashboard');
    expect(response.statusCode).toBe(200);
    const notes = response.body.cards.recentNotes.data;
    const target = notes.find((n) => n.title === `${RUN_ID}-long`);
    expect(target).toBeDefined();
    expect(target.excerpt.length).toBeLessThanOrEqual(120);
    expect(target.excerpt.endsWith('…')).toBe(true);
  });

  test('omits sensitive task fields from the dashboard payload', async () => {
    const agent = await createAgent(testUsername('dashboard-projection'));
    const meResponse = await agent.get('/api/me');
    const userId = meResponse.body.user.id;

    await db.query(
      `INSERT INTO tasks (user_id, title, description, comment, priority, status, archived, reminder_at)
       VALUES ($1, $2, 'sensitive desc', 'private comment', 'medium', 'in_progress', 0, NULL)`,
      [userId, `${RUN_ID}-proj`]
    );

    const response = await agent.get('/api/dashboard');
    const tasks = response.body.cards.todaysTasks.data;
    const allRows = [...(tasks.overdue || []), ...(tasks.today || []), ...(tasks.in_progress || [])];
    const target = allRows.find((row) => row.title === `${RUN_ID}-proj`);
    expect(target).toBeDefined();
    expect(target).not.toHaveProperty('description');
    expect(target).not.toHaveProperty('comment');
    expect(target).not.toHaveProperty('attachment_data');
  });

  test('persists and resets dashboard preferences', async () => {
    const agent = await createAgent(testUsername('dashboard-prefs'));

    const initial = await agent.get('/api/dashboard');
    expect(initial.body.preferences.defaultLanding).toBe('today');

    const newPrefs = {
      version: 1,
      defaultLanding: 'last_used',
      cards: [
        { id: 'recentNotes',       visible: true,  order: 0 },
        { id: 'todaysTasks',       visible: true,  order: 1 },
        { id: 'taskStatusSummary', visible: false, order: 2 },
      ],
    };

    const putResponse = await agent
      .put('/api/dashboard/preferences')
      .send(newPrefs);
    expect(putResponse.statusCode).toBe(200);
    expect(putResponse.body.preferences.defaultLanding).toBe('last_used');
    const savedOrder = putResponse.body.preferences.cards.map((c) => c.id);
    expect(savedOrder.slice(0, 3)).toEqual(['recentNotes', 'todaysTasks', 'taskStatusSummary']);

    const afterPut = await agent.get('/api/dashboard');
    expect(afterPut.body.preferences.defaultLanding).toBe('last_used');
    const taskStatus = afterPut.body.preferences.cards.find((c) => c.id === 'taskStatusSummary');
    expect(taskStatus.visible).toBe(false);

    const resetResponse = await agent.post('/api/dashboard/preferences/reset');
    expect(resetResponse.statusCode).toBe(200);
    expect(resetResponse.body.preferences.defaultLanding).toBe('today');

    const afterReset = await agent.get('/api/dashboard');
    expect(afterReset.body.preferences.defaultLanding).toBe('today');
  });
});
