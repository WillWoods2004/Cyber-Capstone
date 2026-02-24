# NK8 Security Monitoring and Log Analysis

## Objective
Provide actionable security visibility and incident response evidence.

## Event Sources
- API Gateway access logs
- Lambda execution logs
- Auth and MFA events
- Vault CRUD event logs (without plaintext secret data)

## Alert Matrix
| Alert | Trigger | Threshold | Action |
| --- | --- | --- | --- |
| Auth failures spike | Failed login count | > X failures in Y minutes | Investigate source IP/user pattern |
| MFA failures spike | Failed MFA verifies | > X failures in Y minutes | Lock account policy / review |
| API error rate | 5xx count | > X in Y minutes | Check Lambda/API health |
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
