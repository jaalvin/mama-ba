# Mama Ba — Offline-First Maternal Health Companion

Mama Ba is a full-stack maternal health platform built for Ghanaian mothers and caregivers.  
It combines **offline-safe core care features** with **cloud AI enhancements** to deliver practical guidance in **English and Twi**.

## Why this project matters

- Supports pregnancy and early motherhood in low-connectivity environments
- Blends local context, clinical caution, and culturally relevant language
- Ships as a mobile-friendly PWA with reminders, voice support, and care tracking

## What it does

- **AI Q&A (Twi + English)** with offline fallback guidance
- **Symptom triage** for red-flag maternal/infant cases
- **Herbal + drug + food safety checks** for pregnancy
- **Vitals logging & health journal** with risk classification
- **ANC and immunization schedules** with progress tracking
- **Medication and appointment reminders** with push notifications
- **Care logistics** (pharmacies, prescription support, appointments)
- **Offline sync pipeline** (local SQLite <-> cloud sync)

## How it was built

### Backend
- Node.js + Express + TypeScript
- SQLite (`better-sqlite3`) for local/offline persistence
- Supabase for cloud sync/auth data paths
- Gemini/Groq/Khaya/Abena integrations for language, speech, and AI responses
- Web push scheduling with cron + VAPID

### Frontend
- React + Vite + React Router
- PWA setup (`vite-plugin-pwa`) + custom service worker
- Local-first storage patterns for resilient UX

## Architecture at a glance

```text
React PWA (frontend/)
  -> /api/v1/* (Express backend)
      -> SQLite (offline canonical local state)
      -> Supabase (optional cloud sync)
      -> AI services (Gemini/Groq/Khaya/Abena) with fallbacks
```

## Project structure

```text
/home/runner/work/mama-ba/mama-ba
├─ src/                 # Express app, routes, services
├─ frontend/            # React PWA client
├─ database/            # SQLite schema, seed script, seed datasets
├─ sdk/                 # Typed API client (LilyApiClient)
├─ tests/               # Vitest + Supertest coverage
├─ openapi.json         # API specification (partial)
└─ render.yaml          # Deployment config
```

## Run locally

### 1) Install
```bash
npm install
npm --prefix frontend install
```

### 2) Configure environment
Copy and edit:

`/home/runner/work/mama-ba/mama-ba/.env.example`

### 3) Seed local database
```bash
npm run seed
```

### 4) Start development
Backend:
```bash
npm run dev
```

Frontend (separate terminal):
```bash
npm run dev:frontend
```

### 5) Build production bundle
```bash
npm run build
```

## API quick start

Base URL: `http://localhost:3000/api/v1`

- `GET /health`
- `POST /chat/query`
- `POST /triage/evaluate`
- `POST /herbal-safety/check`
- `POST /vitals/log`
- `POST /maternal/anc-schedule`
- `GET /sync/bundle`

Docs and playground:
- `GET /docs`
- `GET /openapi.json`

## Testing

```bash
npm test
```

## Recruiter snapshot

This project demonstrates:
- end-to-end product execution (backend, frontend, SDK, data model)
- offline-first systems thinking
- practical healthcare workflow design
- multilingual voice + AI integration
- deployable architecture with real-world constraints in mind

## Medical disclaimer

Mama Ba provides educational and support guidance only; it is not a medical diagnosis tool.
