# Security Policy

## Secrets

- `GEMINI_API_KEY`, `GEOCODE_KEY`, and server credentials are used only by the Express API running as Firebase Functions v2/Cloud Run.
- Browser code receives only public Firebase web config and the browser Maps key.
- `.env` files are ignored and must not be committed.

## Authentication And Rules

- `reports` can be read publicly so the civic map stays transparent.
- Creating or editing reports from the browser requires Firebase Authentication.
- `users/{uid}` writes require the signed-in user to match the document id.
- `agent_runs`, `agent_steps`, `agent_actions`, `agent_memory`, and `verification_evidence` are written only by server/Admin code.
- Storage uploads are restricted to signed-in users, image content types, and files under 10 MB.

## Abuse Controls

- Gemini Vision performs a genuineness check before accepting report images.
- Duplicate detection checks same-category reports within 60 meters.
- The server-side SLA monitor records every escalation action and self-correction in Firestore.
- Fix verification stores before/after evidence and confidence before a report is marked verified.

## Reporting Issues

For hackathon judging, security issues should be reported directly to the project owner, Aariz Rasheed, through the GitHub repository.

Do not include API keys, private account details, or personal location data in public issues.
