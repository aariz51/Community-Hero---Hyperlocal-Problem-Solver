import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useReports } from '../hooks/useReports'
import { fileToCompressed } from '../lib/imageUtils'
import { getCurrentPosition } from '../lib/geo'
import { reverseGeocode } from '../lib/mapsLoader'
import { classifyIssue, draftComplaint, predictEscalation } from '../lib/api'
import { routeToDepartment, CATEGORIES, CATEGORY_META, SEVERITY_COLOR } from '../agent/departments'
import { createReport, findNearbyDuplicate, upvoteReport } from '../lib/reports'

const STEPS = [
  ['perceive', '🧠 Perceiving image (Gemini Vision)'],
  ['locate', '📍 Locating & reverse-geocoding'],
  ['dedupe', '🔁 Checking for duplicates nearby'],
  ['route', '🏛️ Routing to department'],
  ['draft', '✍️ Drafting official complaint'],
  ['predict', '🔮 Predicting escalation risk'],
]

export default function Report() {
  const { user, login } = useAuth()
  const { reports } = useReports()
  const nav = useNavigate()
  const cameraRef = useRef()
  const uploadRef = useRef()
  const [preview, setPreview] = useState(null)
  const [img, setImg] = useState(null) // {dataUrl, base64, mimeType}
  const [running, setRunning] = useState(false)
  const [stepState, setStepState] = useState({})
  const [result, setResult] = useState(null) // assembled agent output
  const [duplicate, setDuplicate] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
      // 1. Perceive
      mark('perceive', 'run')
      const cls = await classifyIssue(img.base64, img.mimeType)
      if (!cls.isCivicIssue || !cls.isGenuine) {
        mark('perceive', 'fail')
        setError(`This doesn't look like a genuine civic issue (${cls.description}). Please upload a clear photo of the problem.`)
        setRunning(false); return
      }
      mark('perceive', 'done')

      // 2. Locate
      mark('locate', 'run')
      let geo, address
      try { geo = await getCurrentPosition(); address = await reverseGeocode(geo) }
      catch { geo = { lat: 28.6139, lng: 77.209 }; address = 'Location unavailable (approx.)' }
      mark('locate', 'done')

      // 3. Dedupe
      mark('dedupe', 'run')
      const dup = findNearbyDuplicate(reports, geo, cls.category)
      mark('dedupe', 'done')

      // 4. Route
      mark('route', 'run')
      const routing = routeToDepartment(cls.category)
      mark('route', 'done')

      const base = {
        category: cls.category, severity: cls.severity, description: cls.description,
        confidence: cls.confidence, address, geo,
        department: routing.department, sla: routing.slaDays,
      }

      // 5. Draft complaint
      mark('draft', 'run')
      let complaintLetter = ''
      try { complaintLetter = (await draftComplaint(base)).letter } catch {}
      mark('draft', complaintLetter ? 'done' : 'fail')

      // 6. Predict escalation
      mark('predict', 'run')
      let prediction = null
      try { prediction = await predictEscalation(base) } catch {}
      mark('predict', prediction ? 'done' : 'fail')

      setResult({ ...base, complaintLetter, prediction })
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
      const id = await createReport({
        userId: user.uid,
        userName: user.displayName || 'Citizen',
        photoUrl: img.dataUrl,
        category: result.category,
        severity: result.severity,
        description: result.description,
        confidence: result.confidence,
        address: result.address,
        geo: result.geo,
        department: result.department,
        sla: result.sla,
        complaintLetter: result.complaintLetter || '',
        escalationRisk: result.prediction?.riskScore ?? null,
        escalationReason: result.prediction?.reason ?? '',
      })
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
      <h2>Report a civic issue</h2>
      <p className="muted">Sign in to file and track reports. Your reports earn you civic points.</p>
      <button className="btn btn-primary" onClick={login}>Sign in with Google</button>
    </div>
  )

  return (
    <div className="page narrow">
      <h2>Report a civic issue</h2>
      <p className="muted">Snap a photo — the CivicPulse agent does the rest.</p>

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
              {STEPS.map(([k, label]) => (
                <div key={k} className={`agent-step ${stepState[k] || ''}`}>
                  <span className="dot" />{label}
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
          <div className="kv"><b>📍 Location</b><span>{result.address}</span></div>
          <div className="kv"><b>🏛️ Routed to</b><span>{result.department} · SLA {result.sla}d</span></div>
          {result.prediction && (
            <div className="kv"><b>🔮 Escalation risk</b>
              <span>{result.prediction.riskScore}/100 — {result.prediction.reason}</span></div>
          )}
          {result.complaintLetter && (
            <details className="letter"><summary>✍️ AI-drafted official complaint</summary>
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
