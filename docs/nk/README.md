# NK Evidence Pack

This folder contains the repository-side artifacts for NK1-NK8.

## Status Matrix
| ID | Area | Current State | Evidence File |
| --- | --- | --- | --- |
| NK1 | Data modeling | Documented | `docs/nk/NK1-data-model.md` |
| NK2 | Secure code development | Implemented + mapped | `docs/nk/NK2-evidence.md` |
| NK3 | CI/CD + security checks | Pipeline + reporting added | `docs/nk/NK3-ci-cd-security.md` |
| NK4 | Test tool suite | Test plan/report template + existing results | `docs/nk/NK4-test-report.md` |
| NK5 | Deployment automation | Runbook defined (cloud execution required) | `docs/nk/NK5-deployment-runbook.md` |
| NK6 | Backup management | Backup/restore procedure defined | `docs/nk/NK6-backup-restore.md` |
| NK7 | Compliance monitoring | Checklist template defined | `docs/nk/NK7-compliance-checklist.md` |
| NK8 | Security monitoring | Alerting/log analysis runbook defined | `docs/nk/NK8-monitoring-log-analysis.md` |

## Supporting Automation
- CI workflow: `.github/workflows/ci-security.yml`
- Audit collector script: `scripts/ops/collect-npm-audit.ps1`
- Endpoint checker script: `scripts/ops/check-endpoints.ps1`
- Status snapshot: `docs/nk/NK-status-summary.md`

## What Is Still Non-Repo Work
- AWS console actions (domain, cert, API mapping, alarms)
- Production screenshots for evidence
- Cross-device live demo recording

## Local Artifact Output
- Local audit JSON files are generated to: `artifacts/audit/`
