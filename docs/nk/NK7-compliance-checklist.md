# NK7 Compliance and Configuration Monitoring

## Objective
Track baseline hardening and compliance alignment (CIS/NIST style).

## Checklist
| Control Area | Requirement | Evidence Location | Status |
| --- | --- | --- | --- |
| Identity | Least-privilege IAM roles for Lambda/API | IAM policy screenshots + JSON export | Pending cloud evidence |
| Transport | TLS for public endpoints | ACM + custom domain screenshots | Pending cloud evidence |
| Logging | Centralized logs enabled | CloudWatch log group screenshots | Pending cloud evidence |
| Monitoring | Alerts configured for failures/anomalies | CloudWatch alarm screenshots | Pending cloud evidence |
| Secrets | No plaintext secrets in repo | Repo scan + config review | In progress |
| Data Protection | Ciphertext-only vault storage | `nk/api/src/server.ts`, `nk/docs/openapi.yaml` | Implemented |
| Backups | PITR + restore drill | `docs/nk/NK6-backup-restore.md` + AWS screenshots | Pending cloud evidence |
| Change Control | CI checks before merge | `.github/workflows/ci-security.yml` | Implemented |

## CIS/NIST Mapping Notes
- Use this as a mapping table in final report:
  - Control ID
  - Requirement text
  - Artifact link
  - Pass/Fail
  - Remediation owner/date

## Required Final Outputs
- Completed checklist with pass/fail.
- One-page exception/remediation summary for any failed controls.
