# NK4 Test Tool Suite Report

## Objective
Verify auth + MFA + encrypted vault workflows and regression behavior.

## Automated Tests
| Test Group | Command | Expected |
| --- | --- | --- |
| SDK crypto tests | `cd nk/sdk; npm test` | Pass (encrypt/decrypt + wrong-key failure) |
| Frontend build check | `cd frontend; npm run build` | Pass |
| API build check | `cd nk/api; npm run build` | Pass |

## Live Test Environment
- Date verified: `2026-03-16`
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
| NK4-INT-04 | Delete item | Click Delete | Item removed from table/list | Fail (API returns `204`, follow-up verification still sees row) |
| NK4-INT-05 | Wrong decrypt key | Change login context/master password and decrypt | Decrypt fails with error | Pending rerun/evidence |

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
  -SmokeVaultCrud
```

Observed result on 2026-03-16:
- Pass: auth route reachability
- Pass: CORS for Amplify domain
- Pass: vault smoke POST
- Pass: vault smoke GET
- Pass: vault smoke DELETE returned `204`
- Fail: follow-up list still contained the deleted row

## Evidence Files to Attach
- Amplify screenshots for login/MFA/save/decrypt.
- Endpoint checker console output for auth/CORS/vault CRUD.
- Final bug note for delete inconsistency until cloud fix is applied.
