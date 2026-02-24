param(
  [string]$RepoRoot = ".",
  [string]$OutDir = "artifacts/audit"
)

$ErrorActionPreference = "Stop"

$projects = @(
  "frontend",
  "nk/api",
  "nk/sdk"
)

$repoRootPath = (Resolve-Path $RepoRoot).Path
$absoluteOutDir = Join-Path $repoRootPath $OutDir
New-Item -ItemType Directory -Force -Path $absoluteOutDir | Out-Null

foreach ($project in $projects) {
  $projectPath = Join-Path $repoRootPath $project
  if (-not (Test-Path $projectPath)) {
    Write-Host "Skipping missing project: $projectPath"
    continue
  }

  Push-Location $projectPath
  try {
    $safeName = $project.Replace("/", "-")
    $outFile = Join-Path $absoluteOutDir "$safeName-audit.json"
    Write-Host "Collecting npm audit for $project -> $outFile"
    $auditOutput = (cmd /c "npm audit --json" 2>&1) | Out-String
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
      Write-Host "npm audit returned non-zero for $project (usually vulnerabilities found)."
    }

    if ([string]::IsNullOrWhiteSpace($auditOutput)) {
      $auditOutput = "{""error"":""npm audit did not generate output""}"
    }
    Set-Content -Path $outFile -Value $auditOutput -Encoding UTF8
  } catch {
    $errText = ($_ | Out-String).Replace('"', "'").Replace("`r", " ").Replace("`n", " ").Trim()
    Set-Content -Path $outFile -Value "{""error"":""audit command failed"",""detail"":""$errText""}" -Encoding UTF8
    Write-Host "npm audit failed for $project; wrote error payload."
  } finally {
    Pop-Location
  }
}

Write-Host "Audit collection complete. Output directory: $absoluteOutDir"
