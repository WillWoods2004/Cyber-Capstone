# NK7 Compliance and Configuration Monitoring

## Objective
Track baseline hardening and compliance alignment (CIS/NIST style).

## Checklist
| Control Area | Requirement | Evidence Location | Status |
| --- | --- | --- | --- |
| Identity | Least-privilege IAM roles for Lambda/API | IAM policy screenshots + JSON export | Pending cloud evidence |
| Transport | TLS for public endpoints | Amplify HTTPS URL + API Gateway invoke URL | Implemented (live HTTPS verified 2026-03-16) |
| Logging | Centralized logs enabled | CloudWatch log group screenshots | Pending cloud evidence |
| Monitoring | Alerts configured for failures/anomalies | CloudWatch alarm screenshots | Pending cloud evidence |
| Secrets | No plaintext secrets in repo | `git grep` repo scan on 2026-03-16 + config review | Pass |
| Data Protection | Ciphertext-only vault storage | `frontend/src/crypto/crypto.ts`, `frontend/src/components/VaultPanel.tsx` | Pass |
| Backups | PITR + restore drill | `docs/nk/NK6-backup-restore.md` + AWS screenshots | Pending cloud evidence |
| Change Control | CI checks before merge | `.github/workflows/ci-security.yml` | Pass |

## Current Findings
- Live deployment is using HTTPS on both frontend and backend endpoints.
- No tracked-file secret matches were found during a repo scan on 2026-03-16.
- Vault storage path sends ciphertext fields (`ct`, `iv`, `tag`) rather than plaintext password material.
- IAM, CloudWatch logging, alarm configuration, and backup evidence still need direct AWS screenshots/exports.

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
