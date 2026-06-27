# CivicPulse — Community Hero (Vibe2Ship Submission)

> Copy this into a Google Doc, set sharing to "Anyone with the link → Viewer", and submit the link on BlockseBlock.

**Live app (Google Cloud):** https://civicpulse-vibe2ship.web.app
**GitHub repo:** https://github.com/aariz51/Community-Hero---Hyperlocal-Problem-Solver

---

## Problem Statement Selected
**Problem Statement 2 — Community Hero: Hyperlocal Problem Solver.**
Communities face potholes, water leaks, broken streetlights, garbage and infrastructure
issues. Reporting is fragmented, hard to track, and lacks transparency. We built a platform
that lets citizens identify, report, validate, track and resolve these issues — powered by an
autonomous AI agent.

## Solution Overview
CivicPulse is not a reporting form with an AI label — it's an **autonomous Civic Agent that
closes the loop**: it **perceives** an issue from a photo, **reasons** about it (category,
severity, duplicates, department), **acts** (routes it, drafts the official complaint, sets an
SLA, predicts escalation), and finally **verifies the fix** using before/after computer vision.
A citizen snaps a photo; the agent does the rest. Authorities get a real-time triage dashboard
with predictive hotspots, and anyone can talk to the platform through a voice/chat civic agent.

## Key Features
- **Agentic report pipeline** — one photo triggers a 6-step Gemini agent (perceive → locate →
  de-duplicate → route → draft complaint → predict escalation), shown live to the user.
- **AI issue categorization & severity** — Gemini Vision classifies type, severity, writes an
  actionable description, and runs an **anti-spam genuineness check**.
- **Geo-location & live map** — Google Maps with category markers and a **hotspot heatmap**.
- **Smart de-duplication** — nearby duplicate reports are detected and merged into upvotes.
- **AI before/after fix verification** — uploading a "fixed" photo triggers Gemini to compare
  before/after and confirm the issue is genuinely resolved (status → Verified Fixed).
- **Auto-drafted official complaint letters** — ready to send to the right department.
- **Predictive insights** — the agent flags issues likely to worsen (monsoon, traffic, safety).
- **Authority dashboard** — impact stats (resolution rate, avg. time), severity-sorted triage
  queue, category breakdown, and predictive hotspots.
- **Gamification** — citizens earn points and badges for reporting and verifying.
- **Ask CivicPulse** — a conversational + **voice** agent (Gemini function-calling) that queries
  live data and can file reports for you.
- **Real-time** — built on Firestore live sync; new reports appear instantly everywhere.

## Technologies Used
- **Frontend:** React + Vite + React Router (single-page app)
- **Backend:** Node.js + Express, deployed as a Cloud Function (Cloud Run, gen 2)
- **AI:** Google Gemini (`gemini-2.5-flash`) — Vision, structured JSON output, and
  function-calling agent
- **Database/Auth:** Firebase Firestore + Firebase Authentication (Google sign-in)
- **Maps:** Google Maps Platform (Maps JavaScript API, geocoding, heatmap visualization)
- **Hosting/Deploy:** Firebase Hosting + Google Cloud Run

## Google Technologies Utilized
- **Google Gemini API** — Vision classification, severity scoring, complaint drafting,
  escalation prediction, before/after fix verification, and a function-calling conversational
  agent (tools: find_issues, get_stats, start_report).
- **Google Maps Platform** — interactive map, advanced markers, geocoding, and heatmap layer.
- **Firebase** — Firestore (real-time DB), Authentication (Google sign-in).
- **Google Cloud Run** — the API/agent runs as a 2nd-gen Cloud Function on Cloud Run.
- **Firebase Hosting** — the deployed public app on Google Cloud.

## Why it stands out (Agentic Depth + Innovation)
Most civic apps stop at "report + pin on map." CivicPulse runs a genuine **multi-step agent**
with tools, **de-duplicates** reports, **auto-routes and drafts complaints**, **predicts
escalation**, and uniquely **verifies the fix with vision** — closing the full loop from report
to confirmed resolution, with a voice-driven civic assistant on top.
</content>
