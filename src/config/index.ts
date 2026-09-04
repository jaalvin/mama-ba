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
  ABENA_KEY_1: process.env.ABENA_KEY_1 || 'sk_665b78f24cb24ccab5439a267fc20d71',
  ABENA_KEY_2: process.env.ABENA_KEY_2 || 'sk_bf28e7963f0b46ff8a3d04503b3ef15f',
  ABENA_KEY_3: process.env.ABENA_KEY_3 || 'sk_6cbd8b6200b1495a8c99917e146b7bc4',
  ABENA_KEY_4: process.env.ABENA_KEY_4 || 'sk_8386b2043ef1415aa8f36e40f959cc5f',
  ABENA_KEY_5: process.env.ABENA_KEY_5 || 'sk_e2812cf49744446f9377040095eebecc',
  ABENA_KEY_6: process.env.ABENA_KEY_6 || 'sk_f43c5bf516e84e038f7b955f77d667bd',
  ABENA_KEY_7: process.env.ABENA_KEY_7 || 'sk_d953bf290d394798baa9882dc82d95f5',
  ABENA_KEY_8: process.env.ABENA_KEY_8 || 'sk_6e293b7a2f92431a85a40814a211abcb',
  ABENA_KEY_9: process.env.ABENA_KEY_9 || 'sk_48aa846f571a4786a04e363a8cd4ac22',
  ABENA_KEY_10: process.env.ABENA_KEY_10 || 'sk_da1bc3b2bbf340dd8d6482dacccf4e52',
  ABENA_KEY_11: process.env.ABENA_KEY_11 || 'sk_7b0d216cd3d64d288d05833a06930082',
  ABENA_KEY_12: process.env.ABENA_KEY_12 || 'sk_8c58e1df8a6c43dfb7f890524e0c4158',
  ABENA_API_KEY: process.env.ABENA_API_KEY || 'sk_665b78f24cb24ccab5439a267fc20d71',
  ABENA_FALLBACK_API_KEY: process.env.ABENA_FALLBACK_API_KEY || 'sk_bf28e7963f0b46ff8a3d04503b3ef15f',
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
