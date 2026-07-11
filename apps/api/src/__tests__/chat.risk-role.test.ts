import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../app';
import { User } from '../models/User';
import { Message } from '../models/Message';
import { RiskFlag } from '../models/RiskFlag';

const app = createApp();

beforeAll(async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/talkitout-test';
  await mongoose.connect(mongoUri);
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Message.deleteMany({}), RiskFlag.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Chat risk-flag role behavior', () => {
  it('does not create risk flags for counselor messages', async () => {
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 12);

    const counselor = await User.create({
      name: 'Counselor Role Test',
      email: 'counselor-role-chat@test.sg',
      password: hashedPassword,
      age: 33,
      role: 'counselor',
    });

    const loginRes = await request(app).post('/auth/login').send({
      email: counselor.email,
      password,
    });

    expect(loginRes.status).toBe(200);
    const accessToken = loginRes.body.accessToken;

    const res = await request(app)
      .post('/chat/message')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ text: 'I want to die and hurt myself' });

    expect(res.status).toBe(200);

    const counselorFlags = await RiskFlag.find({ userId: counselor._id });
    expect(counselorFlags).toHaveLength(0);
  });

  it('creates risk flags for student high-risk messages', async () => {
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 12);

    const student = await User.create({
      name: 'Student Role Test',
      email: 'student-role-chat@test.sg',
      password: hashedPassword,
      age: 16,
      role: 'student',
      guardianConsent: true,
    });

    const loginRes = await request(app).post('/auth/login').send({
      email: student.email,
      password,
    });

    expect(loginRes.status).toBe(200);
    const accessToken = loginRes.body.accessToken;

    const res = await request(app)
      .post('/chat/message')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ text: 'I want to die and hurt myself' });

    expect(res.status).toBe(200);

    const studentFlags = await RiskFlag.find({ userId: student._id });
    expect(studentFlags.length).toBeGreaterThan(0);
    expect(studentFlags[0].severity).toBeGreaterThanOrEqual(2);
  });

  it('shows student risk flag in counselor risk list', async () => {
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 12);

    const counselor = await User.create({
      name: 'Counselor Flag View Test',
      email: 'counselor-flag-view@test.sg',
      password: hashedPassword,
      age: 36,
      role: 'counselor',
    });

    const student = await User.create({
      name: 'Student Flag View Test',
      email: 'student-flag-view@test.sg',
      password: hashedPassword,
      age: 16,
      role: 'student',
      guardianConsent: true,
    });

    const counselorLogin = await request(app).post('/auth/login').send({
      email: counselor.email,
      password,
    });
    expect(counselorLogin.status).toBe(200);

    const studentLogin = await request(app).post('/auth/login').send({
      email: student.email,
      password,
    });
    expect(studentLogin.status).toBe(200);

    const chatRes = await request(app)
      .post('/chat/message')
      .set('Authorization', `Bearer ${studentLogin.body.accessToken}`)
      .send({ text: 'I want to die and hurt myself' });

    expect(chatRes.status).toBe(200);

    const flagsRes = await request(app)
      .get('/risk/flags')
      .set('Authorization', `Bearer ${counselorLogin.body.accessToken}`)
      .query({ status: 'open' });

    expect(flagsRes.status).toBe(200);
    expect(Array.isArray(flagsRes.body.flags)).toBe(true);
    expect(flagsRes.body.flags.length).toBeGreaterThan(0);
    expect(flagsRes.body.flags[0].userId.email).toBe(student.email);
  });
});
