import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReports } from '../hooks/useReports'
import { askAgent } from '../lib/api'

const SUGGEST = [
  'What issues are unresolved near me?',
  'How many potholes have been reported?',
  'Show me the impact stats',
  'I want to report a broken streetlight',
]

export default function AskAgent() {
  const { reports } = useReports()
  const nav = useNavigate()
  const [history, setHistory] = useState([{ role: 'model', text: "Hi! I'm the CivicPulse agent. Ask me about local issues, impact stats, or say you want to file a report." }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const recogRef = useRef(null)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history])

  async function send(text) {
    const msg = (text ?? input).trim()
    if (!msg || busy) return
    setInput('')
    const newHist = [...history, { role: 'user', text: msg }]
    setHistory(newHist); setBusy(true)
    try {
      const slim = reports.map((r) => ({ category: r.category, severity: r.severity, status: r.status, address: r.address }))
      const res = await askAgent(msg, slim, newHist.slice(-6).map((h) => ({ role: h.role === 'model' ? 'model' : 'user', text: h.text })))
      setHistory((h) => [...h, { role: 'model', text: res.reply }])
      speak(res.reply)
      if (res.action === 'start_report') setTimeout(() => nav('/report'), 800)
    } catch (e) {
      setHistory((h) => [...h, { role: 'model', text: 'Sorry — ' + e.message + ' (is the Gemini key set?)' }])
    } finally { setBusy(false) }
  }

  function speak(text) {
    try { const u = new SpeechSynthesisUtterance(text); u.rate = 1.05; speechSynthesis.speak(u) } catch {}
  }

  function toggleVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return alert('Voice input not supported in this browser.')
    if (listening) { recogRef.current?.stop(); return }
    const rec = new SR()
    rec.lang = 'en-US'; rec.interimResults = false
    rec.onresult = (e) => { const t = e.results[0][0].transcript; setListening(false); send(t) }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recogRef.current = rec; rec.start(); setListening(true)
  }

  return (
    <div className="page narrow">
      <h2>Ask CivicPulse</h2>
      <p className="muted">An agent that uses live data + tools to answer and act.</p>
      <div className="chat">
        {history.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>{m.text}</div>
        ))}
        {busy && <div className="bubble model"><i className="typing">…</i></div>}
        <div ref={endRef} />
      </div>
      <div className="suggest">
        {SUGGEST.map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}
      </div>
      <div className="chat-input">
        <button className={listening ? 'btn btn-primary mic on' : 'btn btn-ghost mic'} onClick={toggleVoice} title="Voice">{listening ? '🔴' : '🎙️'}</button>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Ask anything…" />
        <button className="btn btn-primary" disabled={busy} onClick={() => send()}>Send</button>
      </div>
    </div>
  )
}
