# NK4 Test Tool Suite Report

## Objective
Verify auth + MFA + encrypted vault workflows, regression behavior, and client-side secret handling.

## Automated Tests
| Test Group | Command | Expected |
| --- | --- | --- |
| SDK crypto tests | `cd nk/sdk; npm test` | Pass (encrypt/decrypt + wrong-key failure) |
| Frontend build check | `cd frontend; npm run build` | Pass |
| API build check | `cd nk/api; npm run build` | Pass |

## Live Test Environment
- Date verified: `2026-03-17`
- Frontend: `https://main.d18bgjfq8i2fkv.amplifyapp.com`
- API: `https://y1o1g8ogfh.execute-api.us-east-1.amazonaws.com/prod`
- Verification tools:
  - manual UI run on Amplify app
  - `scripts/ops/check-endpoints.ps1`

## Integration Test Cases
| ID | Scenario | Steps | Expected Result | Status |
| --- | --- | --- | --- | --- |
| NK4-INT-01 | Login + MFA | Login then verify MFA code | Dashboard access granted | Pass (live verified) |
| NK4-INT-02 | Save encrypted item | Enter site/login/password, click Save | Item stored, visualizer shows `ct/iv/tag` | Pass (live verified) |
| NK4-INT-03 | Decrypt item | Click Decrypt on stored row | Visualizer + output reveal plaintext | Pass (live verified) |
| NK4-INT-04 | Delete item | Click Delete | Item removed from table/list | Pass (live verified 2026-03-17 after Lambda hotfix) |
| NK4-INT-05 | Wrong decrypt key | Change login context/master password and decrypt | Decrypt fails with error | Pending rerun/evidence |
| NK4-INT-06 | Plaintext cloud sync regression | Inspect repo and live bundle for legacy `/credentials` helper | No plaintext sync helper present | Pass (repo and current live bundle clear on 2026-03-17) |
| NK4-INT-07 | Live item route parity | Probe `GET /vault/items/{id}` on public API | Route available or gap documented | Info: live API still returns `404` because the route is absent |

## Manual Crypto Visualizer Checks
- Timeline advances across encryption and decryption stages.
- Payload inspector shows ciphertext JSON without plaintext secret.
- IV reuse check displays `UNIQUE (good)` for repeated saves in a session.

## Endpoint Checker Result
Command:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\ops\check-endpoints.ps1 `
  -VaultApiBase "https://y1o1g8ogfh.execute-api.us-east-1.amazonaws.com/prod" `
  -AuthApiBase "https://y1o1g8ogfh.execute-api.us-east-1.amazonaws.com/prod" `
  -CheckAuthRoutes `
  -Origin "https://main.d18bgjfq8i2fkv.amplifyapp.com" `
  -SmokeVaultCrud `
  -EvidenceOutputPath ".\artifacts\nk\live-endpoint-check.json"
```

Observed result on 2026-03-17:
- Pass: auth route reachability
- Pass: CORS for Amplify domain
- Pass: vault smoke POST created `nk-smoke-9902044c`
- Pass: vault smoke GET located `nk-smoke-9902044c`
- Pass: vault smoke DELETE returned `204`
- Pass: follow-up list no longer included `nk-smoke-9902044c`
- Info: public `GET /vault/items/{id}` returned `404` because the route is absent on the live API
- Overall script result: `passed=true` in `artifacts/nk/live-endpoint-check.json`

## Additional Findings
- The current live bundle inspection (`artifacts/nk/live-bundle-inspection.txt`) shows deployed asset `/assets/index-1ELDpQIp.js` and no legacy `/credentials` helper or old endpoint string.
- API Gateway `SecurityPassAPI` still lacks public `GET /vault/items/{id}` on the live deployment.
- Broader live security issues remain outside the smoke script: vault routes appear to have no authorizer, `GET /vault/items` returns all rows, and the current frontend filters by `meta.userId` client-side.

## Evidence Files to Attach
- Amplify screenshots for login/MFA/save/decrypt.
- Endpoint checker console output for auth/CORS/vault CRUD.
- `artifacts/nk/live-endpoint-check.json`
- `artifacts/nk/live-bundle-inspection.txt`
- `artifacts/nk/local-bundle-inspection.txt`
- API Gateway screenshot showing missing `GET /vault/items/{id}` if the route-gap note is included in final submission.
