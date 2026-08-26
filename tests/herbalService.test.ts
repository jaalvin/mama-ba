import { describe, it, expect, beforeAll } from 'vitest';
import { HerbalService } from '../src/services/herbalService';
import { seedDatabase } from '../database/seed';

describe('HerbalService - Ghanaian Herbal & Food Safety Matrix', () => {
  beforeAll(() => {
    seedDatabase();
  });

  it('should detect Nibima vs Iron Supplement interaction with CAUTION status and Twi advice', () => {
    const result = HerbalService.checkSafety({
      herbName: 'Nibima',
      pharmaDrugName: 'Iron Supplements'
    });

    expect(result.severity).toBe('CAUTION');
    expect(result.herbName).toContain('Nibima');
    expect(result.culturalAdviceTwi).toContain('Nibima');
    expect(result.culturalAdviceEnglish).toContain('Iron supplements');
  });

  it('should detect Neem tea during pregnancy as DANGER', () => {
    const result = HerbalService.checkSafety({
      herbName: 'Neem'
    });

    expect(result.severity).toBe('DANGER');
    expect(result.culturalAdviceEnglish).toContain('Neem leaf tea');
  });

  it('should detect Ginger & Lemon tea as SAFE', () => {
    const result = HerbalService.checkSafety({
      herbName: 'Ginger'
    });

    expect(result.severity).toBe('SAFE');
  });

  it('should return NO_KNOWN_INTERACTION for unlisted combinations', () => {
    const result = HerbalService.checkSafety({
      herbName: 'Unlisted Rare Herb XYZ',
      pharmaDrugName: 'Vitamin C'
    });

    expect(result.severity).toBe('NO_KNOWN_INTERACTION');
    expect(result.culturalAdviceTwi).toBeDefined();
  });
});
