-- Offline SQLite Schema for The Guided Health Companion (Patient App)

CREATE TABLE IF NOT EXISTS user_profile (
    user_id TEXT PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    password_hash TEXT,
    language_preference TEXT DEFAULT 'twi',
    is_pregnant INTEGER DEFAULT 0,
    gestational_weeks INTEGER DEFAULT 0,
    due_date TEXT,
    child_birth_date TEXT,
    emergency_contact_phone TEXT,
    primary_contact_name TEXT,
    primary_contact_phone TEXT,
    relationship TEXT,
    secondary_contact_name TEXT,
    secondary_contact_phone TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS herbal_drug_matrix (
    id TEXT PRIMARY KEY,
    herb_name TEXT NOT NULL,
    herb_aliases TEXT, -- JSON array string
    pharma_drug_name TEXT NOT NULL,
    food_item TEXT,
    severity TEXT NOT NULL, -- SAFE, CAUTION, DANGER
    interaction_details TEXT NOT NULL,
    cultural_advice_twi TEXT NOT NULL,
    cultural_advice_english TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS triage_rules (
    symptom_key TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    symptom_name_english TEXT NOT NULL,
    symptom_name_twi TEXT NOT NULL,
    severity_level TEXT NOT NULL,
    is_red_flag INTEGER DEFAULT 0,
    emergency_action_twi TEXT NOT NULL,
    emergency_action_english TEXT NOT NULL,
    hospital_referral_required INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vitals_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    systolic_bp INTEGER,
    diastolic_bp INTEGER,
    body_temperature REAL,
    pulse_rate INTEGER,
    blood_glucose REAL,
    weight_kg REAL,
    vital_status TEXT,
    notes TEXT,
    logged_at TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending' -- 'pending', 'synced'
);

CREATE TABLE IF NOT EXISTS health_journal (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    entry_date TEXT NOT NULL,
    symptoms_noted TEXT, -- JSON array string
    mood TEXT,
    notes_text TEXT,
    audio_note_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS maternal_schedules (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    schedule_type TEXT NOT NULL, -- 'anc_visit', 'child_immunization'
    title_english TEXT NOT NULL,
    title_twi TEXT NOT NULL,
    description_english TEXT,
    description_twi TEXT,
    due_date TEXT NOT NULL,
    is_completed INTEGER DEFAULT 0,
    completed_at TEXT,
    vaccine_code TEXT,
    sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS medication_reminders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency_per_day INTEGER DEFAULT 1,
    reminder_time TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    last_taken_at TEXT,
    sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    reminder_type TEXT DEFAULT 'MEDICATION', -- 'MEDICATION', 'ANC_VISIT', 'IMMUNIZATION', 'VITALS_LOG'
    scheduled_time TEXT NOT NULL,
    recurrence TEXT DEFAULT 'DAILY', -- 'ONCE', 'DAILY', 'WEEKLY'
    dosage_info TEXT,
    is_active INTEGER DEFAULT 1,
    is_completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS offline_knowledge_qa (
    id TEXT PRIMARY KEY,
    question_english TEXT NOT NULL,
    question_twi TEXT NOT NULL,
    answer_english TEXT NOT NULL,
    answer_twi TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT -- JSON array string
);

CREATE TABLE IF NOT EXISTS chat_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_query TEXT NOT NULL,
    answer_english TEXT NOT NULL,
    answer_twi TEXT NOT NULL,
    source TEXT NOT NULL,
    category TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pending_sync_queue (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    payload TEXT NOT NULL, -- JSON payload
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accredited_pharmacies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    district TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    address TEXT NOT NULL,
    has_delivery INTEGER DEFAULT 0,
    is_open_now INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS prescription_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    pharmacy_id TEXT NOT NULL,
    pharmacy_name TEXT,
    prescription_details TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    file_attached INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PROCESSING',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS hospital_appointments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    facility_name TEXT NOT NULL,
    appointment_type TEXT NOT NULL, -- 'IN_PERSON', 'VIRTUAL'
    requested_date TEXT NOT NULL,
    status TEXT DEFAULT 'CONFIRMED',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);


