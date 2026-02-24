# NK6 Backup and Restore

## Objective
Define and prove recoverability for critical data.

## Backup Scope
- DynamoDB tables:
  - users/auth data
  - vault ciphertext records
- Optional configuration exports:
  - API Gateway config
  - Lambda environment snapshots

## Strategy
- Enable Point-in-Time Recovery (PITR) for DynamoDB tables.
- Create scheduled on-demand backups for long-term retention.
- Encrypt backups at rest (AWS managed or CMK).
- Retention target: 35 days minimum for PITR + periodic archival.

## Restore Drill Procedure
1. Select a test timestamp or backup ARN.
2. Restore table to a temporary recovery table.
3. Verify row counts and sample records.
4. Run application read test against restored dataset.
5. Document RTO and RPO values.

## Drill Record Template
| Drill Date | Source Backup | Restore Target | Result | RTO | RPO | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | backup-id | table-name-restore | Pass/Fail | mm:ss | mm:ss | comments |

## Evidence to Capture
- PITR enabled screenshot
- Backup schedule screenshot
- Restore job completion screenshot
- Validation log snippet
