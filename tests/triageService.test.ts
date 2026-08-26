import { describe, it, expect, beforeAll } from 'vitest';
import { TriageService } from '../src/services/triageService';
import { seedDatabase } from '../database/seed';

describe('TriageService - Offline Red-Flag Emergency Triage', () => {
  beforeAll(() => {
    seedDatabase();
  });

  it('should trigger RED FLAG emergency for severe vaginal bleeding', () => {
    const result = TriageService.evaluateSymptoms({
      symptomKeys: ['severe_vaginal_bleeding']
    });

    expect(result.isRedFlag).toBe(true);
    expect(result.highestSeverity).toBe('HIGH');
    expect(result.hospitalReferralRequired).toBe(true);
    expect(result.emergencyNoticeEnglish).toContain('RED FLAG EMERGENCY');
    expect(result.emergencyNoticeTwi).toContain('KƆ ASIBITI');
  });

  it('should trigger RED FLAG emergency for high infant fever', () => {
    const result = TriageService.evaluateSymptoms({
      symptomKeys: ['high_infant_fever']
    });

    expect(result.isRedFlag).toBe(true);
    expect(result.highestSeverity).toBe('HIGH');
    expect(result.emergencyNoticeTwi).toContain('Malaria');
  });

  it('should classify mild morning sickness as MILD without hospital referral', () => {
    const result = TriageService.evaluateSymptoms({
      symptomKeys: ['mild_morning_sickness']
    });

    expect(result.isRedFlag).toBe(false);
    expect(result.highestSeverity).toBe('MILD');
    expect(result.hospitalReferralRequired).toBe(false);
  });
});
