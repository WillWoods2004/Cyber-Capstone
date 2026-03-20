# NK slice (NKSF1 + NKSF2)

This slice now contains:

- `NKSF1`: proposal-aligned encrypted vault flow
- `NKSF2`: proposal-aligned containerized backend + hardened deployment assets

- SDK: `nk/sdk`
  - Argon2id key derivation
  - AES-256-GCM client-side encryption
  - zeroization helpers for sensitive byte buffers
- API: `nk/api`
  - MFA-backed login flow
  - bearer-authenticated vault routes
  - server-side owner scoping for every vault item
  - ciphertext-only storage (`ct`, `iv`, `tag`, `meta`)
  - vault key rotation endpoint that replaces ciphertext without exposing plaintext
- Frontend: `frontend`
  - client-encrypted vault visualizer
  - auto-lock after inactivity
  - best-effort in-memory cleanup on logout/timeout
  - vault key rotation UI

## NKSF2 deployment assets

- Docker image: `nk/api/Dockerfile`
- Local hardened compose profile: `deploy/nksf2/docker-compose.yml`
- AWS ECS/Fargate + ALB Terraform: `infra/terraform/nksf2`
- CI/CD workflow: `.github/workflows/nksf2-container-deploy.yml`
- Static asset verification: `scripts/ops/check-nksf2-assets.ps1`

NKSF2 runtime hardening includes:

- non-root container user
- read-only root filesystem
- health checks
- `helmet` headers
- CORS restricted by env var
- TLS 1.3-capable ALB policy in Terraform
- security groups that only expose ALB ingress and ALB -> service traffic
- Secrets Manager injection for the token secret

## Local run

```powershell
cd nk\sdk
npm i
npm test
npm run build

cd ..\api
npm i
npm run build
npm start
```

In a second terminal:

```powershell
cd frontend
npm i
npm run build
npm run dev
```

## Auth flow

- `POST /register`
- `POST /login`
  - returns `challengeToken` and `vaultProfile`
- `POST /mfa/setup`
  - requires `Authorization: Bearer <challengeToken>`
- `POST /mfa/verify`
  - requires `Authorization: Bearer <challengeToken>`
  - returns `authToken`
- `GET /vault/profile`
  - requires `Authorization: Bearer <authToken>`

## Vault flow

- `GET /vault/items`
- `POST /vault/items`
- `GET /vault/items/:id`
- `DELETE /vault/items/:id`
- `POST /vault/rotate-key`

Every vault route requires `Authorization: Bearer <authToken>`.

## Verification scripts

```powershell
node scripts\demo-e2e.mjs
node scripts\decrypt-latest.mjs
node scripts\ops\verify-vault-auth-flow.mjs
pwsh scripts\ops\check-nksf2-assets.ps1
```

The verification script proves:

- authenticated users only see their own ciphertext rows
- cross-user read/delete requests fail
- client-side decrypt still works after vault key rotation
- old login password stops working after rotation

For NKSF2 deployment details and evidence notes, see:

- `docs/nk/NKSF2-deployment-hardening.md`
- `infra/terraform/nksf2/README.md`
