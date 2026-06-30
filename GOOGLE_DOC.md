# CivicPulse — Report. Verify. Resolve. Together.

**Vibe2Ship Hackathon (CodingNinjas × Google for Developers)**
**Problem Statement 2 — "Community Hero: Hyperlocal Problem Solver"**

**Live app:** https://civicpulse-vibe2ship.web.app
**Demo video:** *(attach CivicPulse-demo.mp4)*
**Team:** Aariz Rasheed

**Judge test login**
- Email ID: `judge@civicpulse.app`
- Password: `CivicPulse@2026`

---

## 1. One-line pitch

CivicPulse turns any citizen's phone photo of a local civic problem (pothole, broken streetlight, overflowing garbage, water leak…) into a verified, routed, and tracked municipal complaint — powered by a 6-tool **Gemini AI civic agent** that does the work a citizen normally can't: it inspects the photo, locates it, removes duplicates, routes it to the right department, writes the official complaint letter, and predicts how dangerous it will get if ignored. The community then **verifies the fix** with an after-photo, closing the loop that every other civic-reporting app leaves open.

---

## 2. The problem (in plain terms)

Every city has the same broken loop:

1. A citizen sees a pothole but **doesn't know who to report it to** or how to write a formal complaint.
2. If they do report it, **dozens of people report the same pothole**, flooding the system with duplicates.
3. Authorities get a pile of unstructured photos with **no severity, no priority, no routing**.
4. Even when something gets "marked resolved," **nobody verifies it was actually fixed** — so the same pothole gets re-reported forever.

CivicPulse fixes all four breakpoints with AI, not paperwork.

---

## 3. The 6-agent Civic Agent (our core differentiator)

The heart of CivicPulse is an autonomous **6-tool agent** built on Google **Gemini 2.5 Flash**. When a citizen snaps a photo, the agent runs this pipeline live on screen — each step lights up as it completes:

| # | Agent tool | What it does | Google tech used |
|---|------------|--------------|------------------|
| 1 | **Perceive** 👁 | Gemini Vision inspects the photo, confirms it's a *genuine* civic issue (rejects selfies, memes, indoor shots), categorizes it (pothole / streetlight / garbage / water / drainage / fallen tree…), and rates severity Low→Critical. This is also our **anti-spam gate**. | Gemini 2.5 Flash Vision + structured JSON |
| 2 | **Locate** 📍 | Grabs GPS (after showing a clear permission rationale) and **reverse-geocodes** the coordinates into a human-readable street/area name — not raw numbers. | Google Maps Geocoder |
| 3 | **Dedupe** ▦ | Checks for an existing nearby report of the same category so the city isn't flooded with 50 copies of one pothole — the user is offered "verify the existing report" instead. | Geospatial proximity logic |
| 4 | **Route** 🏛 | Maps the category to the correct municipal department (e.g. Pothole → Public Works Dept) with the right SLA in days. | Department routing engine |
| 5 | **Draft** ✍ | Writes a formal, respectful, ready-to-send municipal complaint letter **signed with the citizen's real name** (from Firebase Auth), so anyone can file it without knowing how to write officialese. | Gemini 2.5 Flash |
| 6 | **Predict** 📈 | Forecasts the **escalation risk** (0–100) — how much worse and more dangerous this issue gets if ignored (monsoon flooding, traffic accidents, disease), giving authorities a way to *prioritize*. | Gemini 2.5 Flash reasoning |

A **7th capability closes the loop**: when an issue is marked fixed, a citizen uploads an **after-photo**, and Gemini Vision compares before/after to **verify the resolution is genuine** (it's skeptical of staged or mismatched photos). Only a verified fix moves the status to "Verified Fixed."

There is also a **conversational Civic Agent** ("Ask CivicPulse") — a Gemini function-calling assistant that answers questions about reported issues, impact statistics, and can open the report form for you, by voice or text.

---

## 4. What the app actually does (feature list)

- **📸 Photo-first reporting** — take or upload a photo; the agent does everything else.
- **🤖 Live agent pipeline** — the 6 steps animate on screen so users *see* the AI working.
- **🗺 Live issue map** — every report as a colored pin by category, with a **heatmap** that shows problem hotspots as warm gradient blooms; filter by category and status.
- **🏛 Authority dashboard** — officials see all issues, severities, escalation risks, and can advance status through the lifecycle (Reported → Acknowledged → In Progress → Resolved → Verified Fixed).
- **✅ Community fix-verification** — after-photo + AI before/after comparison.
- **🏆 Gamification** — citizens earn civic points for reporting and verifying, driving participation.
- **🔐 Firebase Auth** — email/password judge access, new ID creation, and Google Sign-In; complaints are signed with the user's real name.
- **🗣 Voice + chat civic assistant** — ask about issues and impact in natural language.

---

## 5. How CivicPulse is different from other civic-reporting apps

Most hackathon (and even real) civic apps are a **form + a map pin**. CivicPulse is different on four concrete axes:

1. **It's agentic, not a form.** Other apps ask the citizen to pick a category, write a description, and figure out the department. CivicPulse's agent does all of that *from a single photo* — including writing the official complaint letter. The human effort is one tap.

2. **It closes the loop with AI verification.** Almost every civic app stops at "submitted." CivicPulse uses Gemini Vision to **compare before/after photos and confirm the fix is real** — solving the "marked resolved but still broken" problem that plagues 311-style systems.

3. **It prioritizes by predicted danger, not just by date.** The escalation-risk agent tells authorities *which* pothole becomes a flooded death-trap in monsoon season, so limited municipal resources go to the highest-harm issues first.

4. **It fights spam and duplicates at the source.** The Vision gate rejects non-civic images, and the dedupe agent merges repeat reports into upvotes — keeping the data clean and trustworthy for officials.

In short: other apps **collect** civic complaints. CivicPulse **resolves** them — inspect → locate → dedupe → route → draft → predict → verify.

---

## 6. Google technology used (deep Google integration)

CivicPulse is built end-to-end on Google's stack:

- **Google Gemini 2.5 Flash** — Vision classification, structured JSON output, complaint drafting, escalation prediction, before/after verification, and a function-calling conversational agent.
- **Google Maps Platform** — Maps JavaScript API (dark-themed live map), Geocoding API (coordinates → worded address), custom heatmap overlay.
- **Firebase** — Authentication (email/password + Google Sign-In), Cloud Firestore (realtime reports database), Firebase Storage, Firebase Hosting.
- **Google Cloud Run** — a secure server-side Gemini proxy (Cloud Functions v2) that keeps the API key off the client.
- **Google AI Studio** — used during development to prototype prompts.

---

## 7. Architecture (one paragraph)

A React + Vite single-page app is served from **Firebase Hosting**. All AI calls go to a **Cloud Run** Express service (`/api/*`) that holds the Gemini key server-side — the key is never exposed to the browser. Reports persist in **Cloud Firestore** in realtime, so the map, dashboard, and everyone's screens update instantly. **Google Maps** renders the live map and reverse-geocoding. **Firebase Auth** handles email/password plus Google Sign-In and supplies the citizen's real name for complaint letters.

---

## 8. Deployment & access

- **Live URL:** https://civicpulse-vibe2ship.web.app (fully deployed on Google Cloud — Firebase Hosting + Cloud Run).
- **Judge login:** `judge@civicpulse.app` / `CivicPulse@2026`
- **Demo video:** attached (full walkthrough of reporting, the 6-agent pipeline, the live map + heatmap, the authority dashboard, and AI fix-verification).
- **Source code:** private GitHub repository, access available to judges on request.

---

*CivicPulse — built for Vibe2Ship by Aariz Rasheed. Report. Verify. Resolve. Together.*
