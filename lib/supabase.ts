import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Server-only Supabase client using the service role key.
 * Never import this from client components.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }

  client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export type ApiKeyRow = {
  id: string;
  key_secret: string;
  user_email: string;
  quota_total: number;
  upstream_token_id: number;
  created_at: string;
};

export type OrderRow = {
  id: string;
  stripe_session_id: string;
  user_email: string;
  amount_usd: number;
  quota_granted: number;
  key_secret: string;
  is_topup: boolean;
  created_at: string;
};
