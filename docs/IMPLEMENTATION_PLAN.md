# CivicPulse — Implementation Plan (Vibe2Ship, Problem 2)

Deadline: 29 Jun 2026, 2:00 PM. Build days available: ~1.5. Scope is ruthless.

## Winning thesis — how we differ
Most teams will build a **reporting form** that slaps a Gemini label on a photo and
drops a map pin. That scores low on the two biggest buckets (Agentic Depth 20,
Innovation 20).

We build an **autonomous Civic Agent that closes the loop**:
perceive → reason → act → predict → **verify the fix**. It doesn't just label an
issue — it dedupes, routes it to the right department, drafts the official
complaint, sets an SLA, predicts escalation, and uses before/after vision to
**confirm the issue was actually fixed**. Plus a conversational + voice civic
assistant powered by Gemini function-calling over live data.

That loop-closure + autonomy is what nobody else will nail.

## Rubric → feature map (build only what scores)
| Criteria | % | How we win it |
|---|---|---|
| Problem Solving & Impact | 20 | Full loop report→route→resolve→verify; real authority dashboard + impact stats |
| **Agentic Depth** | 20 | Gemini **function-calling agent** w/ tools: classify, dedupe, route, draft complaint, predict, verify fix; autonomous triage over all reports |
| **Innovation & Creativity** | 20 | AI before/after **fix verification**, predictive **hotspot heatmap**, auto-drafted complaint letters, voice civic agent, anti-spam genuineness check |
| Usage of Google Tech | 15 | Gemini (Vision+text+function-calling+structured output), Maps Platform (Maps JS, Advanced Markers, Geocoding, Places, Heatmap), Firebase (Auth+Firestore+Storage), Cloud Run |
| Product Experience & Design | 10 | Clean SmartCity311-style UI (done), responsive, smooth report flow, live map |
| Technical Implementation | 10 | Real-time Firestore, secure Gemini proxy, deployed Cloud Run |
| Completeness & Usability | 5 | End-to-end working + seeded demo data + public link |

## Architecture (AI-Studio-native, plain React)
- **Frontend:** React + Vite + TS SPA
- **Auth:** Firebase Auth (Google sign-in)
- **DB:** Firestore (real-time)
- **Media:** Firebase Storage (photos/video)
- **AI:** Gemini API via secure server endpoint (AI Studio Node runtime holds key)
- **Maps:** Google Maps Platform — Maps JS, Advanced Markers, Geocoding (address),
  Places Autocomplete, Heatmap (visualization lib)
- **Deploy:** Cloud Run (AI Studio one-click) · repo on GitHub

## The Civic Agent (centerpiece — Agentic Depth 20%)
Gemini with **function calling**. Tools:
- `classifyIssue(image)` → {category, severity, description, isGenuine, confidence}
- `findNearbyDuplicates(lat,lng,category)` → Firestore geo query → merge/flag
- `routeToDepartment(category)` → dept + SLA
- `draftOfficialComplaint(report)` → formal letter text
- `predictEscalation(report)` → risk + reason (e.g. pothole + monsoon)
- `verifyResolution(beforeImg, afterImg)` → {resolved, confidence, note}

Two surfaces:
1. **On submit** the agent runs the pipeline autonomously and writes results.
2. **"Ask CivicPulse"** chat (+ Web Speech voice): user asks/acts in natural
   language; agent calls the same tools over live Firestore data.

## Firestore data model
```
reports/{id}: {
  userId, photoUrl, beforePhotoUrl, afterPhotoUrl,
  category, severity, description, isGenuine, confidence,
  department, sla, status: 'reported|acknowledged|in_progress|resolved|verified',
  geo: {lat,lng}, address,
  votes, voterIds[], duplicateOf|null,
  escalationRisk, complaintLetter,
  statusHistory: [{status, at}], createdAt
}
users/{id}: { name, points, badges[], reportCount }
```

## Screens
1. Landing (DONE)
2. Report flow: capture/upload → "AI analyzing…" → prefilled category/severity/
   address → confirm → submit
3. Live Map: pins by category + heatmap toggle + filters
4. Issue detail: status timeline, votes, complaint letter, before/after verify
5. My Reports + credibility (points/badges) — gamification
6. Authority dashboard: triage queue (severity-sorted), hotspots, predictive,
   impact stats (resolved %, avg time)
7. Ask CivicPulse: chat + voice

## Timeline
**Day 1 (27th eve) — Foundation + core loop**
- Firebase project, enable Auth/Firestore/Storage, grab config
- Maps + Gemini keys wired
- Auth (Google sign-in)
- Report flow: upload → Storage → Gemini classify → geo/address → write Firestore
- Show it on the map. ONE end-to-end report working.

**Day 2 (28th) — Agent + map + dashboards**
- AM: Live map (markers + heatmap + filters), issue detail + status timeline
- Midday: Agent pipeline (dedupe, route, complaint draft, predict), authority
  dashboard + impact stats
- Eve: before/after fix verification, Ask-CivicPulse chat + voice, gamification,
  seed demo data, design polish

**29th AM — Ship**
- Deploy to Cloud Run, test public link stays up
- Write Google Doc (problem, solution, key features, tech, Google tech used)
- Record 3-min demo, submit on BlockseBlock + Final Submit BEFORE 2 PM. Buffer.

## Keys to grab (one-time)
1. **Firebase:** console → create project → add Web app → copy `firebaseConfig`;
   enable Authentication (email/password + Google), Firestore, Storage.
2. **Maps Platform:** enable Maps JavaScript API + Geocoding API + Places API →
   create API key (restrict to site domain).
3. **Gemini API key:** already have.

## Submission checklist
- [ ] Public Cloud Run link (stays up through judging)
- [ ] GitHub repo (done; keep updated)
- [ ] Google Doc, link-shareable: Problem Statement / Solution Overview /
      Key Features / Technologies / Google Technologies Utilized
- [ ] BlockseBlock: Create Project → links → Submit → Final Submit

## 3-min demo script
Report a pothole → agent labels High severity + drafts complaint + routes to PWD →
appears on map/heatmap → authority dashboard prioritizes it → mark fixed with
after-photo → AI verifies fix → ask the voice agent "what's unresolved near me?".
</content>
