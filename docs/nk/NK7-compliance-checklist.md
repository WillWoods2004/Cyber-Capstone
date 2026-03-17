# NK7 Compliance and Configuration Monitoring

## Objective
Track baseline hardening and compliance alignment (CIS/NIST style).

## Checklist
| Control Area | Requirement | Evidence Location | Status |
| --- | --- | --- | --- |
| Identity | Least-privilege IAM roles for Lambda/API | IAM role `SecurityPassLambdaRole` screenshots/export | Partial - role appears to use `AmazonDynamoDBFullAccess` |
| Transport | TLS for public endpoints | Amplify HTTPS URL + API Gateway invoke URL | Implemented (live HTTPS verified 2026-03-17) |
| Logging | Centralized logs enabled | CloudWatch log group `/aws/lambda/SaveSecurityPassCredential` retention screenshot | Pass (retention set to `3 months` on 2026-03-17) |
| Monitoring | Alerts configured for failures/anomalies | CloudWatch alarm screenshots + SNS subscription screenshot | Pass |
| Secrets | No plaintext secrets in repo | `git grep` repo scan on 2026-03-16 + config review | Pass |
| Data Protection | Ciphertext-only vault storage and transport | `frontend/src/crypto/crypto.ts`, `frontend/src/components/VaultPanel.tsx`, `frontend/src/pages/Dashboard.tsx`, `scripts/ops/assert-no-legacy-cloud-save.ps1`, `artifacts/nk/live-bundle-inspection.txt` | Partial - live backend auth/row-scoping gap remains |
| Backups | PITR + restore drill | `docs/nk/NK6-backup-restore.md` + AWS screenshots | Pass |
| Change Control | CI checks before merge | `.github/workflows/ci-security.yml` | Pass |

## Current Findings
- Live deployment is using HTTPS on both frontend and backend endpoints.
- No tracked-file secret matches were found during a repo scan on 2026-03-16.
- The repo vault storage path sends ciphertext fields (`ct`, `iv`, `tag`) rather than plaintext password material.
- The repo branch removes the legacy plaintext `/credentials` helper and CI now blocks that pattern from returning.
- The current live bundle inspection on 2026-03-17 shows the deployed frontend no longer contains the legacy plaintext helper or old endpoint string.
- CloudWatch logging evidence now exists: `/aws/lambda/SaveSecurityPassCredential` is retained for `3 months`.
- CloudWatch monitoring evidence now exists: alarms `nk8-SaveSecurityPassCredential-Errors` and `nk8-SaveSecurityPassCredential-Throttles` target SNS topic `nk8-security-alerts`, and the email subscription is confirmed.
- Backup evidence now exists: PITR is enabled on `SecurityPassCredentials` and `SecurityPassUsers`, AWS Backup jobs completed, and restore drill `SecurityPassCredentials-restore-test-2026-03-17` succeeded.
- The main compliance exception is IAM scope: `SecurityPassLambdaRole` appears broader than least privilege because it uses `AmazonDynamoDBFullAccess`.
- A separate data-protection exception remains: vault routes appear unauthenticated on the live API, `GET /vault/items` returns all rows, and `POST /vault/items` still trusts client-supplied `userId`.

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
