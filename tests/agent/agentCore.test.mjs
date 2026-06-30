import assert from 'node:assert/strict'
import test from 'node:test'
import {
  attachReportToRun,
  resetAdminDbForTests,
  runReportOrchestrator,
  runSlaMonitor,
  setAdminDbForTests,
  verifyResolutionWithEvidence,
} from '../../functions/agentCore.js'

class MemoryDocRef {
  constructor(db, collection, id) {
    this.db = db
    this.collection = collection
    this.id = id
  }

  async set(data, options = {}) {
    const current = this.db.getDoc(this.collection, this.id) || {}
    const next = options.merge ? { ...current, ...data } : { ...data }
    this.db.setDoc(this.collection, this.id, this.db.applyTransforms(next, current))
  }

  async update(data) {
    const current = this.db.getDoc(this.collection, this.id) || {}
    this.db.setDoc(this.collection, this.id, this.db.applyTransforms({ ...current, ...data }, current))
  }

  async get() {
    const data = this.db.getDoc(this.collection, this.id)
    return { exists: Boolean(data), id: this.id, ref: this, data: () => data }
  }
}

class MemoryQuery {
  constructor(db, collection, filters = [], max = Infinity) {
    this.db = db
    this.collection = collection
    this.filters = filters
    this.max = max
  }

  where(field, op, value) {
    return new MemoryQuery(this.db, this.collection, [...this.filters, { field, op, value }], this.max)
  }

  limit(max) {
    return new MemoryQuery(this.db, this.collection, this.filters, max)
  }

  async get() {
    let docs = Object.entries(this.db.collections[this.collection] || {}).map(([id, data]) => ({
      id,
      ref: new MemoryDocRef(this.db, this.collection, id),
      data: () => data,
    }))
    for (const filter of this.filters) {
      docs = docs.filter((doc) => {
        const got = doc.data()[filter.field]
        if (filter.op === '==') return got === filter.value
        if (filter.op === 'in') return Array.isArray(filter.value) && filter.value.includes(got)
        throw new Error(`Unsupported test filter op ${filter.op}`)
      })
    }
    docs = docs.slice(0, this.max)
    return { docs, size: docs.length, empty: docs.length === 0 }
  }
}

class MemoryCollection extends MemoryQuery {
  doc(id = this.db.nextId(this.collection)) {
    return new MemoryDocRef(this.db, this.collection, id)
  }

  async add(data) {
    const ref = this.doc()
    await ref.set(data)
    return ref
  }
}

class MemoryBatch {
  constructor() {
    this.ops = []
  }

  update(ref, data) {
    this.ops.push(() => ref.update(data))
  }

  set(ref, data) {
    this.ops.push(() => ref.set(data))
  }

  async commit() {
    for (const op of this.ops) await op()
  }
}

class MemoryFirestore {
  constructor() {
    this.collections = {}
    this.counters = {}
  }

  collection(name) {
    this.collections[name] ||= {}
    return new MemoryCollection(this, name)
  }

  batch() {
    return new MemoryBatch()
  }

  nextId(collection) {
    this.counters[collection] = (this.counters[collection] || 0) + 1
    return `${collection}_${this.counters[collection]}`
  }

  getDoc(collection, id) {
    return this.collections[collection]?.[id] || null
  }

  setDoc(collection, id, data) {
    this.collections[collection] ||= {}
    this.collections[collection][id] = data
  }

  applyTransforms(next, current = {}) {
    current ||= {}
    return Object.fromEntries(Object.entries(next).map(([key, value]) => [key, this.applyTransformValue(value, current[key])]))
  }

  applyTransformValue(value, current) {
    const type = value?.constructor?.name
    if (type === 'ServerTimestampTransform') return new Date()
    if (type === 'NumericIncrementTransform') return Number(current || 0) + Number(value.operand || 0)
    if (type === 'ArrayUnionTransform') return [...(Array.isArray(current) ? current : []), ...value.elements]
    return value
  }

  all(collection) {
    return Object.values(this.collections[collection] || {})
  }
}

function mockAi() {
  return {
    models: {
      async generateContent(request) {
        const properties = request.config?.responseSchema?.properties || {}
        if (properties.isCivicIssue) {
          return { text: JSON.stringify({
            isCivicIssue: true,
            isGenuine: true,
            category: 'Pothole',
            severity: 'High',
            description: 'Deep pothole obstructing the lane.',
            confidence: 0.94,
          }) }
        }
        if (properties.letter) {
          return { text: JSON.stringify({ letter: 'Please repair this high-risk pothole within the SLA. Signed, Test Resident.' }) }
        }
        if (properties.willWorsen) {
          return { text: JSON.stringify({ willWorsen: true, riskScore: 86, reason: 'Traffic and rain will worsen the road hazard.' }) }
        }
        if (properties.resolved) {
          return { text: JSON.stringify({ resolved: true, confidence: 0.91, note: 'The repaired surface matches the original scene.' }) }
        }
        throw new Error('Unexpected Gemini request in test')
      },
    },
  }
}

test('agent core persists run evidence, verifies fixes, and self-corrects overdue escalations', async () => {
  const db = new MemoryFirestore()
  setAdminDbForTests(db)

  try {
    const run = await runReportOrchestrator(mockAi(), {
      image: 'base64-photo',
      mimeType: 'image/jpeg',
      geo: { lat: 28.6139, lng: 77.2090 },
      address: 'Judge Demo Street',
      reporterName: 'Test Resident',
      userId: 'user_1',
      activeReports: [{
        id: 'nearby_1',
        category: 'Pothole',
        status: 'reported',
        address: 'Nearby lane',
        geo: { lat: 28.61392, lng: 77.20901 },
      }],
    })

    assert.equal(run.result.category, 'Pothole')
    assert.equal(run.result.department, 'Public Works Dept (PWD)')
    assert.equal(run.result.prediction.riskScore, 86)
    assert.equal(run.duplicate.id, 'nearby_1')
    assert.ok(
      db.all('agent_runs').some((item) => item.type === 'report_triage' && item.status === 'completed'),
      JSON.stringify(db.all('agent_runs'), null, 2),
    )
    assert.ok(db.all('agent_steps').some((item) => item.step === 'dedupe' && item.status === 'done'))
    assert.ok(db.all('agent_actions').some((item) => item.actionType === 'route_to_department'))
    assert.ok(db.all('agent_memory').some((item) => item.key === 'category:Pothole'))

    await attachReportToRun(run.runId, 'report_1', 'user_1')
    assert.ok(db.all('agent_actions').some((item) => item.reportId === 'report_1'))
    assert.ok(db.all('agent_memory').some((item) => item.key === 'report:report_1'))

    const verification = await verifyResolutionWithEvidence(mockAi(), {
      reportId: 'report_1',
      userId: 'user_1',
      before: 'before-base64',
      after: 'after-base64',
      afterPhotoUrl: 'data:image/jpeg;base64,after-base64',
      mimeType: 'image/jpeg',
      category: 'Pothole',
    })
    assert.equal(verification.resolved, true)
    assert.ok(verification.verificationRunId)
    assert.ok(db.all('verification_evidence').some((item) => item.reportId === 'report_1' && item.resolved === true))

    const old = Date.now() - 5 * 24 * 60 * 60 * 1000
    await db.collection('reports').doc('overdue_water').set({
      category: 'Water Leakage',
      status: 'reported',
      department: 'Water Supply & Sewerage Board',
      fallbackDepartment: 'Chief Water Works Engineer',
      sla: 2,
      statusHistory: [{ status: 'reported', at: old }],
    })
    await db.collection('agent_memory').doc('report_overdue_water').set({
      key: 'report:overdue_water',
      reportId: 'overdue_water',
      escalationAttempts: 1,
      lastEscalationAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
      actionHistory: ['first escalation failed'],
    })

    const sla = await runSlaMonitor({ limit: 5 })
    assert.equal(sla.ok, true)
    assert.equal(sla.escalated, 1)
    assert.equal(sla.results[0].selfCorrected, true)
    assert.equal(sla.results[0].target, 'Chief Water Works Engineer')
    assert.equal(db.getDoc('reports', 'overdue_water').escalationDepartment, 'Chief Water Works Engineer')
    assert.equal(db.getDoc('reports', 'overdue_water').escalationSelfCorrected, true)
    assert.ok(db.all('agent_actions').some((item) => item.actionType === 'escalate_overdue_issue' && item.selfCorrected === true))
  } finally {
    resetAdminDbForTests()
  }
})
