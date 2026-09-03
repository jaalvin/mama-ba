import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "https://oiyxwlvrpiykbxvbyqjg.supabase.co";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9peXh3bHZycGl5a2J4dmJ5cWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMzg3MDMsImV4cCI6MjEwMzkxNDcwM30.V2Tf61XRXBLCpSDICDscWPQNB8-AxuwvA0YG_fyHLio";

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
