import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import app from '../src/app';
import { LilyApiClient } from '../sdk/lilyClient';
import { seedDatabase } from '../database/seed';

describe('LilyApiClient - Isolated Frontend SDK Integration', { timeout: 30000 }, () => {
  let server: http.Server;
  let client: LilyApiClient;

  beforeAll(async () => {
    seedDatabase();
    await new Promise<void>((resolve) => {
      server = app.listen(3099, () => {
        client = new LilyApiClient('http://localhost:3099/api/v1');
        resolve();
      });
    });
  }, 30000);

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      if (server) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }, 30000);

  it('client.checkHerbalSafety() should return typed herbal safety response', async () => {
    const res = await client.checkHerbalSafety({
      herbName: 'Nibima',
      pharmaDrugName: 'Iron Supplements'
    });

    expect(res.success).toBe(true);
    expect(res.data?.severity).toBe('CAUTION');
    expect(res.data?.culturalAdviceTwi).toBeDefined();
  });

  it('client.evaluateTriage() should return red-flag triage result', async () => {
    const res = await client.evaluateTriage({
      symptomKeys: ['severe_vaginal_bleeding']
    });

    expect(res.success).toBe(true);
    expect(res.data?.isRedFlag).toBe(true);
    expect(res.data?.highestSeverity).toBe('HIGH');
  });

  it('client.askChatbot() should return dual-language answer', async () => {
    const res = await client.askChatbot({
      query: 'What local foods give iron during pregnancy?'
    });

    expect(res.success).toBe(true);
    expect(res.data?.answerEnglish).toBeDefined();
    expect(res.data?.answerTwi).toBeDefined();
  }, 30000);

  it('client.getANCSchedule() should return 4 ANC visit items', async () => {
    const res = await client.getANCSchedule({
      gestationalWeeks: 10,
      dueDate: '2026-11-20'
    });

    expect(res.success).toBe(true);
    expect(res.data?.length).toBe(4);
  });

  it('client.logVitals() should evaluate blood pressure and return status', async () => {
    const res = await client.logVitals({
      userId: 'sdk-test-user',
      systolicBp: 145,
      diastolicBp: 95
    });

    expect(res.success).toBe(true);
    expect(res.data?.vitalStatus).toBe('HIGH_WARNING');
  });
});
