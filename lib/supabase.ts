import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

/** Browser-safe canonical Supabase client using the same cookie-backed session model as middleware. */
export const supabase = url && publishableKey ? createBrowserClient(url, publishableKey) : null;

export function isSupabaseConfigured(): boolean {
  return !!(url && publishableKey);
}
