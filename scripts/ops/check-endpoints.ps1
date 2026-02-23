param(
  [string]$VaultApiBase = "http://localhost:8080",
  [string]$AuthApiBase = ""
)

$ErrorActionPreference = "Continue"

function Test-Endpoint {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Url
  )

  try {
    $res = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
    Write-Host "[PASS] $Name -> $($res.StatusCode) $Url"
    return $true
  } catch {
    $status = ""
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
    }
    Write-Host "[FAIL] $Name -> $status $Url"
    return $false
  }
}

$ok = $true
$ok = (Test-Endpoint -Name "Vault health" -Url "$VaultApiBase/healthz") -and $ok
$ok = (Test-Endpoint -Name "Vault list" -Url "$VaultApiBase/vault/items") -and $ok

if ($AuthApiBase -and $AuthApiBase.Trim().Length -gt 0) {
  Write-Host "Auth base provided: $AuthApiBase (route-specific checks should use known endpoints)."
}

if (-not $ok) {
  Write-Host "One or more endpoint checks failed."
  exit 1
}

Write-Host "All required endpoint checks passed."
