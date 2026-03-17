# NK2 Secure Code Development Evidence

## Objective
Implement secure auth + vault logic with client-side cryptography and safe API contracts.

## Control-to-Code Mapping
| Control | Implementation Evidence |
| --- | --- |
| Argon2id-based key derivation | `frontend/src/crypto/crypto.ts` |
| AES-GCM encryption/decryption | `frontend/src/crypto/crypto.ts` |
| Key held in memory only | `frontend/src/crypto/CryptoProvider.tsx` |
| Ciphertext-only vault request path | `frontend/src/crypto/CryptoProvider.tsx`, `frontend/src/components/VaultPanel.tsx`, `nk/docs/openapi.yaml` |
| Legacy plaintext sync helper removed from vault flow | `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/ClientVault.tsx` |
| Frontend visual proof of encryption/decryption | `frontend/src/components/VaultPanel.tsx` |
| Auth and vault endpoint config centralized | `frontend/src/config/api.ts` |

## Secure Coding Practices Used
- Input validation on API payload shape with `zod`.
- No plaintext vault secret persisted on server.
- Explicit error handling for fetch + JSON parse failures.
- Separation of concerns: crypto helpers, provider abstraction, UI layer.
- Removed the legacy direct `/credentials` sync helper that sent plaintext password material to an older API endpoint.

## Manual Validation Checklist
- Save item from client vault and confirm `ct/iv/tag` appear in UI visualizer.
- Confirm decrypt action occurs client-side and reveals plaintext only after decrypt.
- Confirm API list endpoint returns ciphertext items only.
- Confirm the frontend source/bundle no longer contains `saveCredentialToCloud` or `/credentials` references before release. Pass for the current live bundle on 2026-03-17.

## Current Deployment Note
- Amplify was redeployed before the March 17, 2026 live validation pass.
- The current live bundle inspection shows deployed asset `/assets/index-1ELDpQIp.js` and confirms `OLD_HELPER_PRESENT=False` and `OLD_ENDPOINT_PRESENT=False`.
- Evidence: `artifacts/nk/live-bundle-inspection.txt` and `artifacts/nk/local-bundle-inspection.txt`
- The remaining live security gap is server-side: vault routes appear to have no authorizer, `GET /vault/items` returns all rows, and `POST /vault/items` still trusts client-supplied `userId`.

## Remaining Actions (if needed)
- Coordinate backend auth/row-scoping hardening with the current frontend contract before release.
- Add lint and SAST outputs into CI artifacts for merge gates.
- Add explicit security review sign-off note per release.
