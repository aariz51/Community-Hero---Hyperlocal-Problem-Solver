import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useReports } from '../hooks/useReports'
import AuthPanel from '../components/AuthPanel'
import { fileToCompressed } from '../lib/imageUtils'
import { getCurrentPosition } from '../lib/geo'
import { attachAgentRunToReport, runReportAgent } from '../lib/api'
import { routeToDepartment, CATEGORIES, CATEGORY_META, SEVERITY_COLOR } from '../agent/departments'
import { createReport, findNearbyDuplicate, upvoteReport } from '../lib/reports'
import { uploadReportImage } from '../lib/storageUploads'

const STEPS = [
  ['perceive', 'eye', 'Perceiving image (Gemini Vision)'],
  ['locate', 'pin', 'Locating & reverse-geocoding'],
  ['dedupe', 'layers', 'Checking for duplicates nearby'],
  ['route', 'building', 'Routing to department'],
  ['draft', 'file', 'Drafting official complaint'],
  ['predict', 'trend', 'Predicting escalation risk'],
]

const STEP_ICONS = {
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  pin: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
  layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></>,
  building: <><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M2 22h20" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></>,
  trend: <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>,
}
function StepIcon({ name }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {STEP_ICONS[name]}
    </svg>
  )
}

export default function Report() {
  const { user } = useAuth()
  const { reports } = useReports()
  const nav = useNavigate()
  const cameraRef = useRef()
  const uploadRef = useRef()
  const [preview, setPreview] = useState(null)
  const [img, setImg] = useState(null)
  const [running, setRunning] = useState(false)
  const [stepState, setStepState] = useState({})
  const [result, setResult] = useState(null)
  const [duplicate, setDuplicate] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reporterName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'A concerned citizen')
  const mark = (k, v) => setStepState((s) => ({ ...s, [k]: v }))

  async function onPick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setResult(null); setDuplicate(null); setStepState({})
    const compressed = await fileToCompressed(file)
    setImg(compressed)
    setPreview(compressed.dataUrl)
  }

  async function runAgent() {
    if (!img) return
    setRunning(true); setError(''); setDuplicate(null)
    try {
      STEPS.forEach(([k]) => mark(k, 'run'))
      let geo
      try {
        geo = await getCurrentPosition()
      } catch {
        geo = { lat: 28.6139, lng: 77.209 }
      }

      const agent = await runReportAgent({
        image: img.base64,
        mimeType: img.mimeType,
        geo,
        reporterName,
        userId: user?.uid,
        activeReports: reports.map((r) => ({
          id: r.id,
          category: r.category,
          status: r.status,
          address: r.address,
          geo: r.geo,
        })),
      })

      if (agent.rejected) {
        mark('perceive', 'fail')
        setError(`This doesn't look like a genuine civic issue (${agent.classification?.description || 'image rejected'}). Please upload a clear photo of the problem.`)
        setRunning(false); return
      }

      const serverResult = agent.result || {}
      STEPS.forEach(([k]) => mark(k, 'done'))
      if (!serverResult.complaintLetter) mark('draft', 'fail')
      if (!serverResult.prediction) mark('predict', 'fail')

      setResult(serverResult)
      const dup = agent.duplicate || findNearbyDuplicate(reports, geo, serverResult.category)
      if (dup) setDuplicate(dup)
    } catch (e) {
      setError(e.message || 'Agent failed. Check the Gemini API key on the server.')
    } finally {
      setRunning(false)
    }
  }

  async function submit() {
    if (!result || !user) return
    setSubmitting(true)
    try {
      const photo = await uploadReportImage(user.uid, img.dataUrl)
      const id = await createReport({
        userId: user.uid,
        userName: reporterName,
        photoUrl: photo.url,
        photoStoragePath: photo.path,
        category: result.category,
        severity: result.severity,
        description: result.description,
        confidence: result.confidence,
        address: result.address || 'Location not specified',
        geo: result.geo,
        department: result.department,
        sla: result.sla,
        complaintLetter: result.complaintLetter || '',
        escalationRisk: result.prediction?.riskScore ?? null,
        escalationReason: result.prediction?.reason ?? '',
        fallbackDepartment: result.fallbackDepartment || '',
        agentRunId: result.agentRunId || '',
      })
      if (result.agentRunId) await attachAgentRunToReport(result.agentRunId, id, user.uid)
      nav(`/issue/${id}`)
    } catch (e) { setError(e.message) } finally { setSubmitting(false) }
  }

  async function upvoteDuplicate() {
    if (!duplicate || !user) return
    await upvoteReport(duplicate.id, user.uid)
    nav(`/issue/${duplicate.id}`)
  }

  if (!user) return (
    <div className="page narrow center">
      <AuthPanel
        title="Report a civic issue"
        subtitle="Sign in with the demo ID or create an account to file and track reports."
      />
    </div>
  )

  return (
    <div className="page narrow">
      <h2>Report a civic issue</h2>
      <p className="muted">Snap a photo — the CivicPulse agent does the rest.</p>
      <p className="loc-note">📍 CivicPulse will ask to use your location <b>only</b> to pin this issue on the public map and route it to the right local department. You can also type the address.</p>

      <div className="report-grid">
        <div>
          <div className="uploader liquid-glass">
            {preview ? <img src={preview} alt="preview" /> : (
              <div className="uploader-empty">
                <div className="big">📸</div>
                <div>Add a photo of the civic issue</div>
              </div>
            )}
          </div>
          <div className="upload-choices">
            <button className="btn btn-ghost liquid-glass" onClick={() => cameraRef.current?.click()}>📷 Take photo</button>
            <button className="btn btn-ghost liquid-glass" onClick={() => uploadRef.current?.click()}>⬆️ Upload photo</button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
          <input ref={uploadRef} type="file" accept="image/*" hidden onChange={onPick} />
        </div>

        <div>
          {img && !result && (
            <button className="btn btn-primary block" disabled={running} onClick={runAgent}>
              {running ? 'Agent working…' : '🤖 Run CivicPulse Agent'}
            </button>
          )}

          {(running || Object.keys(stepState).length > 0) && (
            <div className="agent-steps">
              {STEPS.map(([k, ico, label]) => (
                <div key={k} className={`agent-step ${stepState[k] || ''}`}>
                  <span className="dot" />
                  <span className="ag-ico"><StepIcon name={ico} /></span>
                  <span className="ag-label">{label}</span>
                  <span className="st">{stepState[k] === 'done' ? '✓' : stepState[k] === 'fail' ? '⚠' : stepState[k] === 'run' ? '…' : ''}</span>
                </div>
              ))}
            </div>
          )}
          {error && <div className="alert error">{error}</div>}
        </div>
      </div>

      {duplicate && (
        <div className="alert warn">
          ⚠️ A similar <b>{duplicate.category}</b> report exists ~nearby. Avoid duplicates — verify the existing one instead?
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={upvoteDuplicate}>👍 Verify existing report</button>
          </div>
        </div>
      )}

      {result && (
        <div className="result-card liquid-glass">
          <div className="result-head">
            <span className="cat-chip" style={{ background: CATEGORY_META[result.category]?.color }}>
              {CATEGORY_META[result.category]?.icon} {result.category}
            </span>
            <span className="sev-chip" style={{ color: SEVERITY_COLOR[result.severity] }}>● {result.severity}</span>
            <span className="muted">{Math.round((result.confidence || 0) * 100)}% confidence</span>
          </div>
          <p className="desc">{result.description}</p>
          <div className="kv"><b>📍 Location</b>
            <input className="addr-input" value={result.address} placeholder="Street / area (allow location or type it)"
              onChange={(e) => setResult({ ...result, address: e.target.value })} />
          </div>
          <div className="kv"><b>🏛️ Routed to</b><span>{result.department} · SLA {result.sla}d</span></div>
          {result.prediction && (
            <div className="kv"><b>🔮 Escalation risk</b>
              <span>{result.prediction.riskScore}/100 — {result.prediction.reason}</span></div>
          )}
          {result.complaintLetter && (
            <details className="letter"><summary>✍️ AI-drafted official complaint (signed as {reporterName})</summary>
              <pre>{result.complaintLetter}</pre></details>
          )}

          <div className="edit-row">
            <label>Category
              <select value={result.category} onChange={(e) => setResult({ ...result, category: e.target.value, department: routeToDepartment(e.target.value).department, sla: routeToDepartment(e.target.value).slaDays })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>Severity
              <select value={result.severity} onChange={(e) => setResult({ ...result, severity: e.target.value })}>
                {['Low', 'Medium', 'High', 'Critical'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          </div>

          <button className="btn btn-primary block" disabled={submitting} onClick={submit}>
            {submitting ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      )}
    </div>
  )
}
