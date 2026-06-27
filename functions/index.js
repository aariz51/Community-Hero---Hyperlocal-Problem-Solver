// CivicPulse API as a Cloud Function (Functions v2 = runs on Cloud Run).
// Secure Gemini proxy + the Civic Agent (function calling). Served at /api/** via
// Firebase Hosting rewrite.
import { onRequest } from 'firebase-functions/v2/https'
import express from 'express'
import cors from 'cors'
import { GoogleGenAI, Type } from '@google/genai'

const app = express()
app.use(cors({ origin: true }))
app.use(express.json({ limit: '12mb' }))

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL = 'gemini-2.5-flash'
const img = (data, mimeType = 'image/jpeg') => ({ inlineData: { data, mimeType } })

app.post('/api/classify', async (req, res) => {
  try {
    const { image, mimeType } = req.body
    const r = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [
        img(image, mimeType),
        { text: `You are a civic-infrastructure inspector. Analyze this photo of a reported community issue.
Decide if it is a GENUINE civic infrastructure problem (not a selfie, meme, indoor, or unrelated image).
Categorize it, rate severity, and write a crisp one-line description an official could act on.` },
      ] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: { type: Type.OBJECT, properties: {
          isCivicIssue: { type: Type.BOOLEAN }, isGenuine: { type: Type.BOOLEAN },
          category: { type: Type.STRING, enum: ['Pothole','Water Leakage','Streetlight','Garbage/Waste','Road Damage','Drainage','Fallen Tree','Other'] },
          severity: { type: Type.STRING, enum: ['Low','Medium','High','Critical'] },
          description: { type: Type.STRING }, confidence: { type: Type.NUMBER },
        }, required: ['isCivicIssue','isGenuine','category','severity','description','confidence'] },
      },
    })
    res.json(JSON.parse(r.text))
  } catch (e) { res.status(500).json({ error: String(e?.message || e) }) }
})

app.post('/api/draft', async (req, res) => {
  try {
    const { report } = req.body
    const r = await ai.models.generateContent({
      model: MODEL,
      contents: `Write a concise, formal municipal complaint letter (max 160 words) a citizen can send to the "${report.department}".
Issue: ${report.category} (${report.severity} severity) at ${report.address}.
Details: ${report.description}.
Tone: respectful, firm, references civic responsibility and requested resolution within ${report.sla} days. Output only the letter body.`,
    })
    res.json({ letter: r.text.trim() })
  } catch (e) { res.status(500).json({ error: String(e?.message || e) }) }
})

app.post('/api/predict', async (req, res) => {
  try {
    const { report } = req.body
    const r = await ai.models.generateContent({
      model: MODEL,
      contents: `A civic issue: ${report.category}, severity ${report.severity}, at ${report.address}. Description: ${report.description}.
Assess the risk that this WORSENS or causes harm if not fixed soon (consider monsoon/water, traffic, public safety, disease).`,
      config: { responseMimeType: 'application/json', responseSchema: { type: Type.OBJECT, properties: {
        willWorsen: { type: Type.BOOLEAN }, riskScore: { type: Type.NUMBER }, reason: { type: Type.STRING },
      }, required: ['willWorsen','riskScore','reason'] } },
    })
    res.json(JSON.parse(r.text))
  } catch (e) { res.status(500).json({ error: String(e?.message || e) }) }
})

app.post('/api/verify', async (req, res) => {
  try {
    const { before, after, mimeType, category } = req.body
    const r = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [
        { text: `BEFORE photo of a reported "${category}" issue:` }, img(before, mimeType),
        { text: `AFTER photo claiming it is now fixed:` }, img(after, mimeType),
        { text: `Compare them. Has the ${category} issue genuinely been resolved in the AFTER photo? Be skeptical of mismatched locations or staged photos.` },
      ] }],
      config: { responseMimeType: 'application/json', responseSchema: { type: Type.OBJECT, properties: {
        resolved: { type: Type.BOOLEAN }, confidence: { type: Type.NUMBER }, note: { type: Type.STRING },
      }, required: ['resolved','confidence','note'] } },
    })
    res.json(JSON.parse(r.text))
  } catch (e) { res.status(500).json({ error: String(e?.message || e) }) }
})

const agentTools = [{ functionDeclarations: [
  { name: 'find_issues', description: 'Search reported civic issues by optional filters.',
    parameters: { type: Type.OBJECT, properties: { status: { type: Type.STRING }, category: { type: Type.STRING }, severity: { type: Type.STRING } } } },
  { name: 'get_stats', description: 'Get aggregate impact statistics across all reports.', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'start_report', description: 'Open the report form so the user can file a new issue.', parameters: { type: Type.OBJECT, properties: {} } },
] }]

function runTool(name, args, reports) {
  if (name === 'get_stats') {
    const total = reports.length
    const resolved = reports.filter(r => ['resolved','verified'].includes(r.status)).length
    const byCat = {}; reports.forEach(r => { byCat[r.category] = (byCat[r.category] || 0) + 1 })
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
    const sys = `You are CivicPulse, a helpful civic assistant. Use tools to answer questions about reported issues and impact, and to help users file reports. Be concise and friendly.`
    let action = null
    for (let hop = 0; hop < 4; hop++) {
      const r = await ai.models.generateContent({ model: MODEL, contents, config: { systemInstruction: sys, tools: agentTools } })
      const calls = r.functionCalls || []
      if (!calls.length) return res.json({ reply: r.text, action })
      contents.push({ role: 'model', parts: calls.map(c => ({ functionCall: c })) })
      contents.push({ role: 'user', parts: calls.map(c => {
        if (c.name === 'start_report') action = 'start_report'
        return { functionResponse: { name: c.name, response: runTool(c.name, c.args || {}, reports) } }
      }) })
    }
    res.json({ reply: "I've gathered what I can — try rephrasing for more detail.", action })
  } catch (e) { res.status(500).json({ error: String(e?.message || e) }) }
})

export const api = onRequest({ region: 'us-central1', timeoutSeconds: 120, memory: '512MiB' }, app)
