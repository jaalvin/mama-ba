# Mama Ba

**Mama Ba ("The Guided Health Companion")** is an offline-first Progressive Web Application (PWA) delivering culturally grounded, dual-language (English and Asante Twi) maternal health guidance for Ghanaian mothers and caregivers.

---

## Key Features

* **Dual-Language Voice AI:** Spoken and text consultations in Asante Twi and Ghanaian English via Khaya AI (ASR/TTS) and Gemini 2.5 Flash with structured 4-stage clinical responses.


* **Offline Herbal-Drug Matrix:** Instant, on-device SQLite lookup for interactions between traditional botanicals (*Taabea*, *Nibima*, *Moringa*) and antenatal pharmaceuticals (iron, amlodipine, ACTs).


* **Deterministic Symptom Triage:** Evaluates symptoms locally into Mild, Moderate, or Critical tiers with emergency hotline prompts (`112` / `193`).


* **Vitals Tracker & Analytics:** Logs blood pressure, temperature, blood sugar, and weight with 24-hour delta calculations and multi-timeframe Canvas trend graphs.


* **Maternal Timelines:** Implements Ghana Health Service (GHS) 8-visit antenatal protocols and national pediatric immunization (EPI) schedules.


* **Care Logistics:** Community pharmacy directory and clinical appointment scheduling interface.



---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, HTML5 Canvas|
| **Offline Runtime** | Workbox Service Worker, PWA Manifest, LocalStorage|
| **Edge Storage** | SQLite (`better-sqlite3`, pre-seeded `lily_offline.db`)|
| **Backend** | Node.js, Express, TypeScript|
| **Cloud Database** | Supabase (PostgreSQL with `pgvector`)|
| **Speech & AI** | Khaya AI (ASR/TTS), Abena AI, Google Gemini 2.5 Flash|

---

## Project Structure

```text
jaalvin/mama-ba/
├── database/            # SQLite & Supabase SQL schemas, seed JSON datasets
├── frontend/            # React 18 + Vite client source code
├── public/app/          # Offline PWA runtime (service workers, bundled assets)
├── sdk/                 # TypeScript client library (lilyClient.ts) and shared types
├── src/                 # Express backend API (routes, controllers, RAG services)
├── tests/               # Unit and integration test suites
├── lily_offline.db      # Pre-seeded local SQLite database
├── openapi.json         # API specifications
└── render.yaml          # Cloud deployment blueprint

```

---

## Quickstart

### 1. Clone & Install

```bash
git clone https://github.com/jaalvin/mama-ba.git
cd mama-ba
npm install

```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
PORT=5000
SQLITE_DB_PATH=./lily_offline.db
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-key
GEMINI_API_KEY=your-gemini-api-key
KHAYA_API_KEY=your-khaya-api-key
KHAYA_API_BASE_URL=https://translation-api.ghananlp.org

```

### 3. Run Application

```bash
# Start backend server
npm run dev

# Start frontend (in a separate terminal)
cd frontend
npm install
npm run dev

```

### 4. Run Tests

```bash
npm test

```

---

## Core API Endpoints

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/api/v1/chat/asr` | Transcribes 16kHz audio buffer to text (Twi/English)|
| `POST` | `/api/v1/chat/query` | Executes RAG clinical consultation prompt|
| `POST` | `/api/v1/chat/tts` | Synthesizes neural Asante Twi audio|
| `POST` | `/api/v1/herbal/check` | Evaluates botanical-drug contraindications offline|
| `POST` | `/api/v1/triage/evaluate` | Evaluates symptom inputs against risk rules offline|
| `POST` | `/api/v1/vitals/log` | Records vitals and computes daily deltas|
| `POST` | `/api/v1/sync/push` | Synchronizes queued offline mutations to cloud Supabase|

 

---

## Medical Disclaimer

Mama Ba is an educational companion and health-tracking utility. It does not provide autonomous clinical prescriptions or replace licensed medical practitioners. Severe symptoms trigger immediate emergency referral to facility care or the National Ambulance Service (`112` / `193`).
