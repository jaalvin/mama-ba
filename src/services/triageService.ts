import { getOfflineDb } from '../config';

export interface TriageRequest {
  symptomKeys?: string[];
  symptomText?: string;
  category?: 'maternal' | 'infant' | 'general';
}

export interface MatchedRule {
  symptomKey: string;
  category: string;
  symptomNameEnglish: string;
  symptomNameTwi: string;
  severityLevel: 'MILD' | 'MODERATE' | 'HIGH';
  isRedFlag: boolean;
  emergencyActionEnglish: string;
  emergencyActionTwi: string;
  hospitalReferralRequired: boolean;
}

export interface TriageResult {
  highestSeverity: 'MILD' | 'MODERATE' | 'HIGH';
  isRedFlag: boolean;
  hospitalReferralRequired: boolean;
  matchedRules: MatchedRule[];
  emergencyNoticeEnglish: string;
  emergencyNoticeTwi: string;
  recommendedAction: string;
}

export class TriageService {
  /**
   * Evaluate patient symptoms against offline decision tree rules.
   */
  static evaluateSymptoms(req: TriageRequest): TriageResult {
    const db = getOfflineDb();
    const stmt = db.prepare(`SELECT * FROM triage_rules`);
    const allRules = stmt.all() as Array<{
      symptom_key: string;
      category: string;
      symptom_name_english: string;
      symptom_name_twi: string;
      severity_level: 'MILD' | 'MODERATE' | 'HIGH';
      is_red_flag: number;
      emergency_action_twi: string;
      emergency_action_english: string;
      hospital_referral_required: number;
    }>;

    const providedKeys = (req.symptomKeys || []).map(k => k.toLowerCase());
    const freeText = (req.symptomText || '').toLowerCase();

    const matchedRules: MatchedRule[] = [];

    for (const rule of allRules) {
      const keyMatch = providedKeys.includes(rule.symptom_key.toLowerCase());
      const nameEngMatch = freeText !== '' && rule.symptom_name_english.toLowerCase().split(' ').some(w => w.length > 3 && freeText.includes(w));
      const nameTwiMatch = freeText !== '' && rule.symptom_name_twi.toLowerCase().split(' ').some(w => w.length > 3 && freeText.includes(w));

      if (keyMatch || nameEngMatch || nameTwiMatch) {
        matchedRules.push({
          symptomKey: rule.symptom_key,
          category: rule.category,
          symptomNameEnglish: rule.symptom_name_english,
          symptomNameTwi: rule.symptom_name_twi,
          severityLevel: rule.severity_level,
          isRedFlag: Boolean(rule.is_red_flag),
          emergencyActionEnglish: rule.emergency_action_english,
          emergencyActionTwi: rule.emergency_action_twi,
          hospitalReferralRequired: Boolean(rule.hospital_referral_required)
        });
      }
    }

    if (matchedRules.length === 0) {
      return {
        highestSeverity: 'MILD',
        isRedFlag: false,
        hospitalReferralRequired: false,
        matchedRules: [],
        emergencyNoticeEnglish: 'No critical red-flag emergency symptoms detected. Continue monitoring and log symptoms in your health journal.',
        emergencyNoticeTwi: 'Enni nsɛnkyerɛneɛ hu biara. Kɔ so hwɛ wo ho so na kyerɛw wo ho nsɛm gu wo journal mu.',
        recommendedAction: 'Log symptoms in your offline health journal. If feeling unwell, contact your local clinic.'
      };
    }

    const isRedFlag = matchedRules.some(r => r.isRedFlag);
    const hasHigh = matchedRules.some(r => r.severityLevel === 'HIGH');
    const hasMod = matchedRules.some(r => r.severityLevel === 'MODERATE');

    const highestSeverity: 'MILD' | 'MODERATE' | 'HIGH' = hasHigh ? 'HIGH' : hasMod ? 'MODERATE' : 'MILD';
    const hospitalReferralRequired = matchedRules.some(r => r.hospitalReferralRequired);

    const primaryRule = matchedRules.find(r => r.isRedFlag) || matchedRules[0];

    return {
      highestSeverity,
      isRedFlag,
      hospitalReferralRequired,
      matchedRules,
      emergencyNoticeEnglish: primaryRule.emergencyActionEnglish,
      emergencyNoticeTwi: primaryRule.emergencyActionTwi,
      recommendedAction: hospitalReferralRequired
        ? 'IMMEDIATE REFERRAL: Proceed to the nearest Ghana Health Service clinic or hospital emergency center immediately.'
        : 'MONITOR & LOG: Rest, follow home care instructions, and visit the clinic if symptoms worsen.'
    };
  }

  /**
   * Get all registered triage rules for client-side offline decision tree UI.
   */
  static getAllRules() {
    const db = getOfflineDb();
    const stmt = db.prepare(`SELECT * FROM triage_rules`);
    return stmt.all();
  }
}
