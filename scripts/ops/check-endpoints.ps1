param(
  [string]$VaultApiBase = "http://localhost:8080",
  [string]$AuthApiBase = "",
  [string]$Origin = "",
  [switch]$CheckAuthRoutes,
  [switch]$CheckVaultHealth,
  [switch]$SmokeVaultCrud,
  [string]$CrudUserId = "nk-smoke-user"
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
      Content = [string]$res.Content
    }
  } catch {
    if ($_.Exception.Response) {
      $content = ""
      try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $content = $reader.ReadToEnd()
      } catch {
        $content = ""
      }

      return [pscustomobject]@{
        Status = [int]$_.Exception.Response.StatusCode
        Headers = $_.Exception.Response.Headers
        Content = $content
      }
    }
    return [pscustomobject]@{
      Status = 0
      Headers = @{}
      Content = ""
    }
  }
}

function ConvertFrom-JsonSafe {
  param(
    [string]$Value,
    $Fallback = $null
  )

  if (-not $Value -or $Value.Trim().Length -eq 0) {
    return $Fallback
  }

  try {
    return $Value | ConvertFrom-Json
  } catch {
    return $Fallback
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

function New-SmokeCipherPayload {
  param(
    [Parameter(Mandatory = $true)][string]$UserId,
    [Parameter(Mandatory = $true)][string]$ItemId
  )

  $ctBytes = [System.Text.Encoding]::UTF8.GetBytes("nk-smoke-ct")
  $ivBytes = 0..11
  $tagBytes = 0..15

  return @{
    id = $ItemId
    ct = [Convert]::ToBase64String($ctBytes)
    iv = [Convert]::ToBase64String([byte[]]$ivBytes)
    tag = [Convert]::ToBase64String([byte[]]$tagBytes)
    meta = @{
      userId = $UserId
      site = "nk-smoke.example"
      login = "nk-smoke"
      label = "nk smoke"
      createdAt = [DateTime]::UtcNow.ToString("o")
    }
  } | ConvertTo-Json -Depth 5 -Compress
}

function Test-VaultCrud {
  param(
    [Parameter(Mandatory = $true)][string]$VaultBase,
    [Parameter(Mandatory = $true)][string]$UserId
  )

  $itemId = "nk-smoke-" + [Guid]::NewGuid().ToString("N").Substring(0, 8)
  $body = New-SmokeCipherPayload -UserId $UserId -ItemId $itemId

  $postProbe = Invoke-Probe -Method "POST" -Url "$VaultBase/vault/items" -Body $body
  $postPayload = ConvertFrom-JsonSafe -Value $postProbe.Content -Fallback @{}
  $postOk = (($postProbe.Status -eq 200) -or ($postProbe.Status -eq 201)) -and ($postPayload.id -eq $itemId)

  if ($postOk) {
    Write-Host "[PASS] Vault smoke POST -> $($postProbe.Status) created id $itemId"
  } else {
    Write-Host "[FAIL] Vault smoke POST -> $($postProbe.Status) response=$($postProbe.Content)"
    return $false
  }

  $listProbe = Invoke-Probe -Method "GET" -Url "$VaultBase/vault/items"
  $listPayload = ConvertFrom-JsonSafe -Value $listProbe.Content -Fallback @{}
  $items = @()
  if ($listPayload -is [System.Array]) {
    $items = $listPayload
  } elseif ($null -ne $listPayload.items) {
    $items = @($listPayload.items)
  }

  $found = $false
  foreach ($item in $items) {
    if ($item.id -eq $itemId) {
      $found = $true
      break
    }
  }

  if ($listProbe.Status -eq 200 -and $found) {
    Write-Host "[PASS] Vault smoke GET -> located id $itemId"
  } else {
    Write-Host "[FAIL] Vault smoke GET -> $($listProbe.Status) located=$found response=$($listProbe.Content)"
    return $false
  }

  $deleteProbe = Invoke-Probe -Method "DELETE" -Url "$VaultBase/vault/items/$itemId"
  $deleteOk = ($deleteProbe.Status -eq 200) -or ($deleteProbe.Status -eq 204)

  if ($deleteOk) {
    Write-Host "[PASS] Vault smoke DELETE -> $($deleteProbe.Status) removed id $itemId"
  } else {
    Write-Host "[FAIL] Vault smoke DELETE -> $($deleteProbe.Status) response=$($deleteProbe.Content)"
    return $false
  }

  $removed = $false
  for ($i = 0; $i -lt 3; $i++) {
    Start-Sleep -Milliseconds 500
    $verifyProbe = Invoke-Probe -Method "GET" -Url "$VaultBase/vault/items"
    $verifyPayload = ConvertFrom-JsonSafe -Value $verifyProbe.Content -Fallback @{}
    $verifyItems = @()
    if ($verifyPayload -is [System.Array]) {
      $verifyItems = $verifyPayload
    } elseif ($null -ne $verifyPayload.items) {
      $verifyItems = @($verifyPayload.items)
    }

    $match = $false
    foreach ($item in $verifyItems) {
      if ($item.id -eq $itemId) {
        $match = $true
        break
      }
    }

    if (-not $match) {
      $removed = $true
      break
    }
  }

  if ($removed) {
    Write-Host "[PASS] Vault smoke verify delete -> id $itemId no longer listed"
  } else {
    Write-Host "[FAIL] Vault smoke verify delete -> id $itemId still present after delete"
    return $false
  }

  return $true
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

if ($SmokeVaultCrud) {
  $ok = (Test-VaultCrud -VaultBase $vaultBase -UserId $CrudUserId) -and $ok
}

if (-not $ok) {
  Write-Host "One or more endpoint checks failed."
  exit 1
}

Write-Host "All required endpoint checks passed."
