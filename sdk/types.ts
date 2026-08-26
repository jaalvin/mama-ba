/**
 * The Guided Health Companion (Patient App)
 * Isolated Frontend SDK Type Definitions
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 1. Herbal & Food Safety Checker
export interface HerbalSafetyRequest {
  herbName?: string;
  pharmaDrugName?: string;
  foodItem?: string;
}

export interface HerbalSafetyResponse {
  severity: 'SAFE' | 'CAUTION' | 'DANGER' | 'NO_KNOWN_INTERACTION';
  herbName: string;
  pharmaDrugName: string;
  foodItem: string | null;
  interactionDetails: string;
  culturalAdviceTwi: string;
  culturalAdviceEnglish: string;
  allRecordsChecked: number;
}

// 2. Offline Symptom Triage
export interface TriageRequest {
  symptomKeys?: string[];
  symptomText?: string;
  category?: 'maternal' | 'infant' | 'general';
}

export interface MatchedTriageRule {
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
  matchedRules: MatchedTriageRule[];
  emergencyNoticeEnglish: string;
  emergencyNoticeTwi: string;
  recommendedAction: string;
}

// 3. Maternal & Childcare Tracker
export interface ANCScheduleRequest {
  gestationalWeeks?: number;
  dueDate?: string;
}

export interface ANCScheduleItem {
  visitNumber: number;
  recommendedWeeks: number;
  titleEnglish: string;
  titleTwi: string;
  descriptionEnglish: string;
  descriptionTwi: string;
  dueDate: string;
  isCompleted: boolean;
}

export interface ImmunizationScheduleRequest {
  childBirthDate: string;
}

export interface ImmunizationScheduleItem {
  vaccineCode: string;
  ageDescriptionEnglish: string;
  ageDescriptionTwi: string;
  titleEnglish: string;
  titleTwi: string;
  descriptionEnglish: string;
  descriptionTwi: string;
  dueDate: string;
  isCompleted: boolean;
}

// 4. Vitals & Health Journal
export interface VitalsEntryRequest {
  userId: string;
  systolicBp?: number;
  diastolicBp?: number;
  bodyTemperature?: number;
  pulseRate?: number;
  bloodGlucose?: number;
  weightKg?: number;
  notes?: string;
}

export interface VitalsEvaluationResult {
  id: string;
  vitalStatus: 'NORMAL' | 'ELEVATED' | 'HIGH_WARNING';
  alerts: string[];
  alertsTwi: string[];
  recordedAt: string;
}

export interface HealthJournalEntryRequest {
  userId: string;
  symptoms: string[];
  mood: string;
  notesText?: string;
  audioNoteUrl?: string;
}

// 5. RAG Chatbot & Q&A
export interface ChatQueryRequest {
  userId?: string;
  query: string;
  language?: 'twi' | 'english';
}

export interface ChatQueryResponse {
  answerEnglish: string;
  answerTwi: string;
  source: 'rag_gemini' | 'offline_knowledge_base' | 'triage_fallback';
  disclaimer: string;
  matchedCategory?: string;
}

export interface PresetPromptCard {
  id: string;
  question_english: string;
  question_twi: string;
  category: string;
}

// 6. User Profile
export interface UserProfile {
  userId: string;
  fullName: string;
  languagePreference: 'twi' | 'english';
  isPregnant: boolean;
  gestationalWeeks: number;
  dueDate?: string;
  childBirthDate?: string;
  emergencyContactPhone?: string;
}

// 7. Offline Sync
export interface SyncPayload {
  userId: string;
  deviceTimestamp: string;
  vitals?: any[];
  journalEntries?: any[];
  schedules?: any[];
  reminders?: any[];
}
