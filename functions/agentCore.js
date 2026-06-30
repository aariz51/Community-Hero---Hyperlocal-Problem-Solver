import { getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { Type } from '@google/genai'

const MODEL = 'gemini-2.5-flash'
const DEDUPE_RADIUS_METERS = 60
const ESCALATION_FAILURE_HOURS = 24

const CATEGORIES = [
  'Pothole',
  'Water Leakage',
  'Streetlight',
  'Garbage/Waste',
  'Road Damage',
  'Drainage',
  'Fallen Tree',
  'Other',
]

const ROUTING = {
  Pothole: { department: 'Public Works Dept (PWD)', slaDays: 5, fallbackDepartment: 'Municipal Engineering Commissioner' },
  'Road Damage': { department: 'Public Works Dept (PWD)', slaDays: 5, fallbackDepartment: 'Municipal Engineering Commissioner' },
  'Water Leakage': { department: 'Water Supply & Sewerage Board', slaDays: 2, fallbackDepartment: 'Chief Water Works Engineer' },
  Drainage: { department: 'Water Supply & Sewerage Board', slaDays: 3, fallbackDepartment: 'Stormwater Drainage Cell' },
  Streetlight: { department: 'Electrical / Street Lighting', slaDays: 4, fallbackDepartment: 'Electrical Zonal Engineer' },
  'Garbage/Waste': { department: 'Sanitation & Waste Management', slaDays: 1, fallbackDepartment: 'Chief Sanitation Officer' },
  'Fallen Tree': { department: 'Parks & Horticulture', slaDays: 2, fallbackDepartment: 'Disaster Response Cell' },
  Other: { department: 'Municipal Grievance Cell', slaDays: 7, fallbackDepartment: 'Ward Commissioner Office' },
}

const SEVERITY_RANK = { Critical: 4, High: 3, Medium: 2, Low: 1 }

const img = (data, mimeType = 'image/jpeg') => ({ inlineData: { data, mimeType } })
const nowIso = () => new Date().toISOString()
const safeId = (value) => String(value || 'unknown').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120)
const adminReason = (error) => {
  const message = String(error?.message || error || '')
  if (message.includes('Unable to detect a Project Id')) {
    return 'Firestore Admin is unavailable in this local environment. Deploy to Firebase Functions or configure application default credentials.'
  }
  return message
}

let cachedDb
export function getAdminDb() {
  if (cachedDb) return cachedDb
  try {
    if (!getApps().length) initializeApp()
    cachedDb = getFirestore()
  } catch {
    cachedDb = null
  }
  return cachedDb
}

export function setAdminDbForTests(db) {
  cachedDb = db
}

export function resetAdminDbForTests() {
  cachedDb = null
}

function routeToDepartment(category) {
  return ROUTING[category] || ROUTING.Other
}

function distanceMeters(a, b) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function nearbyDuplicate(reports = [], geo, category) {
  if (!geo || typeof geo.lat !== 'number' || typeof geo.lng !== 'number') return null
  return reports.find((r) =>
    r.category === category &&
    !['resolved', 'verified'].includes(r.status) &&
    r.geo &&
    distanceMeters(r.geo, geo) <= DEDUPE_RADIUS_METERS
  ) || null
}

async function writeDoc(collection, id, data, { merge = true } = {}) {
  const db = getAdminDb()
  if (!db) return null
  const ref = id ? db.collection(collection).doc(id) : db.collection(collection).doc()
  try {
    await ref.set({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge })
    return ref
  } catch {
    cachedDb = null
    return null
  }
}

async function addDoc(collection, data) {
  const db = getAdminDb()
  if (!db) return null
  try {
    const ref = await db.collection(collection).add({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return ref
  } catch {
    cachedDb = null
    return null
  }
}

async function recordStep(runId, step, status, payload = {}) {
  const stepId = `${runId}_${safeId(step)}`
  await writeDoc('agent_steps', stepId, {
    runId,
    step,
    status,
    ...payload,
  })
  return stepId
}

async function recordAction(runId, actionType, payload = {}) {
  const ref = await addDoc('agent_actions', {
    runId,
    actionType,
    status: payload.status || 'planned',
    reportId: payload.reportId || null,
    reason: payload.reason || '',
    selfCorrected: Boolean(payload.selfCorrected),
    payload,
  })
  return ref?.id || null
}

async function remember(key, patch) {
  await writeDoc('agent_memory', safeId(key), {
    key,
    ...patch,
    lastSeenAt: FieldValue.serverTimestamp(),
  })
}

async function geminiJson(ai, request, fallback, stepName, runId) {
  const started = Date.now()
  try {
    const r = await ai.models.generateContent(request)
    const output = JSON.parse(r.text)
    await recordStep(runId, stepName, 'done', {
      latencyMs: Date.now() - started,
      output,
      model: request.model,
    })
    return output
  } catch (e) {
    const error = String(e?.message || e)
    await recordStep(runId, stepName, 'error', {
      latencyMs: Date.now() - started,
      error,
      fallback,
      model: request.model,
    })
    return fallback
  }
}

async function geocodeAddress(geo) {
  if (!geo?.lat || !geo?.lng) return ''
  const key = process.env.GEOCODE_KEY || process.env.MAPS_SERVER_KEY
  try {
    if (key) {
      const gr = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${geo.lat},${geo.lng}&key=${key}`)
      const gd = await gr.json()
      if (gd.status === 'OK' && gd.results?.length) {
        const r0 = gd.results.find((r) => r.types?.includes('route')) || gd.results[0]
        return r0.formatted_address || ''
      }
    }
  } catch {}
  return ''
}

export async function runReportOrchestrator(ai, input = {}) {
  const runRef = await addDoc('agent_runs', {
    type: 'report_triage',
    status: 'running',
    userId: input.userId || null,
    userName: input.reporterName || null,
    reportId: null,
    startedAt: nowIso(),
    source: 'server_orchestrator',
  })
  const runId = runRef?.id || `local_${Date.now()}`

  const steps = []
  const mark = async (step, status, payload = {}) => {
    steps.push({ step, status, ...payload })
    await recordStep(runId, step, status, payload)
  }

  await mark('perceive', 'running')
  const cls = await geminiJson(ai, {
    model: MODEL,
    contents: [{ role: 'user', parts: [
      img(input.image, input.mimeType),
      { text: `You are a civic-infrastructure inspector. Analyze this photo of a reported community issue.
Decide if it is a GENUINE civic infrastructure problem (not a selfie, meme, indoor, or unrelated image).
Categorize it, rate severity, and write a crisp one-line description an official could act on.` },
    ] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isCivicIssue: { type: Type.BOOLEAN },
          isGenuine: { type: Type.BOOLEAN },
          category: { type: Type.STRING, enum: CATEGORIES },
          severity: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Critical'] },
          description: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
        },
        required: ['isCivicIssue', 'isGenuine', 'category', 'severity', 'description', 'confidence'],
      },
    },
  }, {
    isCivicIssue: true,
    isGenuine: true,
    category: 'Other',
    severity: 'Medium',
    description: input.description || 'Civic issue reported by resident.',
    confidence: 0.5,
  }, 'perceive', runId)

  if (!cls.isCivicIssue || !cls.isGenuine) {
    await recordAction(runId, 'reject_non_civic_image', { status: 'executed', reason: cls.description })
    await writeDoc('agent_runs', runId, { status: 'rejected', summary: cls.description, completedAt: nowIso() })
    return { runId, steps, classification: cls, rejected: true }
  }

  await mark('locate', 'running')
  const address = input.address || await geocodeAddress(input.geo) || ''
  await recordStep(runId, 'locate', 'done', { output: { geo: input.geo || null, address } })

  await mark('dedupe', 'running')
  const duplicate = nearbyDuplicate(input.activeReports || [], input.geo, cls.category)
  await recordStep(runId, 'dedupe', 'done', {
    output: duplicate ? { duplicateId: duplicate.id, category: duplicate.category, address: duplicate.address } : { duplicateId: null },
  })
  if (duplicate) {
    await recordAction(runId, 'offer_duplicate_verification', {
      status: 'planned',
      reason: `Existing ${cls.category} report within ${DEDUPE_RADIUS_METERS} meters`,
      duplicateId: duplicate.id,
    })
  }

  await mark('route', 'running')
  const routing = routeToDepartment(cls.category)
  await recordStep(runId, 'route', 'done', { output: routing })
  await recordAction(runId, 'route_to_department', {
    status: 'planned',
    department: routing.department,
    fallbackDepartment: routing.fallbackDepartment,
    slaDays: routing.slaDays,
    reason: `Category ${cls.category} maps to ${routing.department}`,
  })

  const base = {
    category: cls.category,
    severity: cls.severity,
    description: cls.description,
    confidence: cls.confidence,
    address,
    geo: input.geo || null,
    department: routing.department,
    fallbackDepartment: routing.fallbackDepartment,
    sla: routing.slaDays,
    reporterName: input.reporterName || 'A concerned citizen',
  }

  await mark('draft', 'running')
  const draft = await geminiJson(ai, {
    model: MODEL,
    contents: `Write a concise, formal municipal complaint letter as JSON with a single "letter" field (max 170 words) that a resident named "${base.reporterName}" can send to the "${base.department}".
Issue: ${base.category} (${base.severity} severity)${base.address ? ' at ' + base.address : ''}.
Details: ${base.description}.
Tone: respectful, firm, references civic responsibility and requests resolution within ${base.sla} days.
End with a sign-off using the resident's name "${base.reporterName}".`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: { letter: { type: Type.STRING } },
        required: ['letter'],
      },
    },
  }, { letter: '' }, 'draft', runId)

  await mark('predict', 'running')
  const prediction = await geminiJson(ai, {
    model: MODEL,
    contents: `A civic issue: ${base.category}, severity ${base.severity}, at ${base.address}. Description: ${base.description}.
Assess the risk that this WORSENS or causes harm if not fixed soon (consider monsoon/water, traffic, public safety, disease).`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          willWorsen: { type: Type.BOOLEAN },
          riskScore: { type: Type.NUMBER },
          reason: { type: Type.STRING },
        },
        required: ['willWorsen', 'riskScore', 'reason'],
      },
    },
  }, { willWorsen: SEVERITY_RANK[base.severity] >= 3, riskScore: SEVERITY_RANK[base.severity] * 20, reason: 'Fallback risk score based on severity.' }, 'predict', runId)

  await remember(`category:${base.category}`, {
    lastDepartment: base.department,
    fallbackDepartment: base.fallbackDepartment,
    lastSeverity: base.severity,
    lastRiskScore: prediction.riskScore,
  })
  await recordAction(runId, 'draft_complaint_letter', { status: draft.letter ? 'executed' : 'skipped', reportId: null })
  await recordAction(runId, 'predict_escalation_risk', { status: 'executed', riskScore: prediction.riskScore, reason: prediction.reason })
  await writeDoc('agent_runs', runId, {
    status: 'completed',
    completedAt: nowIso(),
    summary: `${base.category} classified as ${base.severity}; routed to ${base.department}; risk ${prediction.riskScore}/100.`,
  })

  return {
    runId,
    steps,
    duplicate,
    result: {
      ...base,
      complaintLetter: draft.letter || '',
      prediction,
      agentRunId: runId,
    },
  }
}

export async function attachReportToRun(runId, reportId, userId = null) {
  if (!runId || !reportId) return { ok: false }
  await writeDoc('agent_runs', runId, { reportId, userId })
  const db = getAdminDb()
  if (db) {
    try {
      const snap = await db.collection('agent_actions').where('runId', '==', runId).get()
      const batch = db.batch()
      snap.docs.forEach((docSnap) => batch.update(docSnap.ref, { reportId, updatedAt: FieldValue.serverTimestamp() }))
      await batch.commit()
    } catch {
      cachedDb = null
    }
  }
  await remember(`report:${reportId}`, {
    reportId,
    currentEscalationDepartment: null,
    escalationAttempts: 0,
    actionHistory: [`${nowIso()} - report attached to agent run ${runId}`],
  })
  return { ok: true }
}

export async function verifyResolutionWithEvidence(ai, input = {}) {
  const runRef = await addDoc('agent_runs', {
    type: 'fix_verification',
    status: 'running',
    reportId: input.reportId || null,
    userId: input.userId || null,
    startedAt: nowIso(),
    source: 'server_verification',
  })
  const runId = runRef?.id || `verify_${Date.now()}`
  await recordStep(runId, 'compare_before_after', 'running')
  const output = await geminiJson(ai, {
    model: MODEL,
    contents: [{ role: 'user', parts: [
      { text: `BEFORE photo of a reported "${input.category}" issue:` }, img(input.before, input.mimeType),
      { text: 'AFTER photo claiming it is now fixed:' }, img(input.after, input.mimeType),
      { text: `Compare them. Has the ${input.category} issue genuinely been resolved in the AFTER photo? Be skeptical of mismatched locations or staged photos.` },
    ] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          resolved: { type: Type.BOOLEAN },
          confidence: { type: Type.NUMBER },
          note: { type: Type.STRING },
        },
        required: ['resolved', 'confidence', 'note'],
      },
    },
  }, { resolved: false, confidence: 0.3, note: 'AI verification unavailable; manual review required.' }, 'compare_before_after', runId)

  await addDoc('verification_evidence', {
    runId,
    reportId: input.reportId || null,
    userId: input.userId || null,
    category: input.category || null,
    afterPhotoUrl: input.afterPhotoUrl || null,
    resolved: output.resolved,
    confidence: output.confidence,
    note: output.note,
  })
  await recordAction(runId, output.resolved ? 'mark_verified_fixed' : 'request_manual_review', {
    status: output.resolved ? 'executed' : 'planned',
    reportId: input.reportId || null,
    reason: output.note,
  })
  await writeDoc('agent_runs', runId, {
    status: output.resolved ? 'completed' : 'needs_review',
    completedAt: nowIso(),
    summary: output.note,
  })
  return { ...output, verificationRunId: runId }
}

async function getMemory(db, reportId) {
  try {
    const snap = await db.collection('agent_memory').doc(safeId(`report:${reportId}`)).get()
    return snap.exists ? snap.data() : {}
  } catch {
    return {}
  }
}

export async function runSlaMonitor({ limit = 40 } = {}) {
  const db = getAdminDb()
  if (!db) return { ok: false, reason: 'Firestore admin unavailable', processed: 0, escalated: 0 }
  let snap
  try {
    snap = await db.collection('reports').where('status', 'in', ['reported', 'acknowledged', 'in_progress']).limit(limit).get()
  } catch (e) {
    cachedDb = null
    return { ok: false, reason: adminReason(e), processed: 0, escalated: 0 }
  }
  const now = Date.now()
  const results = []
  for (const docSnap of snap.docs) {
    const report = { id: docSnap.id, ...docSnap.data() }
    const created = report.createdAt?.toMillis ? report.createdAt.toMillis() : Number(report.statusHistory?.[0]?.at || now)
    const slaDays = Number(report.sla || routeToDepartment(report.category).slaDays || 3)
    const overdue = now - created > slaDays * 24 * 60 * 60 * 1000
    if (!overdue) continue

    const runRef = await addDoc('agent_runs', {
      type: 'sla_monitor',
      status: 'running',
      reportId: report.id,
      startedAt: nowIso(),
      source: 'cloud_scheduler',
    })
    const runId = runRef?.id || `sla_${report.id}_${Date.now()}`
    const memory = await getMemory(db, report.id)
    const routing = routeToDepartment(report.category)
    const failedAttempts = Number(memory.escalationAttempts || report.escalationAttempts || 0)
    const lastAt = memory.lastEscalationAt ? Date.parse(memory.lastEscalationAt) : 0
    const shouldSelfCorrect = failedAttempts > 0 && now - lastAt > ESCALATION_FAILURE_HOURS * 60 * 60 * 1000
    const target = shouldSelfCorrect ? (report.fallbackDepartment || routing.fallbackDepartment) : (report.department || routing.department)
    const actionHistory = Array.isArray(memory.actionHistory) ? memory.actionHistory : []
    const actionLabel = shouldSelfCorrect
      ? `self-corrected escalation to ${target}`
      : `sla escalation to ${target}`

    await recordStep(runId, 'scan_overdue_issue', 'done', {
      output: { reportId: report.id, slaDays, status: report.status, overdue: true },
    })
    await recordAction(runId, 'escalate_overdue_issue', {
      status: 'executed',
      reportId: report.id,
      department: target,
      selfCorrected: shouldSelfCorrect,
      reason: `SLA of ${slaDays} day(s) exceeded.`,
    })
    await docSnap.ref.update({
      status: 'in_progress',
      escalatedAt: FieldValue.serverTimestamp(),
      escalationDepartment: target,
      escalationAttempts: FieldValue.increment(1),
      escalationSelfCorrected: shouldSelfCorrect,
      statusHistory: FieldValue.arrayUnion({
        status: 'in_progress',
        at: now,
        note: actionLabel,
      }),
    })
    await remember(`report:${report.id}`, {
      reportId: report.id,
      currentEscalationDepartment: target,
      escalationAttempts: failedAttempts + 1,
      lastEscalationAt: nowIso(),
      actionHistory: [...actionHistory, `${nowIso()} - ${actionLabel}`].slice(-20),
    })
    await writeDoc('agent_runs', runId, {
      status: 'completed',
      completedAt: nowIso(),
      summary: actionLabel,
    })
    results.push({ reportId: report.id, target, selfCorrected: shouldSelfCorrect })
  }
  return { ok: true, processed: snap.size, escalated: results.length, results }
}

export { MODEL, routeToDepartment }
