/**
 * supabase.ts
 * -----------
 * Initialises the Supabase browser client for use throughout the React app.
 *
 * Environment variables (set in frontend/.env):
 *   VITE_SUPABASE_URL      — your Supabase project URL
 *   VITE_SUPABASE_ANON_KEY — your Supabase anon (public) key
 *
 * The anon key is safe to expose in the browser because Row Level Security
 * (RLS) policies enforce per-user data access at the database level.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
    'Copy frontend/.env.example to frontend/.env and fill in your credentials.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Persist session in localStorage so farmers stay logged in
    // even after closing the browser tab on their phone.
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
  },
})

export type { Session, User } from '@supabase/supabase-js'
