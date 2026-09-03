import { describe, it, expect, beforeAll } from 'vitest';
import { VitalsService } from '../src/services/vitalsService';
import { seedDatabase } from '../database/seed';

describe('VitalsService - Health Monitoring & Journal Analytics', () => {
  beforeAll(() => {
    seedDatabase();
  });

  it('should flag HIGH_WARNING on high blood pressure (145/95 mmHg)', async () => {
    const result = await VitalsService.logVitals({
      userId: 'test-user-01',
      systolicBp: 145,
      diastolicBp: 95
    });

    expect(result.vitalStatus).toBe('HIGH_WARNING');
    expect(result.alerts[0]).toContain('High Blood Pressure Detected');
    expect(result.alertsTwi[0]).toContain('Mogya mmoroso');
  });

  it('should flag HIGH_WARNING on high fever (38.5°C)', async () => {
    const result = await VitalsService.logVitals({
      userId: 'test-user-01',
      bodyTemperature: 38.5
    });

    expect(result.vitalStatus).toBe('HIGH_WARNING');
    expect(result.alerts[0]).toContain('High Fever Detected');
  });

  it('should log normal vitals as NORMAL', async () => {
    const result = await VitalsService.logVitals({
      userId: 'test-user-01',
      systolicBp: 118,
      diastolicBp: 78,
      bodyTemperature: 36.8
    });

    expect(result.vitalStatus).toBe('NORMAL');
  });

  it('should save health journal entries and retrieve journal history', () => {
    const journalResult = VitalsService.saveHealthJournal(
      'test-user-01',
      ['fatigue', 'mild_nausea'],
      'good',
      'Feeling okay overall today.'
    );

    expect(journalResult.status).toBe('saved_locally');

    const history = VitalsService.getJournalHistory('test-user-01');
    expect(history.length).toBeGreaterThan(0);
  });
});
