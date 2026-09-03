import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://oiyxwlvrpiykbxvbyqjg.supabase.co";

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9peXh3bHZycGl5a2J4dmJ5cWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMzg3MDMsImV4cCI6MjEwMzkxNDcwM30.V2Tf61XRXBLCpSDICDscWPQNB8-AxuwvA0YG_fyHLio";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
