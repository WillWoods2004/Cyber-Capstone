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
