# NK3 CI/CD + Security Checks

## Objective
Automate build/test and produce security scan artifacts per run.

## Pipeline File
- `.github/workflows/ci-security.yml`

## Pipeline Coverage
- Policy check: fail build if the legacy plaintext cloud-save helper is present in `frontend/src` or `nk/api`
- `frontend`: install + build + npm audit report
- `nk/api`: install + build + npm audit report
- `nk/sdk`: install + test + build + npm audit report

## Policy Script
- `scripts/ops/assert-no-legacy-cloud-save.ps1`

## Artifacts Produced
- `frontend-audit.json`
- `nk-api-audit.json`
- `nk-sdk-audit.json`

All are uploaded as workflow artifacts for evidence packaging.

## Current Local Audit Status
- Verification window: 2026-03-16 local / 2026-03-17 UTC
- `artifacts/audit/frontend-audit.json`: 0 known vulnerabilities
- `artifacts/audit/nk-api-audit.json`: 0 known vulnerabilities
- `artifacts/audit/nk-sdk-audit.json`: 0 known vulnerabilities

## Local Reproduction Commands
```powershell
cd frontend; npm ci; npm run build; npm audit --json > ..\artifacts\frontend-audit.json
cd ..\nk\api; npm ci; npm run build; npm audit --json > ..\..\artifacts\nk-api-audit.json
cd ..\sdk; npm ci; npm test; npm run build; npm audit --json > ..\..\artifacts\nk-sdk-audit.json
pwsh .\scripts\ops\assert-no-legacy-cloud-save.ps1
```

## Evidence to Capture for Submission
- Screenshot of successful workflow run.
- Artifact list screenshot from CI run.
- Summary of high/moderate vulnerabilities and disposition.
- Successful run of `assert-no-legacy-cloud-save.ps1`
