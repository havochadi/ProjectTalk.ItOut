import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../app';
import { User } from '../models/User';
import { Message } from '../models/Message';
import { RiskFlag } from '../models/RiskFlag';
import { FLAG_STATUS, MESSAGE_ROLE, SENTIMENT } from '@talkitout/lib';

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

describe('Risk Flags API', () => {
  it('should allow counselor to update risk flag status', async () => {
    const counselorPassword = 'password123';
    const hashedPassword = await bcrypt.hash(counselorPassword, 12);

    const counselor = await User.create({
      name: 'Counselor',
      email: 'counselor-risk@test.sg',
      password: hashedPassword,
      age: 30,
      role: 'counselor',
    });

    const student = await User.create({
      name: 'Student',
      email: 'student-risk@test.sg',
      password: hashedPassword,
      age: 16,
      role: 'student',
      guardianConsent: true,
    });

    const loginRes = await request(app).post('/auth/login').send({
      email: counselor.email,
      password: counselorPassword,
    });

    expect(loginRes.status).toBe(200);
    const accessToken = loginRes.body.accessToken;

    const message = await Message.create({
      userId: student._id,
      role: MESSAGE_ROLE.USER,
      text: 'I cannot handle this anymore',
      sentiment: SENTIMENT.NEGATIVE,
      riskTags: ['self-harm'],
      severity: 3,
    });

    const flag = await RiskFlag.create({
      userId: student._id,
      messageId: message._id,
      tags: ['self-harm'],
      severity: 3,
      status: FLAG_STATUS.OPEN,
    });

    const inReviewRes = await request(app)
      .patch(`/risk/flags/${flag._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'in_review' });

    expect(inReviewRes.status).toBe(200);
    expect(inReviewRes.body.status).toBe(FLAG_STATUS.IN_REVIEW);
    expect(inReviewRes.body.reviewedBy).toBeDefined();

    const resolvedRes = await request(app)
      .patch(`/risk/flags/${flag._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'resolved' });

    expect(resolvedRes.status).toBe(200);
    expect(resolvedRes.body.status).toBe(FLAG_STATUS.RESOLVED);
    expect(resolvedRes.body.resolvedAt).toBeDefined();

    const reopenedRes = await request(app)
      .patch(`/risk/flags/${flag._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'open' });

    expect(reopenedRes.status).toBe(200);
    expect(reopenedRes.body.status).toBe(FLAG_STATUS.OPEN);
    expect(reopenedRes.body.resolvedAt).toBeFalsy();
  });

  it('should reject invalid risk flag status value', async () => {
    const hashedPassword = await bcrypt.hash('password123', 12);

    const counselor = await User.create({
      name: 'Counselor',
      email: 'counselor-invalid-status@test.sg',
      password: hashedPassword,
      age: 30,
      role: 'counselor',
    });

    const student = await User.create({
      name: 'Student',
      email: 'student-invalid-status@test.sg',
      password: hashedPassword,
      age: 16,
      role: 'student',
      guardianConsent: true,
    });

    const loginRes = await request(app).post('/auth/login').send({
      email: counselor.email,
      password: 'password123',
    });

    const message = await Message.create({
      userId: student._id,
      role: MESSAGE_ROLE.USER,
      text: 'I am extremely stressed',
      sentiment: SENTIMENT.NEGATIVE,
      riskTags: ['severe-stress'],
      severity: 2,
    });

    const flag = await RiskFlag.create({
      userId: student._id,
      messageId: message._id,
      tags: ['severe-stress'],
      severity: 2,
      status: FLAG_STATUS.OPEN,
    });

    const res = await request(app)
      .patch(`/risk/flags/${flag._id}`)
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .send({ status: 'reviewing' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid status value');
  });

  it('should only return student risk flags in counselor list', async () => {
    const hashedPassword = await bcrypt.hash('password123', 12);

    const counselor = await User.create({
      name: 'Counselor',
      email: 'counselor-list-filter@test.sg',
      password: hashedPassword,
      age: 31,
      role: 'counselor',
    });

    const student = await User.create({
      name: 'Student',
      email: 'student-list-filter@test.sg',
      password: hashedPassword,
      age: 15,
      role: 'student',
      guardianConsent: true,
    });

    const counselorMessage = await Message.create({
      userId: counselor._id,
      role: MESSAGE_ROLE.USER,
      text: 'Counselor test message',
      sentiment: SENTIMENT.NEGATIVE,
      riskTags: ['severe-stress'],
      severity: 2,
    });

    const studentMessage = await Message.create({
      userId: student._id,
      role: MESSAGE_ROLE.USER,
      text: 'Student test message',
      sentiment: SENTIMENT.NEGATIVE,
      riskTags: ['severe-stress'],
      severity: 2,
    });

    await RiskFlag.create({
      userId: counselor._id,
      messageId: counselorMessage._id,
      tags: ['severe-stress'],
      severity: 2,
      status: FLAG_STATUS.OPEN,
    });

    const studentFlag = await RiskFlag.create({
      userId: student._id,
      messageId: studentMessage._id,
      tags: ['severe-stress'],
      severity: 2,
      status: FLAG_STATUS.OPEN,
    });

    const loginRes = await request(app).post('/auth/login').send({
      email: counselor.email,
      password: 'password123',
    });

    const listRes = await request(app)
      .get('/risk/flags')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.flags)).toBe(true);
    expect(listRes.body.flags).toHaveLength(1);
    expect(listRes.body.flags[0]._id).toBe(String(studentFlag._id));
    expect(listRes.body.flags[0].userId.email).toBe(student.email);
  });
});
