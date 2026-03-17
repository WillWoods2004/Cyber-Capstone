# NK Evidence Pack

This folder contains the repository-side artifacts for NK1-NK8.

## Status Matrix
| ID | Area | Current State | Evidence File |
| --- | --- | --- | --- |
| NK1 | Data modeling | Documented | `docs/nk/NK1-data-model.md` |
| NK2 | Secure code development | Implemented + mapped | `docs/nk/NK2-evidence.md` |
| NK3 | CI/CD + security checks | Pipeline + reporting added | `docs/nk/NK3-ci-cd-security.md` |
| NK4 | Test tool suite | Local tests pass; live auth/save/decrypt verified; delete follow-up still failing | `docs/nk/NK4-test-report.md` |
| NK5 | Deployment automation | Live Amplify/API deployment verified; runbook updated with current URLs and smoke checks | `docs/nk/NK5-deployment-runbook.md` |
| NK6 | Backup management | Backup/restore procedure defined; live restore evidence still pending | `docs/nk/NK6-backup-restore.md` |
| NK7 | Compliance monitoring | Checklist partially filled with current pass/pending status | `docs/nk/NK7-compliance-checklist.md` |
| NK8 | Security monitoring | Monitoring runbook updated with current live findings; CloudWatch evidence still pending | `docs/nk/NK8-monitoring-log-analysis.md` |

## Supporting Automation
- CI workflow: `.github/workflows/ci-security.yml`
- Audit collector script: `scripts/ops/collect-npm-audit.ps1`
- Endpoint checker script: `scripts/ops/check-endpoints.ps1`
- Status snapshot: `docs/nk/NK-status-summary.md`

## What Is Still Non-Repo Work
- AWS console actions for PITR, restore drill, IAM exports, CloudWatch alarms, and log screenshots
- Production screenshots for the final submission packet
- Cross-device live demo recording
- Cloud fix for the live vault delete inconsistency

## Local Artifact Output
- Local audit JSON files are generated to: `artifacts/audit/`
