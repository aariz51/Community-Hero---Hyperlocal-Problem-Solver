// CivicPulse server — secure Gemini proxy + the Civic Agent (function calling).
// Keeps GEMINI_API_KEY server-side. Serves the built SPA in production (Cloud Run).
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { GoogleGenAI, Type } from '@google/genai'
import {
  attachReportToRun,
  runReportOrchestrator,
  runSlaMonitor,
  verifyResolutionWithEvidence,
} from '../functions/agentCore.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(cors())
app.use(express.json({ limit: '12mb' }))

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL = 'gemini-2.5-flash'

const img = (data, mimeType = 'image/jpeg') => ({ inlineData: { data, mimeType } })

/* ---------------- Tool 1: classifyIssue (Vision + anti-spam) ---------------- */
app.post('/api/classify', async (req, res) => {
  try {
    const { image, mimeType } = req.body
    const r = await ai.models.generateContent({
      model: MODEL,
      contents: [
        { role: 'user', parts: [
          img(image, mimeType),
          { text:
`You are a civic-infrastructure inspector. Analyze this photo of a reported community issue.
Decide if it is a GENUINE civic infrastructure problem (not a selfie, meme, indoor, or unrelated image).
Categorize it, rate severity, and write a crisp one-line description an official could act on.` },
        ]},
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCivicIssue: { type: Type.BOOLEAN },
            isGenuine: { type: Type.BOOLEAN },
            category: { type: Type.STRING, enum: ['Pothole','Water Leakage','Streetlight','Garbage/Waste','Road Damage','Drainage','Fallen Tree','Other'] },
            severity: { type: Type.STRING, enum: ['Low','Medium','High','Critical'] },
            description: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
          },
          required: ['isCivicIssue','isGenuine','category','severity','description','confidence'],
        },
      },
    })
    res.json(JSON.parse(r.text))
  } catch (e) { res.status(500).json({ error: String(e?.message || e) }) }
})

/* ---------------- Tool 2: draftOfficialComplaint ---------------- */
app.post('/api/draft', async (req, res) => {
  try {
    const { report } = req.body
    const r = await ai.models.generateContent({
      model: MODEL,
      contents: `Write a concise, formal municipal complaint letter (max 170 words) that a resident named "${report.reporterName || 'a concerned citizen'}" can send to the "${report.department}".
Issue: ${report.category} (${report.severity} severity)${report.address ? ' at ' + report.address : ''}.
Details: ${report.description}.
Tone: respectful, firm, references civic responsibility and requests resolution within ${report.sla} days.
End with a sign-off using the resident's NAME "${report.reporterName || 'A concerned citizen'}" (their name, NOT an email address). Output only the letter body.`,
    })
    res.json({ letter: r.text.trim() })
  } catch (e) { res.status(500).json({ error: String(e?.message || e) }) }
})

/* ---------------- Tool 3: predictEscalation ---------------- */
app.post('/api/predict', async (req, res) => {
  try {
    const { report } = req.body
    const r = await ai.models.generateContent({
      model: MODEL,
      contents: `A civic issue: ${report.category}, severity ${report.severity}, at ${report.address}. Description: ${report.description}.
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
          required: ['willWorsen','riskScore','reason'],
        },
      },
    })
    res.json(JSON.parse(r.text))
  } catch (e) { res.status(500).json({ error: String(e?.message || e) }) }
})

/* ---------------- Tool 4: verifyResolution (before/after Vision) ---------------- */
app.post('/api/verify', async (req, res) => {
  try {
    res.json(await verifyResolutionWithEvidence(ai, req.body))
  } catch (e) { res.status(500).json({ error: String(e?.message || e) }) }
})

/* ---------------- Reverse geocoding (worded address) ---------------- */
// Tries Google Geocoding (if a server-side GEOCODE_KEY is set) then falls back to
// OpenStreetMap so a worded address always works regardless of Cloud Console toggles.
function shortLabel(parts) {
  return [...new Set(parts.filter(Boolean))].slice(0, 3).join(', ')
}
app.get('/api/geocode', async (req, res) => {
  const { lat, lng } = req.query
  try {
    const key = process.env.GEOCODE_KEY || process.env.MAPS_SERVER_KEY
    if (key) {
      const gr = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`)
      const gd = await gr.json()
      if (gd.status === 'OK' && gd.results?.length) {
        const r0 = gd.results.find((r) => r.types?.includes('route')) || gd.results[0]
        return res.json({ address: r0.formatted_address })
      }
    }
    const nr = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'CivicPulse/1.0 (civic issue reporting app)' } })
    const nd = await nr.json()
    const a = nd.address || {}
    const label = shortLabel([
      a.road || a.pedestrian || a.footway || a.neighbourhood,
      a.suburb || a.city_district || a.county,
      a.city || a.town || a.village || a.state_district,
      a.state,
    ]) || nd.display_name || ''
    res.json({ address: label })
  } catch (e) { res.status(500).json({ error: String(e?.message || e) }) }
})

app.post('/api/report-agent', async (req, res) => {
  try {
    res.json(await runReportOrchestrator(ai, req.body))
  } catch (e) { res.status(500).json({ error: String(e?.message || e) }) }
})

app.post('/api/agent/attach-report', async (req, res) => {
  try {
    const { runId, reportId, userId } = req.body
    res.json(await attachReportToRun(runId, reportId, userId))
  } catch (e) { res.status(500).json({ error: String(e?.message || e) }) }
})

app.post('/api/sla-monitor', async (req, res) => {
  try {
    if (process.env.SLA_MONITOR_KEY && req.get('x-civicpulse-scheduler-key') !== process.env.SLA_MONITOR_KEY) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    res.json(await runSlaMonitor({ limit: Number(req.body?.limit || 40) }))
  } catch (e) { res.status(500).json({ error: String(e?.message || e) }) }
})

/* ---------------- Civic Agent: conversational, function-calling ---------------- */
const agentTools = [{
  functionDeclarations: [
    { name: 'find_issues', description: 'Search reported civic issues by optional filters.',
      parameters: { type: Type.OBJECT, properties: {
        status: { type: Type.STRING }, category: { type: Type.STRING }, severity: { type: Type.STRING },
      } } },
    { name: 'get_stats', description: 'Get aggregate impact statistics across all reports.', parameters: { type: Type.OBJECT, properties: {} } },
    { name: 'start_report', description: 'Open the report form so the user can file a new issue.', parameters: { type: Type.OBJECT, properties: {} } },
  ],
}]

function runTool(name, args, reports) {
  if (name === 'get_stats') {
    const total = reports.length
    const resolved = reports.filter(r => ['resolved','verified'].includes(r.status)).length
    const byCat = {}
    reports.forEach(r => { byCat[r.category] = (byCat[r.category] || 0) + 1 })
    return { total, resolved, resolvedPct: total ? Math.round((resolved/total)*100) : 0, byCategory: byCat }
  }
  if (name === 'find_issues') {
    let f = reports
    if (args.status) f = f.filter(r => r.status === args.status)
    if (args.category) f = f.filter(r => (r.category||'').toLowerCase() === args.category.toLowerCase())
    if (args.severity) f = f.filter(r => (r.severity||'').toLowerCase() === args.severity.toLowerCase())
    return { count: f.length, issues: f.slice(0, 8).map(r => ({ category: r.category, severity: r.severity, status: r.status, address: r.address })) }
  }
  if (name === 'start_report') return { ok: true }
  return { error: 'unknown tool' }
}

app.post('/api/agent', async (req, res) => {
  try {
    const { message, reports = [], history = [] } = req.body
    const contents = [
      ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: 'user', parts: [{ text: message }] },
    ]
    const sys = `You are CivicPulse, a helpful civic assistant. Use tools to answer questions about reported issues and impact, and to help users file reports. Be concise and friendly. Reply in plain conversational sentences — do NOT use markdown, asterisks, bullet symbols or headings.`
    let action = null
    for (let hop = 0; hop < 4; hop++) {
      const r = await ai.models.generateContent({
        model: MODEL, contents,
        config: { systemInstruction: sys, tools: agentTools },
      })
      const calls = r.functionCalls || []
      if (!calls.length) { return res.json({ reply: r.text, action }) }
      contents.push({ role: 'model', parts: calls.map(c => ({ functionCall: c })) })
      const responseParts = calls.map(c => {
        if (c.name === 'start_report') action = 'start_report'
        return { functionResponse: { name: c.name, response: runTool(c.name, c.args || {}, reports) } }
      })
      contents.push({ role: 'user', parts: responseParts })
    }
    res.json({ reply: "I've gathered what I can — try rephrasing for more detail.", action })
  } catch (e) { res.status(500).json({ error: String(e?.message || e) }) }
})

/* ---------------- Serve built SPA (production) ---------------- */
const dist = path.join(__dirname, '..', 'dist')
app.use(express.static(dist))
// SPA fallback (Express 5 safe — final middleware, /api routes already matched above)
app.use((req, res) => res.sendFile(path.join(dist, 'index.html')))

const PORT = process.env.PORT || 8787
app.listen(PORT, () => console.log(`CivicPulse server on :${PORT}`))
