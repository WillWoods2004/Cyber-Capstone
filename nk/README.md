# NK slice (NKSF1 + NKSF2)

- SDK (Argon2id -> AES-GCM): `nk/sdk`
- API (ciphertext-only): `nk/api`
- Zero-knowledge: server sees only `{ ct, iv, tag, meta }`
- Vault access is authenticated after login + MFA and scoped server-side to the signed-in user.

## Run
cd nk/sdk && npm i && npm test && npm run build
cd ../api && npm i && npm run build && npm start   # http://localhost:8080

## Endpoints
GET /healthz
POST /login
POST /mfa/setup
POST /mfa/verify
GET/POST /vault/items      # Bearer token required
GET/DELETE /vault/items/:id # Bearer token required

## Local Verification
- End-to-end authenticated vault flow:
  `node .\scripts\ops\verify-vault-auth-flow.mjs`
- Demo CRUD trace with ciphertext output:
  `node .\scripts\demo-e2e.mjs`
- Fetch + decrypt latest item from the same authenticated session:
  `node .\scripts\decrypt-latest.mjs`
