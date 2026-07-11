/**
 * Browser-side Supabase client
 * Safe to use in React components, event handlers, and client-side hooks.
 * Uses the publishable (anon) key — safe to expose in the browser.
 */
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const createClient = () =>
  createBrowserClient(supabaseUrl, supabaseKey);
