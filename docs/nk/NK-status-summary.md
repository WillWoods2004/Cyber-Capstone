# NK Status Summary

This summary reflects what is currently verified from repository artifacts, local execution, and live cloud validation completed on 2026-03-17. All material cloud changes referenced below were performed directly in live AWS during the March 17, 2026 validation session.

## Implemented and Verified
- NK1 secure schema rationale and data model are documented.
- NK2 secure code implementation is mapped to the frontend crypto flow and API contract.
- NK2 repo code has been remediated to remove the legacy plaintext `/credentials` sync helper from the client vault flow.
- The current live Amplify bundle no longer contains the legacy plaintext helper or old endpoint string.
- NK3 CI pipeline and audit tooling are committed and the current `main` branch builds/tests cleanly.
- NK3 now includes a regression guard script that fails CI if the legacy plaintext cloud-save helper is reintroduced.
- Fresh local audit artifacts now show `0` known vulnerabilities in `frontend`, `nk/api`, and `nk/sdk` after lockfile remediation and reinstall.
- NK4 automated build/test baseline is passing:
  - `frontend`: `npm run build`
  - `nk/api`: `npm run build`
  - `nk/sdk`: `npm test`
- NK5 live deployment exists on:
  - Amplify frontend: `https://main.d18bgjfq8i2fkv.amplifyapp.com`
  - API Gateway: `https://y1o1g8ogfh.execute-api.us-east-1.amazonaws.com/prod`

## Live Validation Completed
- Auth routes are reachable on the live API.
- MFA setup/verify flow is working from the live Amplify app.
- Client-side vault encryption is working in-browser.
- Live vault `POST /vault/items` succeeds.
- Live vault `GET /vault/items` succeeds.
- Live vault `DELETE /vault/items/{id}` now succeeds end to end after the March 17, 2026 Lambda hotfix.
- Live decrypt flow succeeds after retrieving ciphertext from the cloud API.
- CORS allows the Amplify app origin on auth and vault routes.
- `artifacts/nk/live-endpoint-check.json` reports `passed=true` with smoke item id `nk-smoke-9902044c`.
- `artifacts/nk/live-bundle-inspection.txt` shows deployed asset `/assets/index-1ELDpQIp.js`, `OLD_HELPER_PRESENT=False`, and `OLD_ENDPOINT_PRESENT=False`.

## Cloud Validation Completed
- API Gateway `SecurityPassAPI (y1o1g8ogfh)` exposes `GET /vault/items`, `POST /vault/items`, and `DELETE /vault/items/{id}`; `GET /vault/items/{id}` is not currently deployed.
- Live Lambda `SaveSecurityPassCredential` delete logic was fixed in AWS to page through scan results when locating `credentialId` before delete.
- DynamoDB tables `SecurityPassCredentials` and `SecurityPassUsers` now have PITR enabled.
- AWS Backup jobs completed for both tables and a restore drill completed successfully to `SecurityPassCredentials-restore-test-2026-03-17`.
- CloudWatch log group `/aws/lambda/SaveSecurityPassCredential` exists and retention is set to `3 months`.
- CloudWatch alarms `nk8-SaveSecurityPassCredential-Errors` and `nk8-SaveSecurityPassCredential-Throttles` exist, target SNS topic `nk8-security-alerts`, and the email subscription is confirmed.

## Remaining NK Work
- NK7 is not fully closed because `SecurityPassLambdaRole` appears to use `AmazonDynamoDBFullAccess` rather than table-scoped least privilege.
- For a true end-to-end security closure, vault routes still need authenticated user enforcement and server-side row scoping.
- Final submission packaging still needs the AWS screenshots/export set and any required demo recording.

## Current Known Issue
- Public `GET /vault/items/{id}` still returns `404` because the route is missing from API Gateway.
- Vault routes appear to have no authorizer attached on the live API.
- Live `GET /vault/items` still scans/returns all table rows and the current frontend filters by `meta.userId` client-side.
- Live `POST /vault/items` still trusts client-supplied `userId`, so backend-side data ownership enforcement remains incomplete.
