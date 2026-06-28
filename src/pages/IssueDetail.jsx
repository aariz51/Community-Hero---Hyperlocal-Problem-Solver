import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getReport, advanceStatus, upvoteReport, updateReportFields } from '../lib/reports'
import { fileToCompressed, base64Of } from '../lib/imageUtils'
import { verifyResolution } from '../lib/api'
import { CATEGORY_META, SEVERITY_COLOR, STATUS_FLOW, STATUS_LABEL } from '../agent/departments'

export default function IssueDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [r, setR] = useState(null)
  const [busy, setBusy] = useState(false)
  const [verify, setVerify] = useState(null)
  const [msg, setMsg] = useState('')
  const afterRef = useRef()

  const reload = () => getReport(id).then(setR)
  useEffect(() => { reload() }, [id])

  if (!r) return <div className="page narrow"><p className="muted">Loading…</p></div>

  const stepIdx = STATUS_FLOW.indexOf(r.status)

  async function setStatus(s) { setBusy(true); await advanceStatus(id, s); await reload(); setBusy(false) }

  async function vote() { if (!user) return; await upvoteReport(id, user.uid); await reload() }

  async function onAfter(e) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true); setMsg(''); setVerify(null)
    try {
      const after = await fileToCompressed(file)
      const v = await verifyResolution(base64Of(r.photoUrl), after.base64, after.mimeType, r.category)
      setVerify(v)
      if (v.resolved) {
        // AI confirmed the fix → mark Verified Fixed
        await advanceStatus(id, 'verified', {
          afterPhotoUrl: after.dataUrl, verifyNote: v.note, verifyConfidence: v.confidence,
        })
      } else {
        // AI rejected the fix → keep status, store the attempt + note (no false "resolved")
        await updateReportFields(id, {
          afterPhotoUrl: after.dataUrl, verifyNote: v.note, verifyConfidence: v.confidence,
        })
      }
      await reload()
    } catch (e) { setMsg(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="page narrow">
      <Link to="/map" className="back">← Back to map</Link>
      <div className="detail-grid">
        <div>
          {r.photoUrl && <img className="detail-img" src={r.photoUrl} alt={r.category} />}
          {r.afterPhotoUrl && (
            <div className="after-wrap">
              <div className="ba-label">AFTER (claimed fix)</div>
              <img className="detail-img" src={r.afterPhotoUrl} alt="after" />
            </div>
          )}
        </div>
        <div>
          <div className="result-head">
            <span className="cat-chip" style={{ background: CATEGORY_META[r.category]?.color }}>
              {CATEGORY_META[r.category]?.icon} {r.category}</span>
            <span className="sev-chip" style={{ color: SEVERITY_COLOR[r.severity] }}>● {r.severity}</span>
          </div>
          <p className="desc">{r.description}</p>
          <div className="kv"><b>📍</b><span>{r.address}</span></div>
          <div className="kv"><b>🏛️</b><span>{r.department} · SLA {r.sla}d</span></div>
          {r.escalationRisk != null && (
            <div className="kv"><b>🔮 Risk</b><span>{r.escalationRisk}/100 — {r.escalationReason}</span></div>)}
          <div className="kv"><b>👍 Verified by</b><span>{r.votes || 1} citizen(s)</span></div>
          {user && (r.voterIds || []).indexOf(user.uid) === -1 &&
            <button className="btn btn-ghost btn-sm" onClick={vote}>👍 Verify this issue</button>}

          {/* status timeline */}
          <div className="timeline">
            {STATUS_FLOW.map((s, i) => (
              <div key={s} className={`tl-step ${i <= stepIdx ? 'on' : ''}`}>
                <span className="tl-dot" /><span>{STATUS_LABEL[s]}</span>
              </div>
            ))}
          </div>

          {verify && (
            <div className={`alert ${verify.resolved ? 'ok' : 'warn'}`}>
              {verify.resolved ? '✅ AI verified the fix' : '⚠️ AI could not confirm the fix'} — {verify.note} ({Math.round((verify.confidence || 0) * 100)}%)
            </div>
          )}
          {msg && <div className="alert error">{msg}</div>}

          {/* authority / resolver actions */}
          {user && r.status !== 'verified' && (
            <div className="actions">
              {r.status === 'reported' && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setStatus('acknowledged')}>Acknowledge</button>}
              {['reported', 'acknowledged'].includes(r.status) && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setStatus('in_progress')}>Mark in progress</button>}
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => afterRef.current?.click()}>📸 Upload fix photo → AI verify</button>
              <input ref={afterRef} type="file" accept="image/*" capture="environment" hidden onChange={onAfter} />
            </div>
          )}

          {r.complaintLetter && (
            <details className="letter"><summary>✍️ AI-drafted complaint</summary>
              <pre>{r.complaintLetter}</pre>
              <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(r.complaintLetter)}>Copy</button>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}
