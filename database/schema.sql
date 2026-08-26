-- PostgreSQL / Supabase Migration Schema for The Guided Health Companion

-- Enable Vector Extension for RAG Embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL,
    full_name TEXT,
    language_preference TEXT DEFAULT 'twi' CHECK (language_preference IN ('twi', 'english')),
    is_pregnant BOOLEAN DEFAULT FALSE,
    gestational_weeks INT DEFAULT 0,
    due_date DATE,
    child_birth_date DATE,
    emergency_contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ghanaian Herbal-Drug-Food Interaction Matrix Table
CREATE TABLE IF NOT EXISTS herbal_drug_matrix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    herb_name TEXT NOT NULL,
    herb_local_names TEXT[], -- e.g. ['Nibima', 'Cryptolepis', 'Yellow dye root']
    pharma_drug_name TEXT NOT NULL, -- e.g. 'Iron Supplement'
    food_item TEXT, -- e.g. 'Milk / Dairy'
    severity TEXT NOT NULL CHECK (severity IN ('SAFE', 'CAUTION', 'DANGER')),
    interaction_details TEXT NOT NULL,
    cultural_advice_twi TEXT NOT NULL,
    cultural_advice_english TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Offline Triage Decision Tree Rules Table
CREATE TABLE IF NOT EXISTS triage_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symptom_key TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL, -- 'maternal', 'infant', 'general'
    symptom_name_english TEXT NOT NULL,
    symptom_name_twi TEXT NOT NULL,
    severity_level TEXT NOT NULL CHECK (severity_level IN ('MILD', 'MODERATE', 'HIGH')),
    is_red_flag BOOLEAN DEFAULT FALSE,
    emergency_action_twi TEXT NOT NULL,
    emergency_action_english TEXT NOT NULL,
    hospital_referral_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Vitals Logging Table
CREATE TABLE IF NOT EXISTS vitals_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    systolic_bp INT,
    diastolic_bp INT,
    body_temperature DECIMAL(4,1),
    pulse_rate INT,
    blood_glucose DECIMAL(5,1),
    weight_kg DECIMAL(5,1),
    vital_status TEXT CHECK (vital_status IN ('NORMAL', 'ELEVATED', 'HIGH_WARNING')),
    notes TEXT,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Health Journal Table
CREATE TABLE IF NOT EXISTS health_journal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    entry_date DATE DEFAULT CURRENT_DATE,
    symptoms_noted TEXT[],
    mood TEXT,
    notes_text TEXT,
    audio_note_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Maternal & Immunization Schedules Table
CREATE TABLE IF NOT EXISTS maternal_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('anc_visit', 'child_immunization')),
    title_english TEXT NOT NULL,
    title_twi TEXT NOT NULL,
    description_english TEXT,
    description_twi TEXT,
    due_date DATE NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    vaccine_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Medication Reminders Table
CREATE TABLE IF NOT EXISTS medication_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency_per_day INT DEFAULT 1,
    reminder_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_taken_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Maternal & Infant Q&A Knowledge Base (pgvector)
CREATE TABLE IF NOT EXISTS knowledge_qa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_english TEXT NOT NULL,
    question_twi TEXT NOT NULL,
    answer_english TEXT NOT NULL,
    answer_twi TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT[],
    embedding vector(768), -- Gemini Text Embedding Dimensions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Chat History Table
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_query_raw TEXT NOT NULL,
    user_query_twi TEXT,
    ai_response_english TEXT NOT NULL,
    ai_response_twi TEXT NOT NULL,
    audio_response_url TEXT,
    source TEXT DEFAULT 'rag' CHECK (source IN ('rag', 'offline_rule', 'fallback')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index Definitions
CREATE INDEX IF NOT EXISTS idx_vitals_user ON vitals_logs(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_user ON health_journal(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_schedules_user ON maternal_schedules(user_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON medication_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_category ON knowledge_qa(category);
