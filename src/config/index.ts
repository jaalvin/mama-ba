import dotenv from 'dotenv';
import path from 'path';
import Database from 'better-sqlite3';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_FALLBACK_API_KEY: process.env.GEMINI_FALLBACK_API_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  ABENA_KEY_1: process.env.ABENA_KEY_1 || 'sk_99e14864877b47f7a121313b87602aec',
  ABENA_KEY_2: process.env.ABENA_KEY_2 || 'sk_23d2b9e5b24c4ab7ae82bc2dc105491c',
  ABENA_KEY_3: process.env.ABENA_KEY_3 || 'sk_5565023c4fe143f99801f0253823ad0f',
  ABENA_KEY_4: process.env.ABENA_KEY_4 || 'sk_cc319643c820440d9fa26e94be26e140',
  ABENA_KEY_5: process.env.ABENA_KEY_5 || 'sk_b66230787fc54e8ba63b3084a7370521',
  ABENA_KEY_6: process.env.ABENA_KEY_6 || 'sk_a47fce0855e54740887c863fa268e423',
  ABENA_KEY_7: process.env.ABENA_KEY_7 || 'sk_b18d6bafae8a4160bbfc8639a593051e',
  ABENA_KEY_8: process.env.ABENA_KEY_8 || 'sk_062ac4b25cc44479b6eda14e4a0f1f7d',
  ABENA_API_KEY: process.env.ABENA_API_KEY || 'sk_99e14864877b47f7a121313b87602aec',
  ABENA_FALLBACK_API_KEY: process.env.ABENA_FALLBACK_API_KEY || 'sk_23d2b9e5b24c4ab7ae82bc2dc105491c',
  ABENA_API_BASE_URL: process.env.ABENA_API_BASE_URL || 'https://abena.mobobi.com/playground/api/v1',
  KHAYA_MAMA_BA_PRIMARY_KEY: process.env.KHAYA_MAMA_BA_PRIMARY_KEY || '',
  KHAYA_MAMA_BA_SECONDARY_KEY: process.env.KHAYA_MAMA_BA_SECONDARY_KEY || '',
  KHAYA_MB1_PRIMARY_KEY: process.env.KHAYA_MB1_PRIMARY_KEY || '',
  KHAYA_MB1_SECONDARY_KEY: process.env.KHAYA_MB1_SECONDARY_KEY || '',
  KHAYA_API_BASE_URL: process.env.KHAYA_API_BASE_URL || 'https://translation-api.ghananlp.org',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  DB_PATH: process.env.DB_PATH || path.join(process.cwd(), 'lily_offline.db')
};

let sqliteInstance: Database.Database | null = null;

export function getOfflineDb(): Database.Database {
  if (!sqliteInstance) {
    sqliteInstance = new Database(CONFIG.DB_PATH);
    sqliteInstance.pragma('journal_mode = WAL');
    sqliteInstance.pragma('foreign_keys = ON');
  }
  return sqliteInstance;
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseInstance && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) {
    supabaseInstance = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }
  return supabaseInstance;
}
