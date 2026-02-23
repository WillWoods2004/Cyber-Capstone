# NK4 Test Tool Suite Report

## Objective
Verify auth + MFA + encrypted vault workflows and regression behavior.

## Automated Tests
| Test Group | Command | Expected |
| --- | --- | --- |
| SDK crypto tests | `cd nk/sdk; npm test` | Pass (encrypt/decrypt + wrong-key failure) |
| Frontend build check | `cd frontend; npm run build` | Pass |
| API build check | `cd nk/api; npm run build` | Pass |

## Integration Test Cases
| ID | Scenario | Steps | Expected Result | Status |
| --- | --- | --- | --- | --- |
| NK4-INT-01 | Login + MFA | Login then verify MFA code | Dashboard access granted | Pending evidence |
| NK4-INT-02 | Save encrypted item | Enter site/login/password, click Save | Item stored, visualizer shows `ct/iv/tag` | Pending evidence |
| NK4-INT-03 | Decrypt item | Click Decrypt on stored row | Visualizer + output reveal plaintext | Pending evidence |
| NK4-INT-04 | Delete item | Click Delete | Item removed from table/list | Pending evidence |
| NK4-INT-05 | Wrong decrypt key | Change login context/master password and decrypt | Decrypt fails with error | Pending evidence |

## Manual Crypto Visualizer Checks
- Timeline advances across encryption and decryption stages.
- Payload inspector shows ciphertext JSON without plaintext secret.
- IV reuse check displays `UNIQUE (good)` for repeated saves in a session.

## Evidence Files to Attach
- Screenshots or short recording of each test case.
- Console/network logs for failing and passing paths.
