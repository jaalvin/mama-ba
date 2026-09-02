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
  ABENA_API_KEY: process.env.ABENA_API_KEY || '',
  ABENA_FALLBACK_API_KEY: process.env.ABENA_FALLBACK_API_KEY || '',
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
