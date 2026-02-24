# NK2 Secure Code Development Evidence

## Objective
Implement secure auth + vault logic with client-side cryptography and safe API contracts.

## Control-to-Code Mapping
| Control | Implementation Evidence |
| --- | --- |
| Argon2id-based key derivation | `frontend/src/crypto/crypto.ts` |
| AES-GCM encryption/decryption | `frontend/src/crypto/crypto.ts` |
| Key held in memory only | `frontend/src/crypto/CryptoProvider.tsx` |
| Ciphertext-only server payload | `nk/api/src/server.ts`, `nk/docs/openapi.yaml` |
| Frontend visual proof of encryption/decryption | `frontend/src/components/VaultPanel.tsx` |
| Auth and vault endpoint config centralized | `frontend/src/config/api.ts` |

## Secure Coding Practices Used
- Input validation on API payload shape with `zod`.
- No plaintext vault secret persisted on server.
- Explicit error handling for fetch + JSON parse failures.
- Separation of concerns: crypto helpers, provider abstraction, UI layer.

## Manual Validation Checklist
- Save item from client vault and confirm `ct/iv/tag` appear in UI visualizer.
- Confirm decrypt action occurs client-side and reveals plaintext only after decrypt.
- Confirm API list endpoint returns ciphertext items only.

## Remaining Actions (if needed)
- Add lint and SAST outputs into CI artifacts for merge gates.
- Add explicit security review sign-off note per release.
