import { ReactNode, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginWith } from './auth'
import { Logo } from './Symbiote'

function Shell({ tab, children }: { tab: 'login' | 'admin'; children: ReactNode }) {
  return (
    <div className="max-w-sm mx-auto">
      <div className="text-center mb-4 sym-title"><Logo size={26} /></div>
      <div className="tabs">
        <Link to="/login" className={'tab' + (tab === 'login' ? ' on' : '')}>Login</Link>
        <Link to="/admin-login" className={'tab' + (tab === 'admin' ? ' on' : '')}>Admin</Link>
      </div>
      <div className="glass p-6">{children}</div>
    </div>
  )
}

function LoginForm({ admin }: { admin: boolean }) {
  const nav = useNavigate(); const [u, setU] = useState(''); const [pw, setPw] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const go = async () => {
    setMsg(''); setBusy(true)
    const err = await loginWith(u, pw, admin)
    setBusy(false)
    if (err) return setMsg(err)
    nav(admin ? '/admin' : '/')
  }
  return (
    <Shell tab={admin ? 'admin' : 'login'}>
      <h2 className="text-xl font-bold mb-3">{admin ? 'Admin login' : 'Member login'}</h2>
      <input className="sym-inp" placeholder="Username" value={u} onChange={e => setU(e.target.value)} autoCapitalize="none" />
      <input className="sym-inp" type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} />
      <button className="sym-btn w-full" onClick={go} disabled={busy}>{busy ? 'Entering…' : 'Login'}</button>
      {msg && <p className="mt-3 text-amber-300 text-sm">{msg}</p>}
      {!admin && <p className="mt-3 text-xs text-gray-400">Forgot your password? Ask the admin to set a new one. Accounts are created by the admin only.</p>}
    </Shell>
  )
}
export const Login = () => <LoginForm admin={false} />
export const AdminLogin = () => <LoginForm admin />
