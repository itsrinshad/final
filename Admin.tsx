import { useEffect, useState } from 'react'
import { supabase } from './lib'
import { useAuth } from './auth'

type P = { id: string; username: string; display_name: string | null; ff_ign: string | null; ff_uid: string | null; role: string; status: string; joined_at: string }

export function AdminPanel() {
  const { session } = useAuth()
  const [rows, setRows] = useState<P[]>([]); const [q, setQ] = useState(''); const [msg, setMsg] = useState(''); const [pw, setPw] = useState<Record<string, string>>({})
  const load = async () => {
    const r = await supabase.from('profiles').select('id,username,display_name,ff_ign,ff_uid,role,status,joined_at').order('joined_at', { ascending: false })
    setRows((r.data ?? []) as P[])
  }
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t) }, [])
  const run = async (fn: string, args: object, ok: string) => {
    const { error } = await supabase.rpc(fn, args)
    setMsg(error ? '❌ ' + error.message : '✅ ' + ok); load()
  }
  const [nu, setNu] = useState({ username: '', password: '', ff_uid: '', ff_ign: '' }); const [made, setMade] = useState('')
  const create = async () => {
    setMade('')
    const { error } = await supabase.rpc('admin_create_user', { p_username: nu.username, p_password: nu.password, p_ff_uid: nu.ff_uid, p_ff_ign: nu.ff_ign })
    if (error) return setMsg('❌ ' + error.message)
    setMsg('✅ Account created'); setMade(`Username: ${nu.username.trim().toLowerCase()}   Password: ${nu.password}`)
    setNu({ username: '', password: '', ff_uid: '', ff_ign: '' }); load()
  }
  const pending = rows.filter(r => r.status === 'pending')
  const members = rows.filter(r => r.status !== 'pending' && (r.username + (r.ff_ign ?? '') + (r.ff_uid ?? '')).toLowerCase().includes(q.toLowerCase()))
  const remove = (p: P) => { if (confirm(`Remove ${p.username}? This deletes the account permanently.`)) run('admin_delete_user', { p_user: p.id }, `${p.username} removed`) }
  const setPass = (p: P) => {
    const v = pw[p.id] ?? ''
    if (v.length < 6) return setMsg('❌ New password must be at least 6 characters.')
    run('admin_set_password', { p_user: p.id, p_password: v }, `Password changed for ${p.username}`).then(() => setPw({ ...pw, [p.id]: '' }))
  }
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Admin panel</h2>
      {msg && <p className="glass p-3 text-sm">{msg}</p>}

      <div className="glass p-4">
        <h3 className="font-semibold mb-2">➕ Create member account</h3>
        <input className="sym-inp" placeholder="Username (letters/numbers/_)" value={nu.username} onChange={e => setNu({ ...nu, username: e.target.value })} autoCapitalize="none" />
        <input className="sym-inp" placeholder="Password (min 6)" value={nu.password} onChange={e => setNu({ ...nu, password: e.target.value })} />
        <input className="sym-inp" placeholder="Game ID (UID)" value={nu.ff_uid} onChange={e => setNu({ ...nu, ff_uid: e.target.value })} />
        <input className="sym-inp" placeholder="In-game name (optional)" value={nu.ff_ign} onChange={e => setNu({ ...nu, ff_ign: e.target.value })} />
        <button className="sym-btn ok" onClick={create}>Create account</button>
        {made && <p className="mt-2 text-sm text-green-300 break-all">Give this to the member → {made}</p>}
      </div>

      {pending.length > 0 && <div className="glass p-4">
        <h3 className="font-semibold mb-2">🔔 Old pending requests ({pending.length})</h3>
        {pending.map(p => (
          <div key={p.id} className="border-t border-white/10 py-3 text-sm">
            <div><b>{p.username}</b> · Game ID <b>{p.ff_uid ?? '?'}</b> · IGN {p.ff_ign ?? '—'}</div>
            <div className="text-gray-500 text-xs mb-2">{new Date(p.joined_at).toLocaleString()}</div>
            <div className="flex gap-2">
              <button className="sym-btn ok" onClick={() => run('admin_approve_user', { p_user: p.id }, `${p.username} approved`)}>Approve</button>
              <button className="sym-btn danger" onClick={() => remove(p)}>Reject & remove</button>
            </div>
          </div>
        ))}
      </div>}

      <div className="glass p-4">
        <h3 className="font-semibold mb-2">Members ({members.length})</h3>
        <input className="sym-inp" placeholder="Search username / game ID" value={q} onChange={e => setQ(e.target.value)} />
        {members.map(p => (
          <div key={p.id} className="border-t border-white/10 py-3 text-sm">
            <div><b>{p.username}</b> <span className="text-gray-400">· {p.role} · {p.status} · ID {p.ff_uid ?? '—'}</span></div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <input className="sym-inp !mb-0 !w-44" type="text" placeholder="New password" value={pw[p.id] ?? ''} onChange={e => setPw({ ...pw, [p.id]: e.target.value })} />
              <button className="sym-btn" onClick={() => setPass(p)}>Set password</button>
              {p.id !== session?.user.id && <button className="sym-btn danger" onClick={() => remove(p)}>Remove</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
