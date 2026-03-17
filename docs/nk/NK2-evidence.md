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
- Confirm the frontend source/bundle no longer contains `saveCredentialToCloud` or `/credentials` references before release.

## Current Deployment Note
- The repo branch is fixed, but the currently deployed Amplify bundle still contains the legacy plaintext endpoint string.
- Evidence: `artifacts/nk/live-bundle-inspection.txt` and `artifacts/nk/local-bundle-inspection.txt`
- Do not claim end-to-end ciphertext-only handling for the live frontend until Amplify is rebuilt from the remediated code.

## Remaining Actions (if needed)
- Add lint and SAST outputs into CI artifacts for merge gates.
- Redeploy Amplify from the remediated branch and retain bundle-inspection evidence.
- Add explicit security review sign-off note per release.
