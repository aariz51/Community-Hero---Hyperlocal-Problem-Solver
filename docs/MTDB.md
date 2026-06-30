# CivicPulse MTDB

MTDB means Model, Tables, Data Blueprint for this project. CivicPulse uses Firebase Cloud Firestore as the operational database and Firebase Storage for image uploads. This file documents the data contract judges can verify in code, rules, and the running app.

## Data Model

| Collection | Purpose | Read Access | Write Access |
|---|---|---|---|
| `reports` | Public civic issues, geolocation, status timeline, votes, complaint text, and AI risk output | Public | Signed-in client users |
| `users` | Points, badges, and profile-level gamification state | Public | Owner-only client writes |
| `agent_runs` | One durable record per report triage, fix verification, or SLA monitor action | Public | Server/Admin only |
| `agent_steps` | Per-step execution evidence: perceive, locate, dedupe, route, draft, predict, verify, SLA scan | Public | Server/Admin only |
| `agent_actions` | Planned/executed actions such as route, duplicate detection, escalation, self-correction, and verification | Public | Server/Admin only |
| `agent_memory` | Stateful memory for report escalation attempts, fallback department choice, and category routing history | Signed-in users | Server/Admin only |
| `verification_evidence` | Before/after fix-verification result, confidence, note, and linked report/run ids | Public | Server/Admin only |

## Report Fields

| Field | Type | Notes |
|---|---|---|
| `userId`, `userName` | string | Reporter identity from Firebase Auth |
| `photoUrl`, `afterPhotoUrl` | string | Firebase Storage download URLs for signed-in uploads |
| `photoStoragePath`, `afterPhotoStoragePath` | string | Storage object paths under `report-images/{uid}` and `verification-images/{uid}` |
| `category` | string | Civic taxonomy: pothole, leakage, streetlight, waste, road damage, drainage, tree, other |
| `severity` | string | `Low`, `Medium`, `High`, or `Critical` |
| `description` | string | Gemini-generated or user-edited operational description |
| `confidence` | number | Gemini classification confidence |
| `address`, `geo` | string/object | Reverse-geocoded address plus `{ lat, lng }` for map/dashboard |
| `department`, `fallbackDepartment`, `sla` | string/string/number | Routing target, self-correction fallback, and SLA in days |
| `status` | string | `reported`, `acknowledged`, `in_progress`, `resolved`, or `verified` |
| `statusHistory` | array | Timeline entries with status, timestamp, and optional note |
| `escalationRisk`, `escalationReason` | number/string | Gemini risk prediction for authority prioritization |
| `agentRunId`, `verificationRunId` | string | Links issue UI back to durable server-side agent evidence |

## Server-Only Agent Evidence

The browser never writes agent audit records. The Functions v2 backend writes them with the Admin SDK:

1. `runReportOrchestrator` creates an `agent_runs` record.
2. Each step writes `agent_steps`.
3. Routing, duplicate, draft, prediction, escalation, and verification decisions write `agent_actions`.
4. Category and report escalation history write `agent_memory`.
5. `/api/verify` writes `verification_evidence`.

The issue detail page reads the linked public evidence and displays it as an Agent audit trail, so judges can inspect the agent behavior without Firebase Console access.

## Storage Rules

Firebase Storage is limited to:

| Path | Writer | Constraint |
|---|---|---|
| `report-images/{userId}/{fileName}` | Matching signed-in user | Image content type, under 10 MB |
| `verification-images/{userId}/{fileName}` | Matching signed-in user | Image content type, under 10 MB |

All other Storage paths are denied.

## Verification

Use these commands to verify the database contract locally:

```bash
npm run test:agent
npm run test:rules
```

`test:agent` proves the agent writes run evidence, links reports, stores fix-verification evidence, and self-corrects overdue escalations. `test:rules` proves public reads and server-only writes for the audit collections plus image upload restrictions.
