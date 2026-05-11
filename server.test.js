const request = require('supertest');
const fs = require('fs');
const path = require('path');

const TEST_DB_FILE = path.join(__dirname, 'tmp', 'test.db');
process.env.DB_FILE = TEST_DB_FILE;

if (fs.existsSync(TEST_DB_FILE)) {
  fs.unlinkSync(TEST_DB_FILE);
}

const { app, db } = require('./server');

describe('Login API', () => {
  afterAll((done) => {
    db.close(done);
    if (fs.existsSync(TEST_DB_FILE)) {
      fs.unlinkSync(TEST_DB_FILE);
    }
  });

  test('should sign up a new user and log in successfully', async () => {
    const signupResponse = await request(app)
      .post('/api/signup')
      .send({ username: 'testuser', password: 'Password123!' });

    expect(signupResponse.statusCode).toBe(200);
    expect(signupResponse.body.user).toMatchObject({ username: 'testuser' });

    const loginResponse = await request(app)
      .post('/api/login')
      .send({ username: 'testuser', password: 'Password123!' });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.body.user).toMatchObject({ username: 'testuser' });
  });

  test('should reject invalid login credentials for nonexistent user', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({ username: 'nonexistent', password: 'wrongpass' });

    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty('error', 'Invalid credentials');
  });

  test('should reject login with incorrect password for existing user', async () => {
    const signupResponse = await request(app)
      .post('/api/signup')
      .send({ username: 'existinguser', password: 'CorrectPass1!' });

    expect(signupResponse.statusCode).toBe(200);

    const loginResponse = await request(app)
      .post('/api/login')
      .send({ username: 'existinguser', password: 'WrongPass1!' });

    expect(loginResponse.statusCode).toBe(401);
    expect(loginResponse.body).toHaveProperty('error', 'Invalid credentials');
  });
});
