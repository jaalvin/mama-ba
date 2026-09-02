import fs from 'fs';
import path from 'path';
import { getOfflineDb } from '../config';

export interface SyncPayload {
  userId: string;
  deviceTimestamp: string;
  vitals?: any[];
  journalEntries?: any[];
  schedules?: any[];
  reminders?: any[];
}

export class SyncService {
  /**
   * Export complete offline seed bundle (SQLite file or JSON payload) for client initial sync.
   */
  static getOfflineBundle() {
    const db = getOfflineDb();

    const herbalMatrix = db.prepare(`SELECT * FROM herbal_drug_matrix`).all();
    const triageRules = db.prepare(`SELECT * FROM triage_rules`).all();
    const qaBase = db.prepare(`SELECT * FROM offline_knowledge_qa`).all();

    return {
      version: '1.0.0',
      syncedAt: new Date().toISOString(),
      herbalMatrix,
      triageRules,
      qaBase
    };
  }

  /**
   * Process offline queue payloads uploaded from mobile client when network returns.
   */
  static processSyncPayload(payload: SyncPayload) {
    const db = getOfflineDb();
    let processedCount = 0;

    // Process vitals
    if (payload.vitals && Array.isArray(payload.vitals)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO vitals_logs
        (id, user_id, systolic_bp, diastolic_bp, body_temperature, pulse_rate, blood_glucose, weight_kg, vital_status, notes, logged_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
      `);

      for (const item of payload.vitals) {
        stmt.run(
          item.id || `vit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          payload.userId,
          item.systolic_bp || item.systolicBp || null,
          item.diastolic_bp || item.diastolicBp || null,
          item.body_temperature || item.bodyTemperature || null,
          item.pulse_rate || item.pulseRate || null,
          item.blood_glucose || item.bloodGlucose || null,
          item.weight_kg || item.weightKg || null,
          item.vital_status || item.vitalStatus || 'NORMAL',
          item.notes || null,
          item.logged_at || item.loggedAt || new Date().toISOString()
        );
        processedCount++;
      }
    }

    // Process journal entries
    if (payload.journalEntries && Array.isArray(payload.journalEntries)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO health_journal
        (id, user_id, entry_date, symptoms_noted, mood, notes_text, audio_note_url, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')
      `);

      for (const j of payload.journalEntries) {
        stmt.run(
          j.id || `jrn-${Date.now()}`,
          payload.userId,
          j.entry_date || j.entryDate || new Date().toISOString().split('T')[0],
          typeof j.symptoms_noted === 'string' ? j.symptoms_noted : JSON.stringify(j.symptoms_noted || []),
          j.mood || 'good',
          j.notes_text || j.notesText || null,
          j.audio_note_url || j.audioNoteUrl || null
        );
        processedCount++;
      }
    }

    return {
      status: 'success',
      userId: payload.userId,
      itemsProcessed: processedCount,
      syncedAt: new Date().toISOString()
    };
  }

  /**
   * Bidirectional push and pull sync for a specific user ID.
   */
  static pushPullSync(userId: string, clientData?: Partial<SyncPayload>) {
    const db = getOfflineDb();

    if (clientData) {
      this.processSyncPayload({
        deviceTimestamp: new Date().toISOString(),
        ...clientData,
        userId
      });
    }

    const vitals = db.prepare(`SELECT * FROM vitals_logs WHERE user_id = ? ORDER BY logged_at DESC`).all(userId);
    const journalEntries = db.prepare(`SELECT * FROM health_journal WHERE user_id = ? ORDER BY entry_date DESC`).all(userId);
    let schedules: any[] = [];
    try {
      schedules = db.prepare(`SELECT * FROM user_maternal_schedules WHERE user_id = ?`).all(userId);
    } catch { /* if table doesn't exist yet */ }
    
    const profile = db.prepare(`SELECT user_id, full_name, email, language_preference, is_pregnant, gestational_weeks, due_date FROM user_profile WHERE user_id = ?`).get(userId);

    return {
      status: 'success',
      userId,
      syncedAt: new Date().toISOString(),
      serverData: {
        profile,
        vitals,
        journalEntries,
        schedules
      }
    };
  }
}
