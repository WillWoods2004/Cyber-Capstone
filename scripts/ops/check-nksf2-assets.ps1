$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

$requiredFiles = @(
  "nk/api/Dockerfile",
  "nk/api/.dockerignore",
  "deploy/nksf2/docker-compose.yml",
  "deploy/nksf2/.env.example",
  "infra/terraform/nksf2/versions.tf",
  "infra/terraform/nksf2/variables.tf",
  "infra/terraform/nksf2/main.tf",
  "infra/terraform/nksf2/outputs.tf",
  ".github/workflows/nksf2-container-deploy.yml"
)

foreach ($relativePath in $requiredFiles) {
  $fullPath = Join-Path $repoRoot $relativePath
  if (-not (Test-Path $fullPath)) {
    throw "Missing required NKSF2 asset: $relativePath"
  }
}

$dockerfile = Get-Content (Join-Path $repoRoot "nk/api/Dockerfile") -Raw
$terraformMain = Get-Content (Join-Path $repoRoot "infra/terraform/nksf2/main.tf") -Raw
$workflow = Get-Content (Join-Path $repoRoot ".github/workflows/nksf2-container-deploy.yml") -Raw

if ($dockerfile -notmatch "USER 10001:10001") {
  throw "Dockerfile must run as a non-root user."
}

if ($dockerfile -notmatch "HEALTHCHECK") {
  throw "Dockerfile must define a healthcheck."
}

if ($terraformMain -notmatch "ELBSecurityPolicy-TLS13-1-2-2021-06") {
  throw "Terraform must configure a TLS 1.3-capable ALB policy."
}

if ($terraformMain -notmatch "readonlyRootFilesystem") {
  throw "Terraform task definition must enforce a read-only root filesystem."
}

if ($workflow -notmatch "docker/build-push-action") {
  throw "Workflow must build the NKSF2 container image."
}

if ($workflow -notmatch "terraform apply") {
  throw "Workflow must include a deployment apply step."
}

Write-Host "NKSF2 asset checks passed."
