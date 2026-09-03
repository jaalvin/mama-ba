import app from './app';
import { CONFIG } from './config';
import { seedDatabase } from '../database/seed';
import { runPushSchedulerTick } from './services/pushService';
import cron from 'node-cron';
import fs from 'fs';

// Auto-seed local SQLite database if not yet present
if (!fs.existsSync(CONFIG.DB_PATH)) {
  console.log('[Server] Local SQLite DB not found. Triggering automatic database seeding...');
  seedDatabase();
}

const PORT = CONFIG.PORT;

app.listen(PORT, () => {
  console.log(`
  =============================================================
   🚀 The Guided Health Companion Backend Server Is Running
   📍 Port: ${PORT}
   🌍 Environment: ${CONFIG.NODE_ENV}
   🩺 Medical Disclaimer: Active (X-Medical-Disclaimer)
   💾 Database Path: ${CONFIG.DB_PATH}
   🔗 Health Check: http://localhost:${PORT}/api/v1/health
  =============================================================
  `);

  // ── Start Web Push Reminder Scheduler (fires every minute) ────────────────
  cron.schedule('* * * * *', () => {
    runPushSchedulerTick().catch(err =>
      console.error('[PushScheduler] Tick error:', err)
    );
  });
  console.log('[PushScheduler] ✅ Push reminder cron started (every minute)');
});

