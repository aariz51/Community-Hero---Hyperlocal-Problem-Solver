# CivicPulse — Report. Verify. Resolve. Together.

**AI-powered hyperlocal civic issue reporting platform.** A citizen snaps one photo of a local problem (pothole, broken streetlight, garbage, water leak…) and a 6-tool **Gemini AI civic agent** inspects it, locates it, removes duplicates, routes it to the right department, drafts the official complaint letter, and predicts how dangerous it gets if ignored. The community then verifies the fix with an after-photo — closing the loop most civic apps leave open.

Built for the **Vibe2Ship Hackathon** (CodingNinjas × Google for Developers) — Problem Statement 2: *"Community Hero: Hyperlocal Problem Solver."*

### 🔗 Links
- **Live app:** https://civicpulse-vibe2ship.web.app
- **Demo video:** https://youtu.be/4MNCGwz2ZZg
- **Team:** Aariz Rasheed

---

## The 6-agent Civic Agent

When a citizen submits a photo, this pipeline runs live on screen — each step lights up as it completes:

| # | Agent | What it does | Tech |
|---|-------|--------------|------|
| 1 | **Perceive** | Gemini Vision confirms it's a genuine civic issue (rejects selfies/memes/indoor — anti-spam gate), categorizes it, and rates severity. | Gemini 2.5 Flash Vision |
| 2 | **Locate** | Gets GPS (with a permission rationale) and reverse-geocodes it into a worded street/area name. | Google Maps + `/api/geocode` |
| 3 | **Dedupe** | Detects a nearby existing report of the same category and offers to verify it instead of filing a duplicate. | Geospatial proximity |
| 4 | **Route** | Maps the category to the correct municipal department with an SLA. | Routing engine |
| 5 | **Draft** | Writes a formal, ready-to-send complaint letter signed with the citizen's real name. | Gemini 2.5 Flash |
| 6 | **Predict** | Forecasts escalation risk (0–100) so authorities prioritize the most dangerous issues. | Gemini 2.5 Flash |

**+ Loop closure:** when an issue is marked fixed, a citizen uploads an after-photo and Gemini Vision compares before/after to confirm the fix is genuine before it's marked *Verified Fixed*.
**+ Ask CivicPulse:** a Gemini function-calling assistant that answers questions about reported issues and impact, by voice or text.

---

## Features

- 📸 **Photo-first reporting** — one photo runs the whole agent pipeline
- 🗺 **Live issue map** — colored pins by category + hotspot heatmap, filterable by category/status
- 🏛 **Authority dashboard** — track issues through Reported → Acknowledged → In Progress → Resolved → Verified Fixed
- ✅ **Community fix-verification** — AI before/after photo comparison
- 🏆 **Gamification** — civic points for reporting and verifying
- 🔐 **Google Sign-In** — complaints signed with the user's real name

---

## Tech stack

- **Frontend:** React + Vite + React Router (single-page app)
- **AI:** Google **Gemini 2.5 Flash** (Vision, structured JSON, function calling)
- **Maps:** Google Maps Platform (Maps JS API, reverse geocoding, custom heatmap)
- **Backend:** Express on **Google Cloud Run** (Cloud Functions v2) — a secure Gemini proxy that keeps the API key server-side
- **Data & Auth:** **Firebase** — Authentication (Google), Cloud Firestore (realtime), Hosting

### Architecture

A React SPA on **Firebase Hosting** calls a **Cloud Run** Express service (`/api/*`) that holds the Gemini key server-side — it's never exposed to the browser. Reports persist in **Cloud Firestore** in realtime, so the map and dashboard update instantly. Google Maps renders the live map and reverse-geocoding; Firebase Auth supplies the citizen's name for complaint letters.

```
React SPA (Firebase Hosting)
   │  /api/*  →  Cloud Run (Express)  →  Gemini 2.5 Flash
   │                                  →  /api/geocode (reverse geocoding)
   └─ Firestore (realtime reports) · Firebase Auth (Google) · Google Maps JS
```

---

## Local development

```bash
npm install

# Fill in your own keys (Firebase web config, Maps key, and GEMINI_API_KEY)
cp .env.example .env

# Run the API proxy and the app in two terminals
npm run dev:api   # Express Gemini proxy on http://localhost:8787
npm run dev:web   # Vite app on http://localhost:5173
```

Required env vars (see [.env.example](.env.example)):
`VITE_FB_API_KEY`, `VITE_FB_AUTH_DOMAIN`, `VITE_FB_PROJECT_ID`, `VITE_FB_STORAGE_BUCKET`, `VITE_FB_SENDER_ID`, `VITE_FB_APP_ID`, `VITE_MAPS_KEY`, and `GEMINI_API_KEY`.

> 🔒 No secrets are committed — all `.env` files are git-ignored and the Gemini key is only ever used server-side.

## Deploy

```bash
npm run build
firebase deploy --only functions   # Cloud Run (Gemini proxy + /api/geocode)
firebase deploy --only hosting      # Firebase Hosting (SPA)
```

---

*Built by Aariz Rasheed for Vibe2Ship. Report. Verify. Resolve. Together.*
