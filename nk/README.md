# NK slice (NKSF1 + NKSF2)

- SDK (Argon2id -> AES-GCM): `nk/sdk`
- API (ciphertext-only): `nk/api`
- Zero-knowledge: server sees only `{ ct, iv, tag, meta }`

## Run
cd nk/sdk && npm i && npm test && npm run build
cd ../api && npm i && npm run build && npm start   # http://localhost:8080

## Endpoints
GET /healthz
GET/POST /vault/items
GET/DELETE /vault/items/:id
