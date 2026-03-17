# NK Status Summary

This summary reflects what is currently verified from repository artifacts, local execution, and live cloud validation completed on 2026-03-16 (local) / 2026-03-17 UTC.

## Implemented and Verified
- NK1 secure schema rationale and data model are documented.
- NK2 secure code implementation is mapped to the frontend crypto flow and API contract.
- NK2 repo code has been remediated to remove the legacy plaintext `/credentials` sync helper from the client vault flow.
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
- Live decrypt flow succeeds after retrieving ciphertext from the cloud API.
- CORS allows the Amplify app origin on auth and vault routes.

## Additional Diagnostics Completed
- The public API returned `404` for `GET /vault/items/{id}` during live probing, even though the local mock API/OpenAPI spec exposes that route.
- The public API returned `204` for `DELETE /vault/items/{id}`, but the same id still appeared in `GET /vault/items` after repeated checks and after a 10-second wait.
- The currently deployed Amplify bundle (`/assets/index-DhK_2DO9.js`) contains both:
  - the current vault API base `https://y1o1g8ogfh.execute-api.us-east-1.amazonaws.com/prod`
  - the legacy plaintext sync endpoint `https://5y6lvgdx08.execute-api.us-east-1.amazonaws.com/prod/credentials`

## Remaining NK Work
- NK4: redeploy the frontend bundle without the legacy plaintext helper, then rerun live save/decrypt/delete validation and capture final screenshots/video.
- NK6: backup/restore procedure is documented, but PITR/restore-drill evidence is still missing.
- NK7: compliance checklist is partially filled, but IAM/logging/backup proof still needs AWS screenshots/exports.
- NK8: monitoring playbook is defined, but CloudWatch alarms/dashboard/log-retention evidence is still missing.
- AWS-authenticated evidence collection was not possible from this terminal session because no AWS CLI/SDK profile or environment credentials were available.

## Current Known Issue
- Live `DELETE /vault/items/{id}` returns `204`, but the repo smoke script still sees the deleted row on the follow-up list call. This is a cloud-backend issue still pending isolation.
- The live Amplify build still includes the legacy plaintext `/credentials` helper. The repo fix exists locally on this branch, but the live frontend must be rebuilt/redeployed before the ciphertext-only claim is fully true end to end.
