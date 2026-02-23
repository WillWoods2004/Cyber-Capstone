# NK5 Deployment Automation Runbook

## Objective
Deploy frontend + backend to public HTTPS with repeatable steps.

## Target Architecture
- Frontend: hosted web app (`app.<domain>`)
- Backend: API Gateway + Lambda + DynamoDB (`api.<domain>`)
- TLS: ACM certificate on custom domains

## Pre-Deployment Inputs
- Domain purchased and DNS hosted.
- AWS account with permissions for API Gateway, Lambda, DynamoDB, IAM, ACM, CloudWatch.
- Environment variables for frontend:
  - `VITE_AUTH_API_BASE=https://api.<domain>`
  - `VITE_VAULT_API_BASE=https://api.<domain>`

## Steps
1. Deploy/update Lambda functions and API routes.
2. Validate API stage endpoints (`/login`, `/mfa/*`, `/vault/items*`).
3. Request ACM certificate for `api.<domain>` and validate DNS.
4. Create API Gateway custom domain and map to `prod` stage.
5. Point DNS record `api.<domain>` to API Gateway domain target.
6. Deploy frontend to hosting provider and map `app.<domain>`.
7. Update backend CORS to allow `https://app.<domain>`.
8. Run smoke test from phone and laptop.

## Rollback
- Revert frontend deployment to previous release.
- Re-point API custom domain mapping to previous stage.
- Disable problematic Lambda alias/version.

## Evidence Checklist
- API custom domain mapping screenshot
- ACM certificate screenshot
- DNS record screenshot
- Frontend custom domain screenshot
- End-to-end demo screenshots on two devices
