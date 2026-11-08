import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { ReactNode, useEffect, useState } from 'react'
import { useAuth } from './auth'
import { supabase } from './lib'
import { GloryEntry, Home, Leaderboard } from './pages'
import { Chat } from './ChatPage'
import { AdminLogin, Login } from './AuthPages'
import { AdminPanel } from './Admin'
import { Logo, SymbioteBg } from './Symbiote'
import { Announcements, Polls, Profile } from './pages2'

function Guard({ children, admin, pending }: { children: ReactNode; admin?: boolean; pending?: boolean }) {
  const { session, profile, isAdmin } = useAuth()
  if (!session) return <Navigate to={admin ? '/admin-login' : '/login'} />
  if (!profile) return <p className="p-6 text-center animate-pulse">Loading…</p>
  if (['banned', 'suspended'].includes(profile.status)) return <p className="p-6">Your account is {profile.status}.</p>
  if (profile.status === 'pending' && !admin && !pending) return <p className="p-6">Your account is waiting for admin approval.</p>
  if (admin && !isAdmin) return <Navigate to="/" />
  return <>{children}</>
}
export default function App() {
  const { session, isAdmin, loading } = useAuth()
  const [pend, setPend] = useState(0)
  useEffect(() => {
    if (!isAdmin) return
    const f = () => supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending').then(r => setPend(r.count ?? 0))
    f(); const t = setInterval(f, 15000); return () => clearInterval(t)
  }, [isAdmin])
  if (loading) return <><SymbioteBg /><div className="p-10 text-center animate-pulse"><Logo size={28} /></div></>
  return (
    <div className="max-w-3xl mx-auto p-4">
      <SymbioteBg />
      <nav className="glass flex gap-4 p-3 mb-4 text-sm items-center flex-wrap">
        <Link to="/"><Logo size={18} /></Link>
        <Link to="/leaderboard">Leaderboard</Link>
        {session && <><Link to="/chat">Chat</Link><Link to="/announcements">News</Link><Link to="/polls">Polls</Link><Link to="/profile">Profile</Link></>}
        {isAdmin && <><Link to="/admin/glory">Glory</Link><Link to="/admin">Admin{pend > 0 && <span className="ml-1 px-1.5 rounded-full bg-red-500 text-white text-xs animate-pulse">{pend}</span>}</Link></>}
        <span className="ml-auto" />
        {session ? <button onClick={() => supabase.auth.signOut()}>Logout</button> : <><Link to="/login">Login</Link><Link to="/admin-login">Admin</Link></>}
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin" element={<Guard admin><AdminPanel /></Guard>} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/chat" element={<Guard><Chat /></Guard>} />
        <Route path="/admin/glory" element={<Guard admin><GloryEntry /></Guard>} />
        <Route path="/announcements" element={<Guard><Announcements /></Guard>} />
        <Route path="/polls" element={<Guard><Polls /></Guard>} />
        <Route path="/profile" element={<Guard pending><Profile /></Guard>} />
        <Route path="*" element={<p className="p-6">404 — page not found</p>} />
      </Routes>
    </div>
  )
}
