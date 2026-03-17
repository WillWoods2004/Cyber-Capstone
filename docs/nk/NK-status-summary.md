# NK Status Summary

This summary reflects what is currently verified from repository artifacts, local execution, and live cloud validation completed on 2026-03-16.

## Implemented and Verified
- NK1 secure schema rationale and data model are documented.
- NK2 secure code implementation is mapped to the frontend crypto flow and API contract.
- NK3 CI pipeline and audit tooling are committed and the current `main` branch builds/tests cleanly.
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

## Remaining NK Work
- NK4: capture final screenshots/video for the live test cases and document the remaining delete inconsistency.
- NK6: backup/restore procedure is documented, but PITR/restore-drill evidence is still missing.
- NK7: compliance checklist is now partially filled, but IAM/logging/backup proof still needs AWS screenshots.
- NK8: monitoring playbook is defined, but CloudWatch alarms/dashboard/log-retention evidence is still missing.

## Current Known Issue
- Live `DELETE /vault/items/{id}` returns `204`, but the repo smoke script still sees the deleted row on the follow-up list call. This is a cloud-backend issue still pending isolation.
