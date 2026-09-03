import { getOfflineDb } from '../config';
import { supabaseAdmin } from '../lib/supabaseAdmin';

export interface ReminderItem {
  id?: string;
  userId: string;
  title: string;
  reminderType?: 'MEDICATION' | 'ANC_VISIT' | 'IMMUNIZATION' | 'VITALS_LOG';
  scheduledTime: string;
  recurrence?: 'ONCE' | 'DAILY' | 'WEEKLY';
  dosageInfo?: string;
  isActive?: boolean;
  isCompleted?: boolean;
}

export class RemindersService {
  /**
   * Create a new reminder.
   */
  static async createReminder(item: ReminderItem) {
    const db = getOfflineDb();
    const id = item.id || `rem-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const userId = item.userId || 'demo-patient-001';
    const stmt = db.prepare(`
      INSERT INTO reminders
      (id, user_id, title, reminder_type, scheduled_time, recurrence, dosage_info, is_active, is_completed, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
    `);

    stmt.run(
      id,
      userId,
      item.title,
      item.reminderType || 'MEDICATION',
      item.scheduledTime,
      item.recurrence || 'DAILY',
      item.dosageInfo || null,
      item.isActive !== undefined ? (item.isActive ? 1 : 0) : 1,
      item.isCompleted !== undefined ? (item.isCompleted ? 1 : 0) : 0
    );

    // Sync to Supabase Cloud Postgres
    try {
      if (supabaseAdmin) {
        try {
          await supabaseAdmin.from('reminders').upsert({
            id,
            user_id: userId,
            title: item.title,
            reminder_type: item.reminderType || 'MEDICATION',
            scheduled_time: item.scheduledTime,
            recurrence: item.recurrence || 'DAILY',
            is_active: item.isActive ?? true,
            is_completed: item.isCompleted ?? false,
          });
        } catch { /* ignore */ }
      }
    } catch {}

    return {
      id,
      userId: item.userId || 'demo-patient-001',
      title: item.title,
      reminderType: item.reminderType || 'MEDICATION',
      scheduledTime: item.scheduledTime,
      recurrence: item.recurrence || 'DAILY',
      dosageInfo: item.dosageInfo,
      isActive: item.isActive ?? true,
      isCompleted: item.isCompleted ?? false,
      message: 'Reminder created successfully'
    };
  }

  /**
   * Get all active reminders for a user from Supabase Cloud / local cache.
   */
  static async getUserReminders(userId: string) {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('reminders')
          .select('*')
          .eq('user_id', userId)
          .order('scheduled_time', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map(r => ({
            id: r.id,
            userId: r.user_id,
            title: r.title,
            reminderType: r.reminder_type,
            scheduledTime: r.scheduled_time,
            recurrence: r.recurrence,
            dosageInfo: r.dosage_info,
            isActive: Boolean(r.is_active),
            isCompleted: Boolean(r.is_completed),
            createdAt: r.created_at
          }));
        }
      } catch { /* fallback */ }
    }

    const db = getOfflineDb();
    const stmt = db.prepare(`SELECT * FROM reminders WHERE user_id = ? ORDER BY scheduled_time ASC`);
    const rows = stmt.all(userId) as any[];

    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      reminderType: r.reminder_type,
      scheduledTime: r.scheduled_time,
      recurrence: r.recurrence,
      dosageInfo: r.dosage_info,
      isActive: Boolean(r.is_active),
      isCompleted: Boolean(r.is_completed),
      createdAt: r.created_at
    }));
  }

  /**
   * Toggle completion or active status of a reminder in local DB & Supabase Cloud.
   */
  static async toggleReminder(id: string, updates: { isCompleted?: boolean; isActive?: boolean }) {
    const db = getOfflineDb();
    if (updates.isCompleted !== undefined) {
      const stmt = db.prepare(`UPDATE reminders SET is_completed = ?, sync_status = 'pending' WHERE id = ?`);
      stmt.run(updates.isCompleted ? 1 : 0, id);
    }
    if (updates.isActive !== undefined) {
      const stmt = db.prepare(`UPDATE reminders SET is_active = ?, sync_status = 'pending' WHERE id = ?`);
      stmt.run(updates.isActive ? 1 : 0, id);
    }

    if (supabaseAdmin) {
      try {
        const suPayload: any = {};
        if (updates.isCompleted !== undefined) suPayload.is_completed = updates.isCompleted;
        if (updates.isActive !== undefined) suPayload.is_active = updates.isActive;
        await supabaseAdmin.from('reminders').update(suPayload).eq('id', id);
      } catch { /* ignore */ }
    }

    const fetchStmt = db.prepare(`SELECT * FROM reminders WHERE id = ?`);
    return fetchStmt.get(id);
  }

  /**
   * Delete a reminder from local DB & Supabase Cloud.
   */
  static async deleteReminder(id: string) {
    const db = getOfflineDb();
    const stmt = db.prepare(`DELETE FROM reminders WHERE id = ?`);
    stmt.run(id);

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('reminders').delete().eq('id', id);
      } catch { /* ignore */ }
    }

    return { success: true, id };
  }
}
