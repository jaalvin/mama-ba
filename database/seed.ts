import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'lily_offline.db');
const SQLITE_SCHEMA_PATH = path.join(process.cwd(), 'database/sqlite_schema.sql');

export function seedDatabase() {
  console.log(`[Seed] Initializing SQLite database at: ${DB_PATH}`);
  const db = new Database(DB_PATH);

  // Enable WAL mode & foreign keys
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Read and execute schema
  const schemaSql = fs.readFileSync(SQLITE_SCHEMA_PATH, 'utf8');
  db.exec(schemaSql);

  // Column migration safety check for existing SQLite databases on disk
  try { db.exec(`ALTER TABLE user_profile ADD COLUMN email TEXT;`); } catch (_) {}
  try { db.exec(`ALTER TABLE user_profile ADD COLUMN password_hash TEXT;`); } catch (_) {}
  try { db.exec(`ALTER TABLE user_profile ADD COLUMN primary_contact_name TEXT;`); } catch (_) {}
  try { db.exec(`ALTER TABLE user_profile ADD COLUMN primary_contact_phone TEXT;`); } catch (_) {}
  try { db.exec(`ALTER TABLE user_profile ADD COLUMN relationship TEXT;`); } catch (_) {}
  try { db.exec(`ALTER TABLE user_profile ADD COLUMN secondary_contact_name TEXT;`); } catch (_) {}
  try { db.exec(`ALTER TABLE user_profile ADD COLUMN secondary_contact_phone TEXT;`); } catch (_) {}

  console.log('[Seed] SQLite Schema created successfully.');

  // 1. Seed Herbal Matrix
  const herbalData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'database/seed_data/herbal_matrix.json'), 'utf8')
  );
  const insertHerbal = db.prepare(`
    INSERT OR REPLACE INTO herbal_drug_matrix 
    (id, herb_name, herb_aliases, pharma_drug_name, food_item, severity, interaction_details, cultural_advice_twi, cultural_advice_english)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of herbalData) {
    insertHerbal.run(
      item.id,
      item.herb_name,
      JSON.stringify(item.herb_aliases || []),
      item.pharma_drug_name,
      item.food_item || null,
      item.severity,
      item.interaction_details,
      item.cultural_advice_twi,
      item.cultural_advice_english
    );
  }
  console.log(`[Seed] Seeded ${herbalData.length} Herbal Safety Matrix records.`);

  // 2. Seed Triage Rules
  const triageData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'database/seed_data/triage_rules.json'), 'utf8')
  );
  const insertTriage = db.prepare(`
    INSERT OR REPLACE INTO triage_rules
    (symptom_key, category, symptom_name_english, symptom_name_twi, severity_level, is_red_flag, emergency_action_twi, emergency_action_english, hospital_referral_required)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const rule of triageData) {
    insertTriage.run(
      rule.symptom_key,
      rule.category,
      rule.symptom_name_english,
      rule.symptom_name_twi,
      rule.severity_level,
      rule.is_red_flag ? 1 : 0,
      rule.emergency_action_twi,
      rule.emergency_action_english,
      rule.hospital_referral_required ? 1 : 0
    );
  }
  console.log(`[Seed] Seeded ${triageData.length} Triage Rules records.`);

  // 3. Seed Q&A Knowledge Base
  const qaData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'database/seed_data/maternal_qa_dataset.json'), 'utf8')
  );
  const insertQa = db.prepare(`
    INSERT OR REPLACE INTO offline_knowledge_qa
    (id, question_english, question_twi, answer_english, answer_twi, category, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const qa of qaData) {
    insertQa.run(
      qa.id || qa.qa_id,
      qa.question_english,
      qa.question_twi,
      qa.answer_english,
      qa.answer_twi,
      qa.category,
      JSON.stringify(qa.tags || [])
    );
  }
  console.log(`[Seed] Seeded ${qaData.length} Offline Q&A Knowledge Base records.`);

  // 4. Seed Default Demo User Profile (Preserve User Changes if existing)
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO user_profile
    (user_id, full_name, language_preference, is_pregnant, gestational_weeks, due_date, emergency_contact_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertUser.run(
    'demo-patient-001',
    'Abena Osei',
    'twi',
    1,
    24,
    '2026-11-20',
    '+233244123456'
  );
  console.log('[Seed] Seeded Demo User Profile (Abena Osei).');

  // 5. Seed Accredited Pharmacies
  const pharmacies = [
    { id: 'pharm-01', name: 'Ernest Chemists - Osu Branch', region: 'Greater Accra', district: 'Accra Metro', phone_number: '+233302773489', address: 'Oxford Street, Osu, Accra', has_delivery: 1, is_open_now: 1 },
    { id: 'pharm-02', name: 'Top Up Pharmacy - East Legon', region: 'Greater Accra', district: 'Ayawaso West', phone_number: '+233302543210', address: 'Lagos Avenue, East Legon, Accra', has_delivery: 1, is_open_now: 1 },
    { id: 'pharm-03', name: 'Kama Health Services - Adum', region: 'Ashanti', district: 'Kumasi Metro', phone_number: '+233322022345', address: 'Prempeh II Street, Adum, Kumasi', has_delivery: 1, is_open_now: 1 },
    { id: 'pharm-04', name: 'M&G Pharmaceuticals - Bantama', region: 'Ashanti', district: 'Bantama', phone_number: '+233322033890', address: 'High Street, Bantama, Kumasi', has_delivery: 0, is_open_now: 1 },
    { id: 'pharm-05', name: 'Tamale Central Community Pharmacy', region: 'Northern', district: 'Tamale Metro', phone_number: '+233372021122', address: 'Hospital Road, Tamale', has_delivery: 1, is_open_now: 1 }
  ];

  const insertPharm = db.prepare(`
    INSERT OR REPLACE INTO accredited_pharmacies
    (id, name, region, district, phone_number, address, has_delivery, is_open_now)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const p of pharmacies) {
    insertPharm.run(p.id, p.name, p.region, p.district, p.phone_number, p.address, p.has_delivery, p.is_open_now);
  }
  console.log(`[Seed] Seeded ${pharmacies.length} Accredited Pharmacies.`);

  // 6. Seed Medication Reminders
  const reminders = [
    { id: 'rem-01', user_id: 'demo-patient-001', medication_name: 'Iron & Folic Acid Tablet', dosage: '1 tablet daily', frequency_per_day: 1, reminder_time: '14:00', is_active: 1 },
    { id: 'rem-02', user_id: 'demo-patient-001', medication_name: 'Calcium Supplement', dosage: '1 tablet daily', frequency_per_day: 1, reminder_time: '08:00', is_active: 1 },
    { id: 'rem-03', user_id: 'demo-patient-001', medication_name: 'Prenatal Multivitamin', dosage: '1 tablet after breakfast', frequency_per_day: 1, reminder_time: '09:00', is_active: 1 }
  ];

  const insertRem = db.prepare(`
    INSERT OR REPLACE INTO medication_reminders
    (id, user_id, medication_name, dosage, frequency_per_day, reminder_time, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const r of reminders) {
    insertRem.run(r.id, r.user_id, r.medication_name, r.dosage, r.frequency_per_day, r.reminder_time, r.is_active);
  }
  console.log(`[Seed] Seeded ${reminders.length} Medication Reminders.`);

  db.close();
  console.log('[Seed] Database Seeding Complete.');
}

if (require.main === module) {
  seedDatabase();
}
