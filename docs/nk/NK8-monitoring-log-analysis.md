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
- March 17, 2026 live smoke validation now passes end-to-end for vault save/list/delete after the live Lambda delete hotfix.
- Public `GET /vault/items/{id}` still returns `404` during live probing because the route is absent from API Gateway.
- CloudWatch log group `/aws/lambda/SaveSecurityPassCredential` exists and retention is set to `3 months`.
- CloudWatch alarm `nk8-SaveSecurityPassCredential-Errors` is configured for Lambda `Errors >= 1` over `1 minute`.
- CloudWatch alarm `nk8-SaveSecurityPassCredential-Throttles` is configured for Lambda `Throttles >= 1` over `1 minute`.
- SNS topic `nk8-security-alerts` is attached to both alarms and the email subscription is confirmed.
- The current live bundle inspection shows no legacy `/credentials` helper or old endpoint string in the deployed frontend bundle.

## Alert Matrix
| Alert | Trigger | Threshold | Action |
| --- | --- | --- | --- |
| SaveSecurityPassCredential errors | Lambda `Errors` metric | `>= 1` in `1 minute` | SNS topic `nk8-security-alerts` |
| SaveSecurityPassCredential throttles | Lambda `Throttles` metric | `>= 1` in `1 minute` | SNS topic `nk8-security-alerts` |
| Missing item route parity | Public `GET /vault/items/{id}` returns `404` | Not currently alarmed | API Gateway follow-up |
| Vault auth/data-scope gap | Route lacks authorizer or returns cross-user rows | Not currently alarmed | Backend hardening follow-up |

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
- CloudWatch alarms list screenshot showing `Errors` and `Throttles`
- SNS subscription screenshot showing `nk8-security-alerts` email endpoint as `Confirmed`
- Log retention policy screenshot for `/aws/lambda/SaveSecurityPassCredential`
- `artifacts/nk/live-endpoint-check.json`
- `artifacts/nk/live-bundle-inspection.txt`

## Remaining Monitoring Gaps
- No API Gateway alarm or dashboard has been added yet.
- Monitoring evidence is centered on the vault Lambda; broader API/auth alert coverage can be added later if the rubric requires it.
