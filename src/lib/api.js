// Client wrappers for the server-side Gemini agent endpoints (Cloud Function /api/**).
// In dev, Vite proxies /api -> localhost:8787. In prod, Hosting rewrites /api -> function.
async function post(path, body) {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `${path} failed`)
  return r.json()
}

export const classifyIssue = (image, mimeType) => post('/api/classify', { image, mimeType })
export const draftComplaint = (report) => post('/api/draft', { report })
export const predictEscalation = (report) => post('/api/predict', { report })
export const verifyResolution = (before, after, mimeType, category) =>
  post('/api/verify', { before, after, mimeType, category })
export const askAgent = (message, reports, history) => post('/api/agent', { message, reports, history })
