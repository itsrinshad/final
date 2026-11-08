import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { configured, supabase, toEmail } from './lib'

export type Profile = { id: string; username: string; display_name: string | null; role: string; status: string }
type Ctx = { session: Session | null; profile: Profile | null; loading: boolean; isAdmin: boolean }
const C = createContext<Ctx>({ session: null, profile: null, loading: true, isAdmin: false })
export const useAuth = () => useContext(C)

// Shared login for the Login page and the Admin page.
// Returns null on success, or an error message to show.
export async function loginWith(identifier: string, password: string, needAdmin: boolean): Promise<string | null> {
  if (!identifier.trim() || !password) return 'Enter your username and password.'
  if (!configured) return 'Site is not connected to Supabase: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify, then redeploy.'
  const { data, error } = await supabase.auth.signInWithPassword({ email: toEmail(identifier), password })
  if (error || !data.user) return error && !/invalid login/i.test(error.message) ? 'Login error: ' + error.message : 'Wrong username or password.'
  const { data: p } = await supabase.from('profiles').select('role,status').eq('id', data.user.id).single()
  const fail = async (m: string) => { await supabase.auth.signOut(); return m }
  if (!p) return fail('Account not found.')
  if (p.status === 'pending') return fail('Your request is still waiting for admin approval.')
  if (p.status === 'banned' || p.status === 'suspended') return fail('This account is ' + p.status + '.')
  if (needAdmin && p.role !== 'admin' && p.role !== 'super_admin') return fail('This login is for admins only.')
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const load = async (s: Session | null) => {
    if (!s) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('id,username,display_name,role,status').eq('id', s.user.id).single()
    setProfile(data as Profile | null)
  }
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => { setSession(data.session); await load(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((ev, s) => {
      setSession(s)
      setTimeout(() => {
        load(s)
        if (ev === 'SIGNED_IN' && s) {
          const ua = navigator.userAgent
          supabase.from('login_history').insert({ user_id: s.user.id, device: /Mobi/i.test(ua) ? 'mobile' : 'desktop', browser: ua.match(/(Edg|Chrome|Firefox|Safari)/)?.[1] ?? 'other', os: ua.match(/(Android|iPhone|Windows|Mac|Linux)/)?.[1] ?? 'other' }).then(() => {})
        }
      }, 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [])
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  return <C.Provider value={{ session, profile, loading, isAdmin }}>{children}</C.Provider>
}
