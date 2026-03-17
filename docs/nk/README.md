# NK Evidence Pack

This folder contains the repository-side artifacts for NK1-NK8.

## Status Matrix
| ID | Area | Current State | Evidence File |
| --- | --- | --- | --- |
| NK1 | Data modeling | Documented | `docs/nk/NK1-data-model.md` |
| NK2 | Secure code development | Repo and live frontend no longer ship the legacy plaintext sync helper; remaining backend auth/data-scope hardening is still open | `docs/nk/NK2-evidence.md` |
| NK3 | CI/CD + security checks | Pipeline/reporting added; regression guard added; current local audit artifacts show 0 known vulnerabilities | `docs/nk/NK3-ci-cd-security.md` |
| NK4 | Test tool suite | Local tests pass; March 17 live smoke checks pass for auth/CORS/vault save-list-delete; `GET /vault/items/{id}` remains absent on the live API | `docs/nk/NK4-test-report.md` |
| NK5 | Deployment automation | Live Amplify/API deployment verified on 2026-03-17; current bundle inspection shows only the current API endpoint | `docs/nk/NK5-deployment-runbook.md` |
| NK6 | Backup management | PITR enabled on both DynamoDB tables; AWS Backup jobs and restore drill completed on 2026-03-17 | `docs/nk/NK6-backup-restore.md` |
| NK7 | Compliance monitoring | HTTPS/logging/monitoring/backup evidence now exists; IAM least-privilege remediation is still open | `docs/nk/NK7-compliance-checklist.md` |
| NK8 | Security monitoring | CloudWatch log retention, Errors/Throttles alarms, and SNS email confirmation completed on 2026-03-17 | `docs/nk/NK8-monitoring-log-analysis.md` |

## Supporting Automation
- CI workflow: `.github/workflows/ci-security.yml`
- Audit collector script: `scripts/ops/collect-npm-audit.ps1`
- Endpoint checker script: `scripts/ops/check-endpoints.ps1`
- Plaintext-regression guard: `scripts/ops/assert-no-legacy-cloud-save.ps1`
- Status snapshot: `docs/nk/NK-status-summary.md`

## What Is Still Non-Repo Work
- Production screenshots for the final submission packet
- Cross-device live demo recording
- IAM least-privilege remediation for `SecurityPassLambdaRole` if strict NK7 closure is required
- End-to-end vault hardening: attach auth to vault routes, enforce server-side row scoping for `GET /vault/items`, stop trusting client-supplied `userId`, and optionally add `GET /vault/items/{id}`

## Local Artifact Output
- Local audit JSON files are generated to: `artifacts/audit/`
- Live endpoint and bundle evidence can be generated to: `artifacts/nk/`
