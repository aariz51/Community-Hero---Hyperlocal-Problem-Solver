import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAgentEvidence, getReport, advanceStatus, upvoteReport, updateReportFields } from '../lib/reports'
import { fileToCompressed } from '../lib/imageUtils'
import { verifyResolutionEvidence } from '../lib/api'
import { CATEGORY_META, SEVERITY_COLOR, STATUS_FLOW, STATUS_LABEL } from '../agent/departments'
import { uploadVerificationImage } from '../lib/storageUploads'

function timeLabel(value) {
  const ms = value?.toMillis?.() || Date.parse(value || '')
  return Number.isFinite(ms) && ms > 0 ? new Date(ms).toLocaleString() : ''
}

function compactJson(value) {
  if (!value) return ''
  try { return JSON.stringify(value).slice(0, 180) } catch { return '' }
}

function emptyEvidence(reason = '') {
  return { runs: [], steps: [], actions: [], evidence: [], reason }
}

export default function IssueDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [r, setR] = useState(null)
  const [agentEvidence, setAgentEvidence] = useState(null)
  const [busy, setBusy] = useState(false)
  const [verify, setVerify] = useState(null)
  const [msg, setMsg] = useState('')
  const afterRef = useRef()

  const reload = () => getReport(id).then(setR)
  useEffect(() => { reload() }, [id])
  useEffect(() => {
    let alive = true
    let settled = false
    setAgentEvidence(null)
    if (!r) return () => { alive = false }
    const timeout = setTimeout(() => {
      if (alive && !settled) {
        setAgentEvidence(emptyEvidence('Audit records are still loading or not available from this environment yet.'))
      }
    }, 5000)
    getAgentEvidence(id, r.agentRunId).then((data) => {
      settled = true
      clearTimeout(timeout)
      if (alive) setAgentEvidence(data)
    }).catch(() => {
      settled = true
      clearTimeout(timeout)
      if (alive) setAgentEvidence(emptyEvidence('Audit records are not available from this environment yet.'))
    })
    return () => { alive = false; clearTimeout(timeout) }
  }, [id, r?.id, r?.agentRunId])

  if (!r) return <div className="page narrow"><p className="muted">Loading…</p></div>

  const stepIdx = STATUS_FLOW.indexOf(r.status)

  async function setStatus(s) { setBusy(true); await advanceStatus(id, s); await reload(); setBusy(false) }

  async function vote() { if (!user) return; await upvoteReport(id, user.uid); await reload() }

  async function onAfter(e) {
      const file = e.target.files?.[0]; if (!file) return
    setBusy(true); setMsg(''); setVerify(null)
    try {
      const after = await fileToCompressed(file)
      const uploaded = await uploadVerificationImage(user.uid, after.dataUrl)
      const v = await verifyResolutionEvidence({
        reportId: id,
        userId: user?.uid || null,
        beforePhotoUrl: r.photoUrl,
        after: after.base64,
        afterPhotoUrl: uploaded.url,
        mimeType: after.mimeType,
        category: r.category,
      })
      setVerify(v)
      if (v.resolved) {
        // AI confirmed the fix → mark Verified Fixed
        await advanceStatus(id, 'verified', {
          afterPhotoUrl: uploaded.url, afterPhotoStoragePath: uploaded.path, verifyNote: v.note, verifyConfidence: v.confidence,
          verificationRunId: v.verificationRunId,
        })
      } else {
        // AI rejected the fix → keep status, store the attempt + note (no false "resolved")
        await updateReportFields(id, {
          afterPhotoUrl: uploaded.url, afterPhotoStoragePath: uploaded.path, verifyNote: v.note, verifyConfidence: v.confidence,
          verificationRunId: v.verificationRunId,
        })
      }
      await reload()
      const refreshed = await getAgentEvidence(id, r.agentRunId)
      setAgentEvidence(refreshed)
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

          <div className="agent-audit liquid-glass">
            <div className="audit-head">
              <div>
                <h3>Agent audit trail</h3>
                <p className="muted">Server-recorded reasoning, actions, and verification evidence.</p>
              </div>
              <span>{agentEvidence ? `${agentEvidence.runs.length} run${agentEvidence.runs.length === 1 ? '' : 's'}` : 'Loading'}</span>
            </div>

            {agentEvidence && agentEvidence.runs.length === 0 && (
              <p className="muted audit-empty">{agentEvidence.reason || 'No server audit trail is linked to this report yet.'}</p>
            )}

            {agentEvidence?.runs.slice(0, 3).map((run) => (
              <div className="audit-run" key={run.id}>
                <div className="audit-title">
                  <b>{run.type || 'agent_run'}</b>
                  <span>{run.status}</span>
                </div>
                <p>{run.summary || 'No summary recorded.'}</p>
                <small>{timeLabel(run.startedAt || run.completedAt)} · {run.id}</small>
              </div>
            ))}

            {agentEvidence?.steps.length > 0 && (
              <div className="audit-list">
                <h4>Steps</h4>
                {agentEvidence.steps.slice(0, 8).map((step) => (
                  <div className="audit-row" key={step.id}>
                    <span>{step.step}</span>
                    <b className={step.status === 'error' ? 'bad' : ''}>{step.status}</b>
                    {step.latencyMs != null && <em>{step.latencyMs}ms</em>}
                  </div>
                ))}
              </div>
            )}

            {agentEvidence?.actions.length > 0 && (
              <div className="audit-list">
                <h4>Actions</h4>
                {agentEvidence.actions.slice(0, 8).map((action) => (
                  <div className="audit-row" key={action.id} title={compactJson(action.payload)}>
                    <span>{action.actionType}</span>
                    <b>{action.status}</b>
                    {action.selfCorrected && <em>self-corrected</em>}
                  </div>
                ))}
              </div>
            )}

            {agentEvidence?.evidence.length > 0 && (
              <div className="audit-list">
                <h4>Fix evidence</h4>
                {agentEvidence.evidence.slice(0, 4).map((evidence) => (
                  <div className="audit-proof" key={evidence.id}>
                    <span>{evidence.resolved ? 'Verified fixed' : 'Manual review needed'}</span>
                    <b>{Math.round((evidence.confidence || 0) * 100)}%</b>
                    <p>{evidence.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
