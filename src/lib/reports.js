// Firestore data layer for reports + gamification (points/badges) + dedupe.
import {
  collection, addDoc, doc, getDoc, getDocs, updateDoc, onSnapshot, query, orderBy, where,
  serverTimestamp, increment, arrayUnion, runTransaction,
} from 'firebase/firestore'
import { db } from '../firebase'
import { distanceMeters } from './geo'

const reportsCol = collection(db, 'reports')

// Realtime subscription to all reports (newest first).
export function subscribeReports(cb) {
  const q = query(reportsCol, orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export async function getReport(id) {
  const snap = await getDoc(doc(db, 'reports', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

function sortByTime(items) {
  return [...items].sort((a, b) => {
    const av = a.createdAt?.toMillis?.() || a.updatedAt?.toMillis?.() || Date.parse(a.startedAt || a.completedAt || '') || 0
    const bv = b.createdAt?.toMillis?.() || b.updatedAt?.toMillis?.() || Date.parse(b.startedAt || b.completedAt || '') || 0
    return av - bv
  })
}

async function byField(collectionName, field, value) {
  if (!value) return []
  const snap = await getDocs(query(collection(db, collectionName), where(field, '==', value)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getAgentEvidence(reportId, agentRunId = null) {
  const directRun = agentRunId ? await getDoc(doc(db, 'agent_runs', agentRunId)) : null
  const reportRuns = await byField('agent_runs', 'reportId', reportId)
  const runsById = new Map(reportRuns.map((r) => [r.id, r]))
  if (directRun?.exists()) runsById.set(directRun.id, { id: directRun.id, ...directRun.data() })

  const runs = sortByTime([...runsById.values()])
  const steps = []
  const actions = []
  for (const run of runs) {
    steps.push(...await byField('agent_steps', 'runId', run.id))
    actions.push(...await byField('agent_actions', 'runId', run.id))
  }

  return {
    runs,
    steps: sortByTime(steps),
    actions: sortByTime(actions),
    evidence: sortByTime(await byField('verification_evidence', 'reportId', reportId)),
  }
}

// Dedupe: find an existing OPEN report of the same category within 60m.
export function findNearbyDuplicate(reports, { lat, lng }, category, radius = 60) {
  return reports.find(
    (r) => r.category === category &&
      !['resolved', 'verified'].includes(r.status) &&
      r.geo && distanceMeters(r.geo, { lat, lng }) <= radius
  )
}

export async function createReport(data) {
  const ref = await addDoc(reportsCol, {
    ...data,
    status: 'reported',
    votes: 1,
    voterIds: [data.userId],
    duplicateOf: null,
    statusHistory: [{ status: 'reported', at: Date.now() }],
    createdAt: serverTimestamp(),
  })
  await awardPoints(data.userId, 10, 'report')
  return ref.id
}

// When a duplicate is detected, just upvote the original instead of a new doc.
export async function upvoteReport(reportId, userId) {
  const ref = doc(db, 'reports', reportId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) return
    const d = snap.data()
    if ((d.voterIds || []).includes(userId)) return
    tx.update(ref, { votes: increment(1), voterIds: arrayUnion(userId) })
  })
  await awardPoints(userId, 2, 'verify')
}

export async function advanceStatus(reportId, status, extra = {}) {
  await updateDoc(doc(db, 'reports', reportId), {
    status,
    statusHistory: arrayUnion({ status, at: Date.now() }),
    ...extra,
  })
}

// Update fields without changing status (e.g. a rejected fix attempt).
export async function updateReportFields(reportId, fields = {}) {
  await updateDoc(doc(db, 'reports', reportId), fields)
}

const BADGES = [
  { id: 'first_report', label: 'First Report', at: 10 },
  { id: 'active_citizen', label: 'Active Citizen', at: 50 },
  { id: 'community_hero', label: 'Community Hero', at: 150 },
  { id: 'civic_legend', label: 'Civic Legend', at: 300 },
]

export async function awardPoints(userId, pts, kind) {
  if (!userId) return
  const ref = doc(db, 'users', userId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const cur = snap.exists() ? snap.data() : { points: 0, badges: [], reportCount: 0 }
    const points = (cur.points || 0) + pts
    const badges = new Set(cur.badges || [])
    BADGES.forEach((b) => { if (points >= b.at) badges.add(b.id) })
    tx.set(ref, {
      ...cur,
      points,
      badges: [...badges],
      reportCount: (cur.reportCount || 0) + (kind === 'report' ? 1 : 0),
    }, { merge: true })
  })
}

export { BADGES }
