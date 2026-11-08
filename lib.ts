import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// true only when both Netlify env vars are set
export const configured = Boolean(url && key)

export const supabase = createClient(url || 'https://missing.supabase.co', key || 'missing-key')

// Users log in with a USERNAME. Behind the scenes it becomes this fake email.
// (Must match the domain used in SYMBIOTES_AUTH_UPGRADE.sql)
export const AUTH_DOMAIN = 'symbiotes.app'
export const toEmail = (identifier: string) => {
  const v = identifier.trim().toLowerCase()
  return v.includes('@') ? v : `${v}@${AUTH_DOMAIN}`
}
