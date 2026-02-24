param(
  [string]$VaultApiBase = "http://localhost:8080",
  [string]$AuthApiBase = "",
  [string]$Origin = "",
  [switch]$CheckAuthRoutes,
  [switch]$CheckVaultHealth
)

$ErrorActionPreference = "Continue"

function Normalize-Base {
  param([string]$Value)
  return $Value.Trim().TrimEnd("/")
}

function Get-HeaderValue {
  param(
    [Parameter(Mandatory = $true)]$Headers,
    [Parameter(Mandatory = $true)][string]$Name
  )

  foreach ($key in $Headers.Keys) {
    if ($key -ieq $Name) {
      return [string]$Headers[$key]
    }
  }
  return ""
}

function Invoke-Probe {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [string]$Body = "",
    [hashtable]$Headers = @{},
    [int]$TimeoutSec = 12
  )

  try {
    if ($Body -and $Body.Length -gt 0) {
      $res = Invoke-WebRequest -Uri $Url -Method $Method -UseBasicParsing -TimeoutSec $TimeoutSec -Headers $Headers -ContentType "application/json" -Body $Body
    } else {
      $res = Invoke-WebRequest -Uri $Url -Method $Method -UseBasicParsing -TimeoutSec $TimeoutSec -Headers $Headers
    }
    return [pscustomobject]@{
      Status = [int]$res.StatusCode
      Headers = $res.Headers
    }
  } catch {
    if ($_.Exception.Response) {
      return [pscustomobject]@{
        Status = [int]$_.Exception.Response.StatusCode
        Headers = $_.Exception.Response.Headers
      }
    }
    return [pscustomobject]@{
      Status = 0
      Headers = @{}
    }
  }
}

function Test-ExactStatus {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][int[]]$ExpectedStatuses,
    [string]$Body = ""
  )

  $probe = Invoke-Probe -Method $Method -Url $Url -Body $Body
  $ok = $ExpectedStatuses -contains $probe.Status

  if ($ok) {
    Write-Host "[PASS] $Name -> $($probe.Status) $Method $Url"
  } else {
    Write-Host "[FAIL] $Name -> $($probe.Status) $Method $Url (expected: $($ExpectedStatuses -join ', '))"
  }

  return $ok
}

function Test-RouteExists {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [string]$Body = "{}"
  )

  $probe = Invoke-Probe -Method $Method -Url $Url -Body $Body
  $ok = ($probe.Status -ne 0 -and $probe.Status -ne 404 -and $probe.Status -ne 405)

  if ($ok) {
    Write-Host "[PASS] $Name -> route reachable ($($probe.Status)) $Method $Url"
  } else {
    Write-Host "[FAIL] $Name -> route missing/unreachable ($($probe.Status)) $Method $Url"
  }

  return $ok
}

function Test-CorsPreflight {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$RequestedMethod,
    [Parameter(Mandatory = $true)][string]$TargetOrigin
  )

  $probe = Invoke-Probe -Method "OPTIONS" -Url $Url -Headers @{
    Origin = $TargetOrigin
    "Access-Control-Request-Method" = $RequestedMethod
    "Access-Control-Request-Headers" = "content-type"
  }

  $allowOrigin = Get-HeaderValue -Headers $probe.Headers -Name "Access-Control-Allow-Origin"
  $allowMethods = Get-HeaderValue -Headers $probe.Headers -Name "Access-Control-Allow-Methods"
  $allowHeaders = Get-HeaderValue -Headers $probe.Headers -Name "Access-Control-Allow-Headers"

  $originAllowed = ($allowOrigin -eq "*" -or $allowOrigin -eq $TargetOrigin)
  $methodEscaped = [regex]::Escape($RequestedMethod.ToUpperInvariant())
  $methodAllowed = ($allowMethods -eq "*" -or $allowMethods -match "(?i)(^|\s*,\s*)$methodEscaped(\s*,\s*|$)")

  $ok = ($probe.Status -ge 200 -and $probe.Status -lt 300 -and $originAllowed -and $methodAllowed)

  if ($ok) {
    Write-Host "[PASS] $Name CORS -> $($probe.Status) ACAO=$allowOrigin ACAM=$allowMethods ACAH=$allowHeaders"
  } else {
    Write-Host "[FAIL] $Name CORS -> $($probe.Status) ACAO=$allowOrigin ACAM=$allowMethods ACAH=$allowHeaders"
  }

  return $ok
}

$vaultBase = Normalize-Base $VaultApiBase
$authBase = Normalize-Base $AuthApiBase

$ok = $true
$vaultHealthEnabled = $CheckVaultHealth.IsPresent
if ($vaultHealthEnabled) {
  $ok = (Test-ExactStatus -Name "Vault health" -Method "GET" -Url "$vaultBase/healthz" -ExpectedStatuses @(200)) -and $ok
}
$ok = (Test-ExactStatus -Name "Vault list" -Method "GET" -Url "$vaultBase/vault/items" -ExpectedStatuses @(200)) -and $ok

if ($CheckAuthRoutes -and $authBase) {
  $ok = (Test-RouteExists -Name "Auth register route" -Method "POST" -Url "$authBase/register" -Body "{}") -and $ok
  $ok = (Test-RouteExists -Name "Auth login route" -Method "POST" -Url "$authBase/login" -Body "{}") -and $ok
  $ok = (Test-RouteExists -Name "MFA setup route" -Method "POST" -Url "$authBase/mfa/setup" -Body "{}") -and $ok
  $ok = (Test-RouteExists -Name "MFA verify route" -Method "POST" -Url "$authBase/mfa/verify" -Body "{}") -and $ok
} elseif ($authBase) {
  Write-Host "Auth base provided. Use -CheckAuthRoutes to validate auth route reachability."
}

if ($Origin -and $Origin.Trim().Length -gt 0) {
  $ok = (Test-CorsPreflight -Name "Vault list" -Url "$vaultBase/vault/items" -RequestedMethod "GET" -TargetOrigin $Origin) -and $ok
  $ok = (Test-CorsPreflight -Name "Vault store" -Url "$vaultBase/vault/items" -RequestedMethod "POST" -TargetOrigin $Origin) -and $ok

  if ($authBase) {
    $ok = (Test-CorsPreflight -Name "Auth login" -Url "$authBase/login" -RequestedMethod "POST" -TargetOrigin $Origin) -and $ok
    $ok = (Test-CorsPreflight -Name "Auth register" -Url "$authBase/register" -RequestedMethod "POST" -TargetOrigin $Origin) -and $ok
    $ok = (Test-CorsPreflight -Name "MFA setup" -Url "$authBase/mfa/setup" -RequestedMethod "POST" -TargetOrigin $Origin) -and $ok
    $ok = (Test-CorsPreflight -Name "MFA verify" -Url "$authBase/mfa/verify" -RequestedMethod "POST" -TargetOrigin $Origin) -and $ok
  }
}

if (-not $ok) {
  Write-Host "One or more endpoint checks failed."
  exit 1
}

Write-Host "All required endpoint checks passed."
