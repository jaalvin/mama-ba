import { describe, it, expect, beforeAll } from 'vitest';
import { RemindersService } from '../src/services/remindersService';
import { seedDatabase } from '../database/seed';

describe('RemindersService - Care & Medication Reminders', () => {
  beforeAll(() => {
    seedDatabase();
  });

  it('should create a medication reminder', async () => {
    const res = await RemindersService.createReminder({
      userId: 'test-user-001',
      title: 'Prenatal Iron & Folic Acid',
      reminderType: 'MEDICATION',
      scheduledTime: '14:00',
      recurrence: 'DAILY',
      dosageInfo: '1 Tablet after lunch'
    });

    expect(res).toBeDefined();
    expect(res.id).toMatch(/^rem-/);
    expect(res.title).toBe('Prenatal Iron & Folic Acid');
    expect(res.dosageInfo).toBe('1 Tablet after lunch');
  });

  it('should fetch user reminders', async () => {
    const list = await RemindersService.getUserReminders('test-user-001');
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].title).toBe('Prenatal Iron & Folic Acid');
  });

  it('should toggle reminder completion', async () => {
    const list = await RemindersService.getUserReminders('test-user-001');
    const id = list[0].id;

    const updated = await RemindersService.toggleReminder(id, { isCompleted: true }) as any;
    expect(updated).toBeDefined();
    expect(updated.is_completed).toBe(1);
  });

  it('should delete a reminder', async () => {
    const created = await RemindersService.createReminder({
      userId: 'test-user-delete',
      title: 'Temp Reminder',
      scheduledTime: '08:00'
    });

    const delRes = await RemindersService.deleteReminder(created.id);
    expect(delRes.success).toBe(true);

    const list = await RemindersService.getUserReminders('test-user-delete');
    expect(list.length).toBe(0);
  });
});
