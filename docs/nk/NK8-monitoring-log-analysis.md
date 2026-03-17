# NK8 Security Monitoring and Log Analysis

## Objective
Provide actionable security visibility and incident response evidence.

## Event Sources
- API Gateway access logs
- Lambda execution logs
- Auth and MFA events
- Vault CRUD event logs (without plaintext secret data)

## Current Verified Findings
- Live auth routes are reachable and CORS is configured for the Amplify origin.
- Live vault save/list/decrypt flows are working through API Gateway + Lambda.
- Live smoke validation still shows a delete inconsistency:
  - `DELETE /vault/items/{id}` returns `204`
  - follow-up `GET /vault/items` still shows the deleted row
- Public `GET /vault/items/{id}` returned `404` during live probing, which means the public API contract currently differs from the local mock API/OpenAPI spec.
- The deleted row still appeared in `GET /vault/items` after a 10-second wait, which makes short eventual consistency less likely than a live route/runtime mismatch.
- The deployed Amplify bundle still contains the legacy `/credentials` helper, so any `/credentials` invocation should be treated as a data-handling regression until the frontend is redeployed.

## Alert Matrix
| Alert | Trigger | Threshold | Action |
| --- | --- | --- | --- |
| Auth failures spike | Failed login count | > X failures in Y minutes | Investigate source IP/user pattern |
| MFA failures spike | Failed MFA verifies | > X failures in Y minutes | Lock account policy / review |
| API error rate | 5xx count | > X in Y minutes | Check Lambda/API health |
| Delete anomaly | DELETE returns success but row persists | any confirmed occurrence | Review Lambda logs + DynamoDB keys/filtering |
| Legacy plaintext sync | `/credentials` helper present or invoked by frontend | any confirmed occurrence | Redeploy frontend, disable old endpoint, audit stored data |
| Unauthorized access | 401/403 anomalies | sustained deviation | Validate IAM/CORS/auth logic |

## Incident Workflow
1. Detect alert.
2. Triage severity and impact.
3. Contain (block actor, throttle, rollback).
4. Recover service.
5. Post-incident review and control update.

## Log Review Cadence
- Daily: high-severity alert review
- Weekly: trend review (error rates, auth anomalies)
- Release-level: audit and retention verification

## Evidence to Capture
- CloudWatch dashboard screenshot
- Alarm definitions screenshot
- One sample alert and remediation note
- Log retention policy screenshot
- Bundle inspection or build-verification output showing no legacy `/credentials` helper in the released frontend
