import { createClient } from '@supabase/supabase-js'

// Vite only exposes environment variables that start with `VITE_`.
// These are client-safe Supabase values: the publishable key is expected to be
// visible in the browser, while Row Level Security protects the database.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Fail during app startup if the project is missing configuration. This makes
// misconfigured environments obvious instead of causing confusing query errors.
if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Missing Supabase environment variables')
}

// A single shared client keeps auth/session state and query behavior consistent
// across all services and React components.
export const supabase = createClient(supabaseUrl, supabasePublishableKey)
