# NK6 Backup and Restore

## Objective
Define and prove recoverability for critical data.

## Current Status
- Procedure is documented in repo and live AWS evidence was gathered on `2026-03-17`.
- Point-in-Time Recovery (PITR) is enabled on `SecurityPassCredentials` and `SecurityPassUsers`.
- AWS Backup jobs completed for both DynamoDB tables after the default backup service role became ready.
- Restore drill completed successfully to `SecurityPassCredentials-restore-test-2026-03-17`.
- The restored table was opened in DynamoDB and restored rows were verified.

## Backup Scope
- DynamoDB tables:
  - `SecurityPassUsers`
  - `SecurityPassCredentials`
- Optional configuration exports:
  - API Gateway config
  - Lambda environment snapshots

## Live AWS Record
- Validation date: `2026-03-17`
- Backup service role reviewed: `AWSBackupDefaultServiceRole`
- PITR enabled:
  - `SecurityPassCredentials`
  - `SecurityPassUsers`
- Backup jobs completed:
  - `SecurityPassUsers`
  - `SecurityPassCredentials`
- Restore target created:
  - `SecurityPassCredentials-restore-test-2026-03-17`
- Restore validation:
  - restored table exists
  - restored rows were visible in DynamoDB

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
| 2026-03-17 | Latest completed AWS Backup recovery point for `SecurityPassCredentials` | `SecurityPassCredentials-restore-test-2026-03-17` | Pass | N/A | N/A | Console-guided restore drill completed successfully; row presence verified after restore |

## Evidence to Capture
- PITR enabled screenshots for both DynamoDB tables
- AWS Backup job screenshots showing completed jobs
- Restore job completion screenshot for `SecurityPassCredentials-restore-test-2026-03-17`
- DynamoDB validation screenshot showing restored rows in the recovery table
