import { useEffect, useState } from 'react'
import { supabase } from './lib'
import { useAuth } from './auth'

const inp = 'sym-inp'
const btn = 'sym-btn'

export function Apply() {
  const { session } = useAuth(); const uid = session!.user.id
  const [f, setF] = useState<any>({}); const [msg, setMsg] = useState(''); const [mine, setMine] = useState<any[]>([]); const [open, setOpen] = useState(true)
  const load = () => supabase.from('applications').select('*').eq('applicant_id', uid).order('created_at', { ascending: false }).then(r => setMine(r.data ?? []))
  useEffect(() => { load(); supabase.from('site_settings').select('value').eq('key', 'recruitment_open').single().then(r => setOpen(r.data?.value !== false)) }, [])
  const submit = async () => {
    const { error } = await supabase.from('applications').insert({ applicant_id: uid, ff_ign: f.ff_ign, ff_uid: f.ff_uid, level: f.level ? parseInt(f.level) : null, ff_rank: f.ff_rank, current_guild: f.current_guild, game_mode: f.game_mode, experience: f.experience, intro: f.intro })
    setMsg(error ? error.message : 'Application submitted'); load()
  }
  const fields: [string, string][] = [['ff_ign', 'Free Fire IGN'], ['ff_uid', 'UID'], ['level', 'Level'], ['ff_rank', 'Rank'], ['current_guild', 'Current guild'], ['game_mode', 'Preferred game mode'], ['experience', 'Experience'], ['intro', 'Short introduction']]
  return (<div className="space-y-3">
    <h2 className="text-xl font-bold">Join SYMBIOTES</h2>
    {!open ? <p className="text-amber-300">Recruitment is currently closed.</p> : <div className="glass p-4">
      {fields.map(([k, l]) => <input key={k} className={inp} placeholder={l} onChange={e => setF({ ...f, [k]: e.target.value })} />)}
      <button className={btn} onClick={submit}>Submit application</button>{msg && <p className="mt-2 text-amber-300 text-sm">{msg}</p>}</div>}
    {mine.map(a => <div key={a.id} className="glass p-3 text-sm">{a.ff_ign} — <b>{a.status}</b>{a.admin_note && <p className="text-gray-400">Admin: {a.admin_note}</p>}</div>)}
  </div>)
}

export function AdminApplications() {
  const [rows, setRows] = useState<any[]>([]); const [note, setNote] = useState<Record<string, string>>({}); const [msg, setMsg] = useState('')
  const load = () => supabase.from('applications').select('*').order('created_at', { ascending: false }).then(r => setRows(r.data ?? []))
  useEffect(() => { load() }, [])
  const act = async (id: string, d: string) => { const { error } = await supabase.rpc('review_application', { p_id: id, p_decision: d, p_note: note[id] ?? null }); setMsg(error?.message ?? ''); load() }
  return (<div className="space-y-3"><h2 className="text-xl font-bold">Applications</h2>{msg && <p className="text-amber-300">{msg}</p>}
    {rows.map(a => <div key={a.id} className="glass p-3 text-sm space-y-1">
      <div><b>{a.ff_ign}</b> · UID {a.ff_uid} · Lv {a.level ?? '?'} · {a.ff_rank ?? '?'} · <i>{a.status}</i></div>
      <div className="text-gray-400">{a.current_guild} · {a.game_mode} · {a.experience}</div><div>{a.intro}</div>
      {['pending', 'info_requested'].includes(a.status) && <><input className={inp} placeholder="Note to applicant" onChange={e => setNote({ ...note, [a.id]: e.target.value })} />
        <div className="flex gap-2"><button className={btn} onClick={() => act(a.id, 'approved')}>Approve</button><button className={btn} onClick={() => act(a.id, 'rejected')}>Reject</button><button className={btn} onClick={() => act(a.id, 'info_requested')}>Request info</button></div></>}
    </div>)}</div>)
}

export function Announcements() {
  const { session, isAdmin } = useAuth(); const uid = session!.user.id
  const [rows, setRows] = useState<any[]>([]); const [read, setRead] = useState<string[]>([]); const [msg, setMsg] = useState('')
  const [t, setT] = useState(''); const [b, setB] = useState(''); const [cat, setCat] = useState('general'); const [pin, setPin] = useState(false); const [at, setAt] = useState('')
  const load = async () => {
    const r = await supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('publish_at', { ascending: false }); setRows(r.data ?? [])
    const x = await supabase.from('announcement_reads').select('announcement_id').eq('user_id', uid); setRead((x.data ?? []).map((i: any) => i.announcement_id))
  }
  useEffect(() => { load() }, [])
  const post = async () => {
    if (!t) return
    const { error } = await supabase.from('announcements').insert({ title: t, body: b, category: cat, pinned: pin, author_id: uid, publish_at: at ? new Date(at).toISOString() : new Date().toISOString() })
    setMsg(error?.message ?? ''); setT(''); setB(''); load()
  }
  const markRead = async (id: string) => { await supabase.from('announcement_reads').insert({ announcement_id: id, user_id: uid }); load() }
  const react = async (id: string) => { const { error } = await supabase.from('announcement_reactions').insert({ announcement_id: id, user_id: uid, emoji: '👍' }); setMsg(error ? 'Already reacted' : '') }
  const togglePin = async (a: any) => { await supabase.from('announcements').update({ pinned: !a.pinned }).eq('id', a.id); load() }
  const del = async (id: string) => { await supabase.from('announcements').delete().eq('id', id); load() }
  return (<div className="space-y-3"><h2 className="text-xl font-bold">Announcements</h2>
    {isAdmin && <div className="glass p-3"><input className={inp} placeholder="Title" value={t} onChange={e => setT(e.target.value)} /><textarea className={inp} placeholder="Body" value={b} onChange={e => setB(e.target.value)} />
      <input className={inp} placeholder="Category" value={cat} onChange={e => setCat(e.target.value)} />
      <label className="text-sm block mb-2">Schedule (optional) <input type="datetime-local" className="bg-white/5 p-1 rounded" onChange={e => setAt(e.target.value)} /></label>
      <label className="text-sm mr-3"><input type="checkbox" checked={pin} onChange={e => setPin(e.target.checked)} /> Pin</label><button className={btn} onClick={post}>Publish</button></div>}
    {msg && <p className="text-amber-300 text-sm">{msg}</p>}
    {rows.map(a => <div key={a.id} className={'glass p-3 ' + (read.includes(a.id) ? 'opacity-70' : '')}>
      <div className="flex justify-between"><b>{a.pinned && '📌 '}{a.title}</b><span className="text-xs text-gray-400">{a.category} · {new Date(a.publish_at).toLocaleString()}</span></div>
      <p className="text-sm my-2 whitespace-pre-wrap">{a.body}</p>
      <div className="flex gap-2 flex-wrap">{!read.includes(a.id) && <button className={btn} onClick={() => markRead(a.id)}>Mark read</button>}<button className={btn} onClick={() => react(a.id)}>👍</button>
        {isAdmin && <><button className={btn} onClick={() => togglePin(a)}>{a.pinned ? 'Unpin' : 'Pin'}</button><button className={btn} onClick={() => del(a.id)}>Delete</button></>}</div>
    </div>)}</div>)
}

export function Polls() {
  const { session, isAdmin } = useAuth(); const uid = session!.user.id
  const [polls, setPolls] = useState<any[]>([]); const [votes, setVotes] = useState<Record<string, number>>({}); const [res, setRes] = useState<Record<string, any[]>>({})
  const [q, setQ] = useState(''); const [opts, setOpts] = useState(''); const [dl, setDl] = useState(''); const [msg, setMsg] = useState('')
  const load = async () => {
    const { data } = await supabase.from('polls').select('*').order('created_at', { ascending: false }); setPolls(data ?? [])
    const v = await supabase.from('poll_votes').select('poll_id,option_idx').eq('user_id', uid)
    setVotes(Object.fromEntries((v.data ?? []).map((x: any) => [x.poll_id, x.option_idx])))
    const r: Record<string, any[]> = {}
    for (const p of data ?? []) if (['open', 'closed'].includes(p.status)) { const x = await supabase.rpc('poll_results', { pid: p.id }); r[p.id] = x.data ?? [] }
    setRes(r)
  }
  useEffect(() => { load() }, [])
  const vote = async (pid: string, i: number) => { const { error } = await supabase.from('poll_votes').insert({ poll_id: pid, user_id: uid, option_idx: i }); setMsg(error ? error.message : ''); load() }
  const create = async () => {
    const options = opts.split(',').map(s => s.trim()).filter(Boolean)
    if (!q || options.length < 2) return setMsg('Need a question and at least 2 comma-separated options')
    const { error } = await supabase.from('polls').insert({ question: q, options, created_by: uid, status: isAdmin ? 'open' : 'suggested', deadline: isAdmin && dl ? new Date(dl).toISOString() : null })
    setMsg(error?.message ?? (isAdmin ? 'Poll created' : 'Suggestion sent to admins')); setQ(''); setOpts(''); load()
  }
  const upd = async (id: string, patch: any) => { const { error } = await supabase.from('polls').update(patch).eq('id', id); setMsg(error?.message ?? ''); load() }
  const count = (pid: string, i: number) => res[pid]?.find((x: any) => x.option_idx === i)?.votes
  return (<div className="space-y-3"><h2 className="text-xl font-bold">Polls</h2>
    <div className="glass p-3"><input className={inp} placeholder="Question" value={q} onChange={e => setQ(e.target.value)} /><input className={inp} placeholder="Options, comma separated" value={opts} onChange={e => setOpts(e.target.value)} />
      {isAdmin && <label className="text-sm block mb-2">Deadline <input type="datetime-local" className="bg-white/5 p-1 rounded" onChange={e => setDl(e.target.value)} /></label>}
      <button className={btn} onClick={create}>{isAdmin ? 'Create poll' : 'Suggest poll'}</button></div>
    {msg && <p className="text-amber-300 text-sm">{msg}</p>}
    {polls.map(p => <div key={p.id} className="glass p-3 space-y-2">
      <div className="flex justify-between"><b>{p.question}</b><span className="text-xs text-gray-400">{p.status}{p.deadline ? ' · ends ' + new Date(p.deadline).toLocaleString() : ''}</span></div>
      {['open', 'closed'].includes(p.status) && (p.options as string[]).map((o, i) => <button key={i} disabled={p.status !== 'open' || votes[p.id] !== undefined} onClick={() => vote(p.id, i)} className={btn + ' w-full text-left ' + (votes[p.id] === i ? 'bg-white/30' : '')}>{o}{count(p.id, i) !== undefined && <b className="float-right">{count(p.id, i)}</b>}</button>)}
      {isAdmin && p.status === 'suggested' && <div className="flex gap-2"><button className={btn} onClick={() => upd(p.id, { status: 'open' })}>Approve</button><button className={btn} onClick={() => upd(p.id, { status: 'rejected' })}>Reject</button></div>}
      {isAdmin && p.status === 'open' && <div className="flex gap-2"><button className={btn} onClick={() => upd(p.id, { status: 'closed' })}>Close</button></div>}
      {isAdmin && ['open', 'closed'].includes(p.status) && !p.results_public && <button className={btn} onClick={() => upd(p.id, { results_public: true })}>Publish results</button>}
      {p.status === 'suggested' && !isAdmin && <p className="text-xs text-gray-400">Awaiting admin approval</p>}
    </div>)}</div>)
}

export function Profile() {
  const { session } = useAuth(); const uid = session!.user.id
  const [p, setP] = useState<any>(null); const [badges, setBadges] = useState<any[]>([]); const [msg, setMsg] = useState('')
  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', uid).single().then(r => setP(r.data))
    supabase.from('member_badges').select('badges(name)').eq('member_id', uid).then(r => setBadges(r.data ?? []))
  }, [])
  if (!p) return <p>Loading…</p>
  const set = (k: string, v: any) => setP((x: any) => ({ ...x, [k]: v }))
  const save = async () => {
    const { error } = await supabase.from('profiles').update({ display_name: p.display_name, bio: p.bio, ff_ign: p.ff_ign, ff_uid: p.ff_uid, player_level: p.player_level ? Number(p.player_level) : null, ff_rank: p.ff_rank }).eq('id', uid)
    setMsg(error ? error.message : 'Saved')
  }
  const upload = async (file?: File) => {
    if (!file) return
    const path = `${uid}/avatar-${Date.now()}`
    const up = await supabase.storage.from('avatars').upload(path, file, { upsert: true }); if (up.error) return setMsg(up.error.message)
    const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', uid); set('avatar_url', url)
  }
  return (<div className="glass p-4 space-y-2">
    <div className="flex items-center gap-3">{p.avatar_url ? <img src={p.avatar_url} className="w-16 h-16 rounded-full object-cover" /> : <div className="w-16 h-16 rounded-full bg-white/10" />}
      <div><b>@{p.username}</b><div className="text-xs text-gray-400">{p.role} · {p.status}</div></div></div>
    <input type="file" accept="image/*" className="text-sm" onChange={e => upload(e.target.files?.[0])} />
    <input className={inp} placeholder="Display name" value={p.display_name ?? ''} onChange={e => set('display_name', e.target.value)} />
    <textarea className={inp} placeholder="Bio" value={p.bio ?? ''} onChange={e => set('bio', e.target.value)} />
    <input className={inp} placeholder="Free Fire IGN" value={p.ff_ign ?? ''} onChange={e => set('ff_ign', e.target.value)} />
    <input className={inp} placeholder="Free Fire UID" value={p.ff_uid ?? ''} onChange={e => set('ff_uid', e.target.value)} />
    <input className={inp} placeholder="Level" value={p.player_level ?? ''} onChange={e => set('player_level', e.target.value)} />
    <input className={inp} placeholder="Rank" value={p.ff_rank ?? ''} onChange={e => set('ff_rank', e.target.value)} />
    <div className="flex gap-2 flex-wrap">{badges.map((b, i) => <span key={i} className="px-2 py-1 rounded bg-white/10 text-xs">🏅 {b.badges?.name}</span>)}</div>
    <button className={btn} onClick={save}>Save profile</button>{msg && <p className="text-amber-300 text-sm">{msg}</p>}
  </div>)
}
