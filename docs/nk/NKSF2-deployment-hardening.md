# NKSF2 Deployment Hardening

This document captures the repo-side implementation for `NKSF2`:

> Server deployment (containerized backend, TLS 1.3, firewall hardening, CIS benchmarks)

## What this branch adds

- Multi-stage Docker build for `nk/api`
- Non-root runtime user (`10001`)
- Read-only container filesystem
- Health check endpoint + Docker health check
- `helmet` security headers and restricted CORS configuration
- ECS Fargate Terraform stack with:
  - ECR image repository
  - ECS cluster / service / task definition
  - ALB with TLS 1.3-capable policy
  - security groups that only expose ALB ingress and ALB -> task traffic
  - CloudWatch log retention
  - Secrets Manager injection for the HMAC token secret
- GitHub Actions workflow that:
  - builds the API
  - builds the hardened image
  - validates Terraform
  - bootstraps ECR
  - pushes the image
  - applies Terraform for deployment

## Repo paths

- `nk/api/Dockerfile`
- `deploy/nksf2/docker-compose.yml`
- `infra/terraform/nksf2/*`
- `.github/workflows/nksf2-container-deploy.yml`
- `scripts/ops/check-nksf2-assets.ps1`

## Why this closes NKSF2 at the repo level

- **Containerized backend**: `nk/api` now has a production image build
- **TLS 1.3**: ALB listener policy is pinned to `ELBSecurityPolicy-TLS13-1-2-2021-06`
- **Firewall hardening**: security groups restrict public traffic to ALB only and task ingress to ALB only
- **Hardened runtime**: non-root container, read-only root filesystem, health check, reduced Linux capabilities, secrets out of source code
- **Automated deployment**: GitHub Actions builds/pushes the image and applies Terraform

## Remaining non-repo step

To make NKSF2 fully live in AWS, the deployment workflow still needs AWS repository secrets/vars and one successful deployment run from GitHub Actions.
