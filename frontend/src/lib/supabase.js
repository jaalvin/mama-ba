import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://oiyxwlvrpiykbxvbyqjg.supabase.co";

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_YyfXX6eXmX-qYx4QG3Hc8w_3UG69zXI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
