# NK3 CI/CD + Security Checks

## Objective
Automate build/test and produce security scan artifacts per run.

## Pipeline File
- `.github/workflows/ci-security.yml`

## Pipeline Coverage
- `frontend`: install + build + npm audit report
- `nk/api`: install + build + npm audit report
- `nk/sdk`: install + test + build + npm audit report

## Artifacts Produced
- `frontend-audit.json`
- `nk-api-audit.json`
- `nk-sdk-audit.json`

All are uploaded as workflow artifacts for evidence packaging.

## Local Reproduction Commands
```powershell
cd frontend; npm ci; npm run build; npm audit --json > ..\artifacts\frontend-audit.json
cd ..\nk\api; npm ci; npm run build; npm audit --json > ..\..\artifacts\nk-api-audit.json
cd ..\sdk; npm ci; npm test; npm run build; npm audit --json > ..\..\artifacts\nk-sdk-audit.json
```

## Evidence to Capture for Submission
- Screenshot of successful workflow run.
- Artifact list screenshot from CI run.
- Summary of high/moderate vulnerabilities and disposition.
