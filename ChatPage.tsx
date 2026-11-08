import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib'
import { useAuth } from './auth'

type Msg = { id: string; sender_id: string; body: string | null; kind: string; media_path: string | null; created_at: string }
type Conv = { id: string; type: string; name: string | null }
const BUCKET = 'chat-media'

export function Chat() {
  const { session, isAdmin } = useAuth(); const uid = session!.user.id
  const [convs, setConvs] = useState<Conv[]>([]); const [cur, setCur] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState('')
  const [people, setPeople] = useState<any[]>([]); const [names, setNames] = useState<Record<string, string>>({})
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [showG, setShowG] = useState(false); const [gname, setGname] = useState(''); const [picked, setPicked] = useState<string[]>([])
  const [showM, setShowM] = useState(false); const [members, setMembers] = useState<any[]>([]); const [addId, setAddId] = useState('')
  const [rec, setRec] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const recRef = useRef<MediaRecorder | null>(null); const chunks = useRef<Blob[]>([]); const endRef = useRef<HTMLDivElement>(null)
  const curConv = convs.find(c => c.id === cur)

  const loadConvs = async () => {
    const { data } = await supabase.from('conversation_members').select('conversations(id,type,name)').eq('user_id', uid)
    setConvs((data ?? []).map((r: any) => r.conversations).filter(Boolean))
  }
  useEffect(() => {
    loadConvs()
    supabase.from('profiles').select('id,username,display_name').eq('status', 'active').then(r => {
      const all = r.data ?? []; setPeople(all.filter((p: any) => p.id !== uid))
      setNames(Object.fromEntries(all.map((p: any) => [p.id, p.display_name || p.username])))
    })
  }, [])

  const sign = async (list: Msg[]) => {
    const paths = list.map(m => m.media_path).filter((p): p is string => !!p)
    if (!paths.length) return
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
    if (data) setUrls(u => ({ ...u, ...Object.fromEntries(data.filter(d => d.path && d.signedUrl).map(d => [d.path as string, d.signedUrl])) }))
  }
  useEffect(() => {
    if (!cur) return
    setMsgs([]); setShowM(false)
    supabase.from('messages').select('*').eq('conversation_id', cur).is('deleted_at', null).order('created_at').limit(200)
      .then(r => { const l = (r.data ?? []) as Msg[]; setMsgs(l); sign(l) })
    const ch = supabase.channel('m-' + cur).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + cur },
      (p: any) => { setMsgs(m => m.some(x => x.id === p.new.id) ? m : [...m, p.new]); sign([p.new]) }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [cur])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs.length])

  const loadMembers = async () => {
    if (!cur) return
    const { data } = await supabase.from('conversation_members').select('user_id,role').eq('conversation_id', cur)
    setMembers(data ?? [])
  }
  useEffect(() => { if (showM) loadMembers() }, [showM, cur])

  const sendText = async () => {
    if (!cur || !text.trim()) return
    const { error } = await supabase.from('messages').insert({ conversation_id: cur, sender_id: uid, body: text.trim(), kind: 'text' })
    setErr(error?.message ?? ''); setText('')
  }
  const sendMedia = async (blob: Blob, name: string, kind: string, type: string) => {
    if (!cur) return
    setBusy(true); setErr('')
    const path = `${cur}/${uid}-${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: type })
    if (up.error) { setBusy(false); return setErr(up.error.message) }
    const { error } = await supabase.from('messages').insert({ conversation_id: cur, sender_id: uid, body: name, kind, media_path: path })
    setBusy(false); setErr(error?.message ?? '')
  }
  const pickFile = (f?: File) => {
    if (!f) return
    const kind = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'file'
    sendMedia(f, f.name, kind, f.type || 'application/octet-stream')
  }
  const toggleRec = async () => {
    if (rec) { recRef.current?.stop(); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream); chunks.current = []
      mr.ondataavailable = e => chunks.current.push(e.data)
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop()); setRec(false)
        const type = (mr.mimeType || 'audio/webm').split(';')[0]
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
        sendMedia(new Blob(chunks.current, { type }), `voice.${ext}`, 'voice', type)
      }
      recRef.current = mr; mr.start(); setRec(true)
    } catch { setErr('Microphone permission is needed for voice messages.') }
  }

  const dm = async (id: string) => {
    if (!id) return
    const { data, error } = await supabase.rpc('get_or_create_dm', { other: id }); if (error) return setErr(error.message)
    await loadConvs(); setCur(data)
  }
  const mkGroup = async () => {
    if (!gname.trim()) return setErr('Give the group a name.')
    const { data, error } = await supabase.rpc('create_group', { p_name: gname.trim(), p_desc: null, p_privacy: 'private', p_members: picked, p_admins: [] })
    if (error) return setErr(error.message)
    setShowG(false); setGname(''); setPicked([]); await loadConvs(); setCur(data)
  }
  const addMember = async () => {
    if (!cur || !addId) return
    const { error } = await supabase.from('conversation_members').insert({ conversation_id: cur, user_id: addId, role: 'member' })
    setErr(error?.message ?? ''); setAddId(''); loadMembers()
  }
  const removeMember = async (id: string) => {
    const { error } = await supabase.from('conversation_members').delete().eq('conversation_id', cur!).eq('user_id', id)
    setErr(error?.message ?? ''); loadMembers()
  }

  const body = (m: Msg) => {
    const u = m.media_path ? urls[m.media_path] : undefined
    if (m.kind === 'image') return u ? <img src={u} className="max-w-[240px] rounded-lg" /> : <i>loading image…</i>
    if (m.kind === 'video') return u ? <video src={u} controls className="max-w-[260px] rounded-lg" /> : <i>loading video…</i>
    if (m.kind === 'voice') return u ? <audio src={u} controls className="max-w-[240px]" /> : <i>loading voice…</i>
    if (m.kind === 'file') return u ? <a href={u} target="_blank" rel="noreferrer" className="underline">📎 {m.body}</a> : <i>loading file…</i>
    return <>{m.body}</>
  }
  const memberIds = members.map(x => x.user_id)
  return (<div className="space-y-3">
    <div className="flex gap-2 flex-wrap items-center">
      <select className="sym-inp !w-auto !mb-0" onChange={e => { dm(e.target.value); e.target.value = '' }} defaultValue=""><option value="">New direct chat…</option>{people.map(p => <option key={p.id} value={p.id}>{p.display_name || p.username}</option>)}</select>
      {isAdmin && <button className="sym-btn" onClick={() => setShowG(!showG)}>+ Create group</button>}
    </div>
    {showG && <div className="glass p-3"><input className="sym-inp" placeholder="Group name" value={gname} onChange={e => setGname(e.target.value)} />
      <p className="text-xs text-gray-400 mb-1">Add members:</p>
      {people.map(p => <label key={p.id} className="block text-sm"><input type="checkbox" checked={picked.includes(p.id)} onChange={e => setPicked(e.target.checked ? [...picked, p.id] : picked.filter(x => x !== p.id))} /> {p.display_name || p.username}</label>)}
      <button className="sym-btn mt-2" onClick={mkGroup}>Create group</button></div>}
    <div className="flex gap-2 overflow-x-auto pb-1">{convs.map(c => <button key={c.id} className={'sym-btn whitespace-nowrap' + (c.id === cur ? ' ring-2 ring-cyan-400' : '')} onClick={() => setCur(c.id)}>{c.type === 'group' ? '👥 ' : '💬 '}{c.name ?? 'Direct chat'}</button>)}</div>
    {!convs.length && <p className="text-gray-400 text-sm">No chats yet. {isAdmin ? 'Create a group above.' : 'An admin will add you to a group.'}</p>}
    {cur && <div className="glass p-3">
      <div className="flex justify-between items-center mb-2"><b>{curConv?.name ?? 'Direct chat'}</b>
        {curConv?.type === 'group' && isAdmin && <button className="sym-btn" onClick={() => setShowM(!showM)}>Members</button>}</div>
      {showM && <div className="mb-3 p-2 rounded bg-white/5 text-sm">
        {members.map(x => <div key={x.user_id} className="flex justify-between py-1"><span>{names[x.user_id] ?? x.user_id.slice(0, 6)} <span className="text-gray-500">({x.role})</span></span>{x.user_id !== uid && <button className="text-red-400" onClick={() => removeMember(x.user_id)}>remove</button>}</div>)}
        <div className="flex gap-2 mt-2"><select className="sym-inp !mb-0" value={addId} onChange={e => setAddId(e.target.value)}><option value="">Add member…</option>{people.filter(p => !memberIds.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.display_name || p.username}</option>)}</select><button className="sym-btn" onClick={addMember}>Add</button></div></div>}
      <div className="h-80 overflow-y-auto space-y-2">{msgs.map(m => <div key={m.id} className={m.sender_id === uid ? 'text-right' : ''}>
        {m.sender_id !== uid && <div className="text-xs text-cyan-300">{names[m.sender_id] ?? 'member'}</div>}
        <span className="inline-block bg-violet-500/20 border border-violet-400/20 rounded-xl px-3 py-1.5 text-left">{body(m)}</span></div>)}<div ref={endRef} /></div>
      <div className="flex gap-2 mt-2 items-center">
        <label className="sym-btn cursor-pointer" title="Send file / photo / video">📎<input type="file" className="hidden" onChange={e => { pickFile(e.target.files?.[0]); e.target.value = '' }} /></label>
        <button className={'sym-btn' + (rec ? ' danger animate-pulse' : '')} onClick={toggleRec} title="Voice message">{rec ? '⏹' : '🎤'}</button>
        <input className="sym-inp !mb-0" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendText()} placeholder={busy ? 'Uploading…' : 'Message'} />
        <button className="sym-btn" onClick={sendText}>Send</button></div></div>}
    {err && <p className="text-amber-300 text-sm">{err}</p>}
  </div>)
}
