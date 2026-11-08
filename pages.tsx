import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'
import { Logo } from './Symbiote'

const inp = 'sym-inp'
const btn = 'sym-btn'

export function Home() {
  const [s, setS] = useState<any>(null); const [top, setTop] = useState<any[]>([])
  useEffect(() => {
    supabase.from('guild_stats').select('*').single().then(r => setS(r.data))
    supabase.from('lb_weekly').select('*').order('rnk').limit(3).then(r => setTop(r.data ?? []))
  }, [])
  return (<div className="space-y-4">
    <div className="glass p-6 text-center"><h1 className="sym-title"><Logo size={34} /></h1><p className="text-gray-400">Official Guild Platform</p></div>
    <div className="grid grid-cols-2 gap-3"><div className="glass p-4">Members<br /><b className="text-2xl">{s?.members ?? '—'}</b></div><div className="glass p-4">Total glory<br /><b className="text-2xl">{s?.total_glory ?? '—'}</b></div></div>
    <div className="glass p-4"><h2 className="font-semibold mb-2">Top this week</h2>{top.map(t => <div key={t.member_id} className="flex justify-between"><span>#{t.rnk} {t.display_name ?? t.username}</span><b>{t.glory}</b></div>)}{!top.length && <p className="text-gray-500">No data yet</p>}</div>
  </div>)
}

export function Login() {
  const nav = useNavigate(); const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [user, setUser] = useState(''); const [signup, setSignup] = useState(false); const [msg, setMsg] = useState('')
  const go = async () => {
    setMsg('')
    const r = signup ? await supabase.auth.signUp({ email, password: pw, options: { data: { username: user } } }) : await supabase.auth.signInWithPassword({ email, password: pw })
    if (r.error) return setMsg(r.error.message)
    if (signup) setMsg('Check your email to verify your account.'); else nav('/')
  }
  const reset = async () => { const r = await supabase.auth.resetPasswordForEmail(email); setMsg(r.error?.message ?? 'Password reset email sent.') }
  return (<div className="glass p-6 max-w-sm mx-auto">
    <h2 className="text-xl font-bold mb-3">{signup ? 'Register' : 'Login'}</h2>
    {signup && <input className={inp} placeholder="Username" value={user} onChange={e => setUser(e.target.value)} />}
    <input className={inp} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
    <input className={inp} type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} />
    <button className={btn} onClick={go}>{signup ? 'Create account' : 'Login'}</button>
    <div className="text-sm mt-3 flex gap-4"><button onClick={() => setSignup(!signup)}>{signup ? 'Have an account?' : 'New here?'}</button><button onClick={reset}>Forgot password</button></div>
    {msg && <p className="mt-2 text-amber-300 text-sm">{msg}</p>}
  </div>)
}

export function Leaderboard() {
  const [tab, setTab] = useState('weekly'); const [rows, setRows] = useState<any[]>([]); const [q, setQ] = useState('')
  useEffect(() => { supabase.from('lb_' + tab).select('*').order('rnk').limit(100).then(r => setRows(r.data ?? [])) }, [tab])
  return (<div>
    <div className="flex gap-2 mb-3 flex-wrap">{['daily', 'weekly', 'monthly', 'lifetime'].map(t => <button key={t} className={btn + (t === tab ? ' bg-white/30' : '')} onClick={() => setTab(t)}>{t}</button>)}</div>
    <input className={inp} placeholder="Search members" value={q} onChange={e => setQ(e.target.value)} />
    {rows.filter(r => (r.display_name ?? r.username).toLowerCase().includes(q.toLowerCase())).map(r => <div key={r.member_id} className="glass p-3 mb-2 flex justify-between"><span>#{r.rnk} {r.display_name ?? r.username}</span><b>{r.glory}</b></div>)}
  </div>)
}

export function GloryEntry() {
  const [members, setMembers] = useState<any[]>([]); const [v, setV] = useState<Record<string, string>>({}); const [msg, setMsg] = useState('')
  useEffect(() => { supabase.from('profiles').select('id,username,display_name').eq('status', 'active').order('username').then(r => setMembers(r.data ?? [])) }, [])
  const save = async () => {
    const entries = Object.entries(v).filter(([, g]) => g !== '').map(([member_id, g]) => ({ member_id, gained: parseInt(g) }))
    const { data, error } = await supabase.rpc('submit_daily_glory', { entries })
    setMsg(error ? error.message : `Saved ${data} entries`)
  }
  return (<div><p className="text-sm text-gray-400 mb-3">Window: 10–11 PM IST (enforced by the server).</p>
    {members.map(m => <div key={m.id} className="flex justify-between items-center mb-2"><span>{m.display_name ?? m.username}</span><input type="number" min={0} className="w-24 p-1 rounded bg-white/5 border border-white/10" onChange={e => setV({ ...v, [m.id]: e.target.value })} /></div>)}
    <button className={btn} onClick={save}>Submit daily glory</button>{msg && <p className="mt-2 text-amber-300 text-sm">{msg}</p>}</div>)
}

export function Chat() {
  const { session, isAdmin } = useAuth(); const uid = session!.user.id
  const [convs, setConvs] = useState<any[]>([]); const [cur, setCur] = useState<string | null>(null); const [msgs, setMsgs] = useState<any[]>([]); const [text, setText] = useState('')
  const [people, setPeople] = useState<any[]>([]); const [showG, setShowG] = useState(false); const [gname, setGname] = useState(''); const [picked, setPicked] = useState<string[]>([]); const [err, setErr] = useState('')
  const loadConvs = async () => { const { data } = await supabase.from('conversation_members').select('conversations(id,type,name)').eq('user_id', uid); setConvs((data ?? []).map((r: any) => r.conversations)) }
  useEffect(() => { loadConvs(); supabase.from('profiles').select('id,username').eq('status', 'active').neq('id', uid).then(r => setPeople(r.data ?? [])) }, [])
  useEffect(() => {
    if (!cur) return
    supabase.from('messages').select('*').eq('conversation_id', cur).is('deleted_at', null).order('created_at').limit(200).then(r => setMsgs(r.data ?? []))
    const ch = supabase.channel('m-' + cur).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + cur }, (p: any) => setMsgs(m => [...m, p.new])).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [cur])
  const send = async () => { if (!cur || !text.trim()) return; const { error } = await supabase.from('messages').insert({ conversation_id: cur, sender_id: uid, body: text, kind: 'text' }); setErr(error?.message ?? ''); setText('') }
  const dm = async (id: string) => { if (!id) return; const { data, error } = await supabase.rpc('get_or_create_dm', { other: id }); if (error) return setErr(error.message); await loadConvs(); setCur(data) }
  const mkGroup = async () => { const { data, error } = await supabase.rpc('create_group', { p_name: gname, p_desc: null, p_privacy: 'private', p_members: picked, p_admins: [] }); if (error) return setErr(error.message); setShowG(false); await loadConvs(); setCur(data) }
  return (<div className="space-y-3">
    <div className="flex gap-2 flex-wrap items-center">
      <select className="p-2 rounded bg-white/5" onChange={e => dm(e.target.value)} defaultValue=""><option value="">New direct chat…</option>{people.map(p => <option key={p.id} value={p.id}>{p.username}</option>)}</select>
      {isAdmin && <button className={btn + ' font-bold'} onClick={() => setShowG(!showG)}>+ CREATE GROUP</button>}
    </div>
    {showG && <div className="glass p-3"><input className={inp} placeholder="Group name" value={gname} onChange={e => setGname(e.target.value)} />
      {people.map(p => <label key={p.id} className="block text-sm"><input type="checkbox" onChange={e => setPicked(e.target.checked ? [...picked, p.id] : picked.filter(x => x !== p.id))} /> {p.username}</label>)}
      <button className={btn + ' mt-2'} onClick={mkGroup}>Create</button></div>}
    <div className="flex gap-2 overflow-x-auto">{convs.map(c => <button key={c.id} className={btn + (c.id === cur ? ' bg-white/30' : '')} onClick={() => setCur(c.id)}>{c.name ?? 'Direct chat'}</button>)}</div>
    {cur && <div className="glass p-3"><div className="h-80 overflow-y-auto space-y-1">{msgs.map(m => <div key={m.id} className={m.sender_id === uid ? 'text-right' : ''}><span className="inline-block bg-white/10 rounded px-2 py-1">{m.body}</span></div>)}</div>
      <div className="flex gap-2 mt-2"><input className={inp + ' mb-0'} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Message" /><button className={btn} onClick={send}>Send</button></div></div>}
    {err && <p className="text-amber-300 text-sm">{err}</p>}
  </div>)
}
