Cyber-Capstone – Quick Start (Windows, PowerShell)

Prereqs
- Node.js 18+ (`node -v`)
- Git

Clone the repo
```
git clone https://github.com/WillWoods2004/Cyber-Capstone.git
cd Cyber-Capstone
git checkout main
```

Start the mock API (terminal 1)
```
cd nk/api
npm install
npm run build
npm start
```
Expect: "Mock API listening on http://localhost:8080".

Start the frontend (terminal 2)
```
cd C:\Users\neelankanjee\Cyber-Capstone\frontend
@'
VITE_API_BASE=http://localhost:8080
'@ | Set-Content .\.env.local -Encoding UTF8
npm install
npm run dev
```
Open the URL shown (usually http://localhost:5173/).

Use the app
- Login → MFA.
- Sidebar: click "Client Vault".
- Vault: enter site/login/password → Save → Refresh → Decrypt (server only sees ciphertext).
- Password generator: Generate → Save to vault → Refresh → Decrypt.

Optional (CLI smoke, no UI)
```
cd C:\Users\neelankanjee\Cyber-Capstone\nk\sdk
npm install
npm run build
cd ../..
node .\scripts\smoke.mjs
```
