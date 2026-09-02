import fs from 'fs';
import path from 'path';
import { getOfflineDb } from '../config';
import { supabaseAdmin } from '../lib/supabaseAdmin';

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
   * Process offline queue payloads uploaded from client when network returns.
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
      this.syncToSupabase('vitals_logs', payload.vitals);
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
      this.syncToSupabase('health_journal', payload.journalEntries);
    }

    // Process reminders / medications
    if (payload.reminders && Array.isArray(payload.reminders)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO reminders
        (id, user_id, title, reminder_type, scheduled_time, recurrence, dosage_info, is_active, is_completed, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
      `);

      for (const r of payload.reminders) {
        stmt.run(
          r.id || `rem-${Date.now()}`,
          payload.userId,
          r.title || r.label || 'Medication',
          r.reminderType || r.reminder_type || 'MEDICATION',
          r.scheduledTime || r.scheduled_time || r.time || '08:00',
          r.recurrence || 'DAILY',
          r.dosageInfo || r.dosage_info || null,
          r.isActive !== undefined ? (r.isActive ? 1 : 0) : 1,
          r.isCompleted !== undefined ? (r.isCompleted ? 1 : 0) : 0
        );
        processedCount++;
      }
      this.syncToSupabase('reminders', payload.reminders);
    }

    return {
      status: 'success',
      userId: payload.userId,
      itemsProcessed: processedCount,
      syncedAt: new Date().toISOString()
    };
  }

  /**
   * Helper to push records to Supabase asynchronously without blocking local DB operations.
   */
  private static async syncToSupabase(table: string, records: any[]) {
    try {
      if (supabaseAdmin && records && records.length > 0) {
        await supabaseAdmin.from(table).upsert(records);
      }
    } catch { /* non-blocking background sync */ }
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
    let reminders: any[] = [];
    try {
      reminders = db.prepare(`SELECT * FROM reminders WHERE user_id = ? ORDER BY scheduled_time ASC`).all(userId);
    } catch { /* fallback */ }
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
        reminders,
        schedules
      }
    };
  }
}
