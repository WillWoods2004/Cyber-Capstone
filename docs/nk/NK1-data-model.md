# NK1 Data Model

## Scope
Secure schema for auth, MFA state, and ciphertext vault storage.

## Entity Model
```mermaid
erDiagram
  USER ||--o| MFA_STATE : has
  USER ||--o{ VAULT_ITEM : owns
  USER ||--o{ AUDIT_EVENT : generates

  USER {
    string user_id PK
    string username UNIQUE
    string password_hash
    string hash_algo
    string created_at
    string updated_at
  }

  MFA_STATE {
    string user_id PK_FK
    string secret_ref
    boolean mfa_enabled
    string enrolled_at
    string last_verified_at
  }

  VAULT_ITEM {
    string item_id PK
    string user_id FK
    string ct
    string iv
    string tag
    json meta
    string created_at
    string updated_at
  }

  AUDIT_EVENT {
    string event_id PK
    string user_id FK
    string event_type
    string event_time
    json detail
  }
```

## Security Constraints
- `USER.password_hash` must be salted hash output only, never plaintext.
- `VAULT_ITEM` persists only ciphertext tuple: `ct`, `iv`, `tag`, plus non-secret `meta`.
- Master vault key must remain client-side memory and must not be persisted server-side.
- MFA secrets should be encrypted at rest and referenced by `secret_ref` (or KMS-backed storage).

## Data Validation Rules
- Username is unique and normalized.
- `ct`, `iv`, and `tag` are required and non-empty.
- `iv` should be 12 bytes before base64 encoding for AES-GCM.
- `tag` should be 16 bytes before base64 encoding for AES-GCM.

## Evidence Pointers in Code
- Cipher payload contract: `nk/api/src/server.ts`
- OpenAPI for required fields: `nk/docs/openapi.yaml`
- Client encryption/decryption flow: `frontend/src/crypto/crypto.ts`
