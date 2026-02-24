# Cyber-Capstone - Quick Start (Windows, PowerShell)

## Prereqs
- Node.js 18+
- Git

## Clone
```powershell
git clone https://github.com/WillWoods2004/Cyber-Capstone.git
cd Cyber-Capstone
git checkout main
```

## 1) Start mock vault API (terminal 1)
```powershell
cd nk/api
npm install
npm run build
npm start
```
Expected log: `Mock API listening on http://localhost:8080`

## 2) Configure frontend API bases (terminal 2)
From `frontend`, create `.env.local`.

Full local mode (auth + vault on localhost):
```powershell
cd .\frontend
@'
VITE_API_BASE=http://localhost:8080
'@ | Set-Content .\.env.local -Encoding UTF8
```

Unified base for auth + vault:
```powershell
cd .\frontend
@'
VITE_API_BASE=https://y1o1g8ogfh.execute-api.us-east-1.amazonaws.com/prod
'@ | Set-Content .\.env.local -Encoding UTF8
```

Split mode (AWS auth + local mock vault):
```powershell
cd .\frontend
@'
VITE_AUTH_API_BASE=https://y1o1g8ogfh.execute-api.us-east-1.amazonaws.com/prod
VITE_VAULT_API_BASE=http://localhost:8080
'@ | Set-Content .\.env.local -Encoding UTF8
```

## 3) Start frontend
```powershell
cd .\frontend
npm install
npm run dev
```
Open the Vite URL (usually `http://localhost:5173`).

## 4) Validate flow
- Login -> MFA -> Client Vault
- Save `site` + `login/email` + `password`
- Refresh -> Decrypt -> Copy
- In full local mode, use Register first, then MFA verify with code `123456` (or value from `MOCK_MFA_CODE` env var in `nk/api`).

## Optional CLI checks
```powershell
cd .\nk\sdk
npm install
npm run build
cd ..\..
node .\scripts\demo-e2e.mjs
node .\scripts\decrypt-latest.mjs
```

## NK evidence docs
- Evidence pack index: `docs/nk/README.md`
- CI/security workflow: `.github/workflows/ci-security.yml`
- Ops helper scripts: `scripts/ops/collect-npm-audit.ps1`, `scripts/ops/check-endpoints.ps1`

## Cloud deploy (Amplify default domain)
1. In Amplify, deploy this repo branch and keep repo-root build config from `amplify.yml`.
2. Set Amplify env vars:
   - `VITE_AUTH_API_BASE=https://<api-id>.execute-api.<region>.amazonaws.com/prod`
   - `VITE_VAULT_API_BASE=https://<api-id>.execute-api.<region>.amazonaws.com/prod`
3. Ensure API Gateway includes auth + vault routes and CORS allows your Amplify URL.

Endpoint + CORS verification:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\ops\check-endpoints.ps1 `
  -VaultApiBase "https://<api-id>.execute-api.<region>.amazonaws.com/prod" `
  -AuthApiBase "https://<api-id>.execute-api.<region>.amazonaws.com/prod" `
  -CheckAuthRoutes `
  -Origin "https://<amplify-app-domain>"
```

Add `-CheckVaultHealth` when validating the local mock API (`http://localhost:8080`).
