# NK Evidence Pack

This folder contains the repository-side artifacts for NK1-NK8.

## Status Matrix
| ID | Area | Current State | Evidence File |
| --- | --- | --- | --- |
| NK1 | Data modeling | Documented | `docs/nk/NK1-data-model.md` |
| NK2 | Secure code development | Repo remediated to remove legacy plaintext sync helper; live frontend redeploy still pending | `docs/nk/NK2-evidence.md` |
| NK3 | CI/CD + security checks | Pipeline/reporting added; regression guard added; current local audit artifacts show 0 known vulnerabilities | `docs/nk/NK3-ci-cd-security.md` |
| NK4 | Test tool suite | Local tests pass; live auth/save/decrypt verified; delete follow-up still failing | `docs/nk/NK4-test-report.md` |
| NK5 | Deployment automation | Live Amplify/API deployment verified; runbook updated with current URLs, smoke checks, and bundle guard | `docs/nk/NK5-deployment-runbook.md` |
| NK6 | Backup management | Backup/restore procedure defined; AWS-authenticated evidence still pending | `docs/nk/NK6-backup-restore.md` |
| NK7 | Compliance monitoring | Checklist updated with repo fix and live redeploy caveat; AWS exports/screenshots still pending | `docs/nk/NK7-compliance-checklist.md` |
| NK8 | Security monitoring | Monitoring runbook updated with delete diagnosis and legacy-helper alert | `docs/nk/NK8-monitoring-log-analysis.md` |

## Supporting Automation
- CI workflow: `.github/workflows/ci-security.yml`
- Audit collector script: `scripts/ops/collect-npm-audit.ps1`
- Endpoint checker script: `scripts/ops/check-endpoints.ps1`
- Plaintext-regression guard: `scripts/ops/assert-no-legacy-cloud-save.ps1`
- Status snapshot: `docs/nk/NK-status-summary.md`

## What Is Still Non-Repo Work
- AWS console/API actions for PITR, restore drill, IAM exports, CloudWatch alarms, and log screenshots
- Amplify redeploy of the repo-side plaintext-sync remediation
- Production screenshots for the final submission packet
- Cross-device live demo recording
- Cloud fix for the live vault delete inconsistency

## Local Artifact Output
- Local audit JSON files are generated to: `artifacts/audit/`
- Live endpoint and bundle evidence can be generated to: `artifacts/nk/`
