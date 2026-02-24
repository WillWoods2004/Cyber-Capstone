# NK5 Deployment Automation Runbook

## Objective
Deploy frontend + backend to public HTTPS with repeatable steps.

## Target Architecture
- Frontend: AWS Amplify Hosting (default domain first, custom domain optional)
- Backend: API Gateway + Lambda + DynamoDB
- TLS: HTTPS on Amplify/API Gateway invoke URL; ACM only required for custom domains

## Pre-Deployment Inputs
- AWS account with permissions for API Gateway, Lambda, DynamoDB, IAM, ACM, CloudWatch.
- Frontend build config committed at repo root: `amplify.yml` (monorepo app root = `frontend`)
- Frontend environment variables:
  - `VITE_AUTH_API_BASE=https://<api-id>.execute-api.<region>.amazonaws.com/prod`
  - `VITE_VAULT_API_BASE=https://<api-id>.execute-api.<region>.amazonaws.com/prod`
- If custom domains are unavailable in account, continue with Amplify default domain + API invoke URL.

## Deployment Steps (Default-Domain First)
1. Verify API Gateway stage exposes all required routes:
   - `POST /register`
   - `POST /login`
   - `POST /mfa/setup`
   - `POST /mfa/verify`
   - `GET /vault/items`
   - `POST /vault/items`
   - `DELETE /vault/items/{id}`
2. Enable API Gateway CORS for all routes above and include:
   - Allowed origins: `https://<amplify-app-domain>`
   - Allowed methods: `GET,POST,DELETE,OPTIONS`
   - Allowed headers: `content-type,authorization`
3. Deploy frontend on Amplify:
   - Connect repo + branch
   - Confirm Amplify detects `amplify.yml`
   - Set environment variables:
     - `VITE_AUTH_API_BASE=https://<api-id>.execute-api.<region>.amazonaws.com/prod`
     - `VITE_VAULT_API_BASE=https://<api-id>.execute-api.<region>.amazonaws.com/prod`
   - Trigger deploy
4. Run endpoint validation from repo root:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\ops\check-endpoints.ps1 `
     -VaultApiBase "https://<api-id>.execute-api.<region>.amazonaws.com/prod" `
     -AuthApiBase "https://<api-id>.execute-api.<region>.amazonaws.com/prod" `
     -CheckAuthRoutes `
     -Origin "https://<amplify-app-domain>"
   ```
5. Smoke test from laptop and phone on Amplify URL:
   - Register -> Login -> MFA -> Vault Save -> Refresh -> Decrypt -> Delete

## Optional Custom-Domain Path
Use only if Route 53/domain features are available in account:
1. Request ACM certificate for `api.<domain>` and/or `app.<domain>`.
2. Create API Gateway custom domain and map to `prod`.
3. Point DNS records to API Gateway and Amplify targets.
4. Update CORS allowed origins to custom app domain.

## Rollback
- Revert frontend deployment to previous release.
- Re-point API custom domain mapping (if used) to previous stage.
- Disable problematic Lambda alias/version.

## Evidence Checklist
- Amplify successful deploy screenshot (app URL visible)
- API Gateway routes screenshot showing auth + vault CRUD
- CORS configuration screenshot for API routes
- Endpoint checker output screenshot (`check-endpoints.ps1`)
- End-to-end demo screenshots on two devices
