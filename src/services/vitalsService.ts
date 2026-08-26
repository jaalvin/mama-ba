import { getOfflineDb } from '../config';

export interface VitalsEntry {
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

export class VitalsService {
  /**
   * Log patient vitals and evaluate health status.
   */
  static logVitals(entry: VitalsEntry): VitalsEvaluationResult {
    const db = getOfflineDb();
    const alerts: string[] = [];
    const alertsTwi: string[] = [];
    let isHigh = false;
    let isElevated = false;

    // Blood Pressure evaluation
    if (entry.systolicBp && entry.diastolicBp) {
      if (entry.systolicBp >= 140 || entry.diastolicBp >= 90) {
        isHigh = true;
        alerts.push(`High Blood Pressure Detected (${entry.systolicBp}/${entry.diastolicBp} mmHg). Pre-eclampsia risk!`);
        alertsTwi.push(`Mogya mmoroso soro (High BP ${entry.systolicBp}/${entry.diastolicBp}). Kɔ asibiti kɔyɛ nhwehwɛmu!`);
      } else if (entry.systolicBp >= 130 || entry.diastolicBp >= 85) {
        isElevated = true;
        alerts.push(`Elevated Blood Pressure (${entry.systolicBp}/${entry.diastolicBp} mmHg). Rest and monitor.`);
        alertsTwi.push(`Mogya mmoroso wo soro kakra (${entry.systolicBp}/${entry.diastolicBp}). Gye wo ho ahome.`);
      }
    }

    // Body Temperature evaluation
    if (entry.bodyTemperature) {
      if (entry.bodyTemperature >= 38.0) {
        isHigh = true;
        alerts.push(`High Fever Detected (${entry.bodyTemperature}°C). Risk of severe infection or malaria.`);
        alertsTwi.push(`Ho hye denden (${entry.bodyTemperature}°C). Kɔ asibiti kɔyɛ malaria test ntɛm!`);
      } else if (entry.bodyTemperature >= 37.5) {
        isElevated = true;
        alerts.push(`Mild Fever (${entry.bodyTemperature}°C). Hydrate and stay cool.`);
        alertsTwi.push(`Ho hye kakra (${entry.bodyTemperature}°C). Nom nsuo pii.`);
      }
    }

    const vitalStatus: 'NORMAL' | 'ELEVATED' | 'HIGH_WARNING' = isHigh ? 'HIGH_WARNING' : isElevated ? 'ELEVATED' : 'NORMAL';

    const id = `vit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const loggedAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO vitals_logs 
      (id, user_id, systolic_bp, diastolic_bp, body_temperature, pulse_rate, blood_glucose, weight_kg, vital_status, notes, logged_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      entry.userId,
      entry.systolicBp || null,
      entry.diastolicBp || null,
      entry.bodyTemperature || null,
      entry.pulseRate || null,
      entry.bloodGlucose || null,
      entry.weightKg || null,
      vitalStatus,
      entry.notes || null,
      loggedAt,
      'pending'
    );

    return {
      id,
      vitalStatus,
      alerts: alerts.length > 0 ? alerts : ['All recorded vitals within normal ranges.'],
      alertsTwi: alertsTwi.length > 0 ? alertsTwi : ['Nneɛma nyinaa kɔ so pɛpɛɛpɛ.'],
      recordedAt: loggedAt
    };
  }

  /**
   * Fetch vitals log history for a user.
   */
  static getVitalsHistory(userId: string, limit: number = 10) {
    const db = getOfflineDb();
    const stmt = db.prepare(`SELECT * FROM vitals_logs WHERE user_id = ? ORDER BY logged_at DESC LIMIT ?`);
    return stmt.all(userId, limit);
  }

  /**
   * Save a daily health journal entry.
   */
  static saveHealthJournal(userId: string, symptoms: string[], mood: string, notesText?: string, audioNoteUrl?: string) {
    const db = getOfflineDb();
    const id = `jrn-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];

    const stmt = db.prepare(`
      INSERT INTO health_journal
      (id, user_id, entry_date, symptoms_noted, mood, notes_text, audio_note_url, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, userId, today, JSON.stringify(symptoms), mood, notesText || null, audioNoteUrl || null, 'pending');

    return { id, entryDate: today, status: 'saved_locally' };
  }

  /**
   * Fetch health journal entries.
   */
  static getJournalHistory(userId: string) {
    const db = getOfflineDb();
    const stmt = db.prepare(`SELECT * FROM health_journal WHERE user_id = ? ORDER BY entry_date DESC`);
    return stmt.all(userId);
  }
}
