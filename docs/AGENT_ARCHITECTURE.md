# CivicPulse Agent Architecture

CivicPulse uses a server-side civic resolution orchestrator rather than a browser-only prompt chain. The frontend collects the user-controlled inputs that must remain in the browser, such as image selection and geolocation permission, then calls `/api/report-agent`. The Cloud Function/Cloud Run backend performs the AI workflow, records the audit trail, and returns the editable report draft to the user.

## Runtime Flow

1. **Perceive**
   - Gemini 2.5 Flash Vision validates the image as a real civic issue.
   - Output: `isCivicIssue`, `isGenuine`, `category`, `severity`, `description`, `confidence`.

2. **Locate**
   - Browser geolocation is passed to the server after permission.
   - The server resolves a human-readable address through Google Geocoding when configured.

3. **Dedupe**
   - The orchestrator checks active same-category reports within 60 meters.
   - If a match exists, it records an `offer_duplicate_verification` action.

4. **Route**
   - Category maps to a department, SLA, and fallback escalation department.
   - The action is written to `agent_actions`.

5. **Draft**
   - Gemini drafts a concise municipal complaint letter signed with the reporter name.

6. **Predict**
   - Gemini estimates escalation risk and explains why the issue may worsen.

7. **Verify Fix**
   - Before/after images are compared by Gemini Vision through `/api/verify`.
   - Evidence is written to `verification_evidence`.

8. **SLA Monitor**
   - `slaMonitor` runs every 60 minutes through Cloud Scheduler.
   - Overdue reports are escalated and recorded in `agent_actions`.
   - If a previous escalation is stale, the agent self-corrects to the fallback department and updates `agent_memory`.

## Firestore Collections

| Collection | Purpose | Writer |
|---|---|---|
| `reports` | Public civic issue records and status timeline | Client for signed-in users |
| `agent_runs` | One run per report triage, fix verification, or SLA monitor action | Server only |
| `agent_steps` | Step status, latency, model output, fallback/error metadata | Server only |
| `agent_actions` | Planned/executed route, duplicate, escalation, and verification actions | Server only |
| `agent_memory` | Stateful memory for report escalation and category routing | Server only |
| `verification_evidence` | Before/after verification output, confidence, note, and report linkage | Server only |

## Self-Correction Contract

The SLA monitor treats repeated stale escalations as a failure signal. If an overdue report has already been escalated and the last escalation is older than 24 hours, the next cycle routes to the configured fallback department.

Example:

```text
Water Leakage → Water Supply & Sewerage Board
No acknowledgement after SLA/failure window
Self-correct → Chief Water Works Engineer
```

This is intentionally stored in `agent_memory`, not hidden in transient function state, so the behavior survives deployments and cold starts.

See [MTDB](MTDB.md) for the full Firestore and Storage data contract behind these collections.

## Judge Access

Judges use the same authenticated product flow as real users. The submitted README and Google Doc include a demo email/password account, and the app also supports creating a fresh email/password ID from the report screen.

User-created reports require Firebase Authentication and are constrained by Firestore and Storage rules.

## Visible Evidence

The issue detail screen reads the public, server-written `agent_runs`, `agent_steps`, `agent_actions`, and `verification_evidence` records linked to a report. This lets a judge see what the agent actually did: classification, routing, escalation decisions, self-corrections, and fix-verification results.
