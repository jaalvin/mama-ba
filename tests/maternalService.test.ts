import { describe, it, expect, beforeAll } from 'vitest';
import { MaternalService } from '../src/services/maternalService';
import { seedDatabase } from '../database/seed';

describe('MaternalService - ANC & Immunization Schedule Generator', () => {
  beforeAll(() => {
    seedDatabase();
  });

  it('should generate 4 ANC visits aligned with GHS guidelines', () => {
    const schedule = MaternalService.generateANCSchedule(12, '2026-11-20');

    expect(schedule.length).toBe(4);
    expect(schedule[0].titleEnglish).toContain('1st ANC Booking Visit');
    expect(schedule[0].titleTwi).toContain('Edi Kan');
    expect(schedule[3].titleEnglish).toContain('Delivery Planning');
  });

  it('should generate childhood immunization timeline from birth date', () => {
    const schedule = MaternalService.generateImmunizationSchedule('2026-01-01');

    expect(schedule.length).toBe(4);
    expect(schedule[0].vaccineCode).toBe('BCG_OPV0');
    expect(schedule[3].vaccineCode).toBe('MEASLES_RUBELLA1');
  });
});
