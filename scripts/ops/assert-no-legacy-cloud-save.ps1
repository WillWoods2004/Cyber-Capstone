param(
  [string[]]$Paths = @("frontend/src", "nk/api")
)

$ErrorActionPreference = "Stop"

$patterns = @(
  "saveCredentialToCloud",
  "/credentials",
  "5y6lvgdx08.execute-api.us-east-1.amazonaws.com/prod"
)

$legacyHits = @()
$hasRipgrep = $null -ne (Get-Command rg -ErrorAction SilentlyContinue)
$excludeRegex = '\\(node_modules|dist|coverage|\.vite|build)\\'

foreach ($path in $Paths) {
  if (-not (Test-Path $path)) {
    continue
  }

  foreach ($pattern in $patterns) {
    if ($hasRipgrep) {
      $found = & rg -n --fixed-strings `
        --glob "!**/node_modules/**" `
        --glob "!**/dist/**" `
        --glob "!**/coverage/**" `
        --glob "!**/.vite/**" `
        --glob "!**/build/**" `
        $pattern $path 2>$null
      if ($LASTEXITCODE -eq 0 -and $found) {
        $legacyHits += $found
      }
    } else {
      $files = Get-ChildItem -Path $path -File -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch $excludeRegex }
      $found = $files | Select-String -Pattern $pattern -SimpleMatch -ErrorAction SilentlyContinue
      if ($found) {
        $legacyHits += ($found | ForEach-Object { "$($_.Path):$($_.LineNumber):$($_.Line.Trim())" })
      }
    }
  }
}

if ($legacyHits.Count -gt 0) {
  Write-Host "Legacy plaintext cloud-save references detected:"
  $legacyHits | Sort-Object -Unique | ForEach-Object { Write-Host $_ }
  exit 1
}

Write-Host "No legacy plaintext cloud-save references found."
