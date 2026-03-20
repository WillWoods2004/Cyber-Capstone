# NKSF2 Terraform (ECS/Fargate + ALB)

This Terraform stack provisions the proposal-aligned NKSF2 deployment path:

- Dockerized API container in **ECS Fargate**
- Public **Application Load Balancer**
- HTTPS listener with **TLS 1.3 policy** (`ELBSecurityPolicy-TLS13-1-2-2021-06`)
- Security groups that only expose `80/443` on the ALB and only allow the ALB to reach the container on `8080`
- CloudWatch log retention (`90` days)
- ECR repository with image scanning on push
- Secrets Manager secret injection for the API token secret
- Read-only filesystem / non-root container settings in the ECS task definition

## Files

- `versions.tf`: provider versions and remote-state backend type
- `variables.tf`: required deployment inputs
- `main.tf`: network, ALB, ECS, ECR, IAM, logging, and secret resources
- `outputs.tf`: ALB DNS, ECS names, repository URL, and secret ARN
- `terraform.tfvars.example`: starter input file

## Expected deployment flow

1. Create an S3 bucket + DynamoDB table for Terraform state.
2. Copy `terraform.tfvars.example` to `terraform.tfvars` and fill in:
   - VPC/subnets
   - ACM certificate ARN
   - approved ingress CIDRs
   - allowed browser origins
3. Push the API image to ECR.
4. `terraform apply` this directory with the current `image_tag`.
5. Point DNS to the ALB if you want a custom domain.

## Why this satisfies NKSF2

- **Containerized backend**: the API runs as a Docker image in ECS Fargate
- **TLS 1.3**: ALB listener policy enforces a TLS 1.3-capable AWS policy
- **Firewall hardening**: security groups restrict ingress and only allow ALB -> task traffic
- **CIS-style hardening direction**: non-root user, read-only filesystem, no-new-privileges/no extra Linux capabilities, secrets in Secrets Manager, log retention, image scanning
