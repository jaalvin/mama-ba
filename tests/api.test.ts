import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { seedDatabase } from '../database/seed';

describe('Express REST API Endpoints - Guided Health Companion', () => {
  beforeAll(() => {
    seedDatabase();
  });

  it('GET /api/v1/health should return system status & medical disclaimer header', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
    expect(res.headers['x-medical-disclaimer']).toContain('educational guidance');
  });

  it('POST /api/v1/herbal-safety/check should return safety matrix analysis', async () => {
    const res = await request(app)
      .post('/api/v1/herbal-safety/check')
      .send({ herbName: 'Nibima', pharmaDrugName: 'Iron Supplements' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.severity).toBe('CAUTION');
  });

  it('POST /api/v1/triage/evaluate should return triage red-flag evaluation', async () => {
    const res = await request(app)
      .post('/api/v1/triage/evaluate')
      .send({ symptomKeys: ['severe_vaginal_bleeding'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isRedFlag).toBe(true);
  });

  it('POST /api/v1/maternal/anc-schedule should return ANC timeline', async () => {
    const res = await request(app)
      .post('/api/v1/maternal/anc-schedule')
      .send({ gestationalWeeks: 10, dueDate: '2026-11-20' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(4);
  });

  it('POST /api/v1/vitals/log should record vitals log', async () => {
    const res = await request(app)
      .post('/api/v1/vitals/log')
      .send({ userId: 'demo-patient-001', systolicBp: 120, diastolicBp: 80 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vitalStatus).toBe('NORMAL');
  });

  it('POST /api/v1/chat/query should respond via RAG / Knowledge Base', async () => {
    const res = await request(app)
      .post('/api/v1/chat/query')
      .send({ query: 'What local Ghanaian foods give iron during pregnancy?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.answerTwi).toBeDefined();
    expect(res.body.data.answerEnglish).toBeDefined();
  }, 45000);

  it('GET /api/v1/sync/bundle should export offline seed database bundle', async () => {
    const res = await request(app).get('/api/v1/sync/bundle');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.herbalMatrix).toBeDefined();
    expect(res.body.data.triageRules).toBeDefined();
  });

  it('POST /api/v1/reminders should create a scheduled reminder', async () => {
    const testUserId = `rem-user-${Date.now()}`;
    const res = await request(app)
      .post('/api/v1/reminders')
      .send({
        userId: testUserId,
        title: 'Take Iron Supplement',
        reminderType: 'MEDICATION',
        scheduledTime: '14:00',
        dosageInfo: '1 Tablet daily'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Take Iron Supplement');

    const getRes = await request(app).get(`/api/v1/reminders/${testUserId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.count).toBe(1);
  });

  it('POST /api/v1/logistics/prescription/order should persist prescription order', async () => {
    const testUserId = `rx-user-${Date.now()}`;
    const res = await request(app)
      .post('/api/v1/logistics/prescription/order')
      .send({
        userId: testUserId,
        pharmacyId: '1',
        prescriptionDetails: 'Folic acid 5mg daily',
        deliveryAddress: 'Kotei Junction, Kumasi',
        phone: '+233208179910'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderId).toMatch(/^RX-/);

    const getOrders = await request(app).get(`/api/v1/logistics/prescriptions/${testUserId}`);
    expect(getOrders.status).toBe(200);
    expect(getOrders.body.count).toBe(1);
    expect(getOrders.body.data[0].delivery_address).toBe('Kotei Junction, Kumasi');
  });

  it('POST /api/v1/auth/change-password should update password hash', async () => {
    const testUserId = `pwd-user-${Date.now()}`;
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .send({
        userId: testUserId,
        newPassword: 'securePassword123'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});


