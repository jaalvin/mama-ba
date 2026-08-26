import fs from 'fs';
import path from 'path';
import { getOfflineDb } from '../config';

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

export class MaternalService {
  /**
   * Generate customized GHS Antenatal Care (ANC) visit timeline based on due date or gestational age.
   */
  static generateANCSchedule(gestationalWeeks: number = 8, dueDateString?: string): ANCScheduleItem[] {
    const rawData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../database/seed_data/maternal_care_schedules.json'), 'utf8')
    );

    const baseDueDate = dueDateString ? new Date(dueDateString) : new Date(Date.now() + (40 - gestationalWeeks) * 7 * 24 * 60 * 60 * 1000);
    const conceptionDate = new Date(baseDueDate.getTime() - 280 * 24 * 60 * 60 * 1000);

    return rawData.anc_visits.map((v: any) => {
      const visitDate = new Date(conceptionDate.getTime() + v.recommended_weeks * 7 * 24 * 60 * 60 * 1000);
      return {
        visitNumber: v.visit_number,
        recommendedWeeks: v.recommended_weeks,
        titleEnglish: v.title_english,
        titleTwi: v.title_twi,
        descriptionEnglish: v.description_english,
        descriptionTwi: v.description_twi,
        dueDate: visitDate.toISOString().split('T')[0],
        isCompleted: gestationalWeeks >= v.recommended_weeks
      };
    });
  }

  /**
   * Generate customized GHS Childhood Immunization timeline based on child's birth date.
   */
  static generateImmunizationSchedule(birthDateString: string): ImmunizationScheduleItem[] {
    const rawData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../database/seed_data/maternal_care_schedules.json'), 'utf8')
    );

    const birthDate = new Date(birthDateString);

    return rawData.immunizations.map((imm: any) => {
      let offsetDays = 0;
      if (imm.age_description_english.includes('Birth')) offsetDays = 0;
      else if (imm.age_description_english.includes('6 Weeks')) offsetDays = 42;
      else if (imm.age_description_english.includes('10 Weeks')) offsetDays = 70;
      else if (imm.age_description_english.includes('9 Months')) offsetDays = 270;

      const scheduleDate = new Date(birthDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);

      return {
        vaccineCode: imm.vaccine_code,
        ageDescriptionEnglish: imm.age_description_english,
        ageDescriptionTwi: imm.age_description_twi,
        titleEnglish: imm.title_english,
        titleTwi: imm.title_twi,
        descriptionEnglish: imm.description_english,
        descriptionTwi: imm.description_twi,
        dueDate: scheduleDate.toISOString().split('T')[0],
        isCompleted: Date.now() > scheduleDate.getTime()
      };
    });
  }

  /**
   * Save maternal care schedule items into local SQLite database.
   */
  static saveScheduleToLocalDb(userId: string, items: Array<{ type: 'anc_visit' | 'child_immunization'; titleEng: string; titleTwi: string; dueDate: string; vaccineCode?: string }>) {
    const db = getOfflineDb();
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO maternal_schedules
      (id, user_id, schedule_type, title_english, title_twi, due_date, vaccine_code)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      const id = `sched-${userId}-${item.type}-${item.dueDate}`;
      insertStmt.run(id, userId, item.type, item.titleEng, item.titleTwi, item.dueDate, item.vaccineCode || null);
    }
  }

  /**
   * Fetch active care schedules for a given patient.
   */
  static getUserSchedules(userId: string) {
    const db = getOfflineDb();
    const stmt = db.prepare(`SELECT * FROM maternal_schedules WHERE user_id = ? ORDER BY due_date ASC`);
    return stmt.all(userId);
  }
}
