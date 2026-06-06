$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendPath = Join-Path $root "backend"
$frontendPath = Join-Path $root "frontend"
$backendLog = "C:\tmp\roa-backend.log"
$backendErr = "C:\tmp\roa-backend.err.log"
$frontendLog = "C:\tmp\roa-frontend.log"
$frontendErr = "C:\tmp\roa-frontend.err.log"

New-Item -ItemType Directory -Force -Path "C:\tmp" | Out-Null

function Test-PortInUse {
  param([int]$Port)
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

if (Test-PortInUse 3001) {
  Write-Host "Backend port 3001 is already in use."
} else {
  Start-Process -FilePath "npm.cmd" -ArgumentList "run", "start:dev" -WorkingDirectory $backendPath -RedirectStandardOutput $backendLog -RedirectStandardError $backendErr -WindowStyle Hidden
  Write-Host "Backend starting on http://localhost:3001"
}

if (Test-PortInUse 3000) {
  Write-Host "Frontend port 3000 is already in use."
} else {
  Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $frontendPath -RedirectStandardOutput $frontendLog -RedirectStandardError $frontendErr -WindowStyle Hidden
  Write-Host "Frontend starting on http://localhost:3000"
}

Write-Host "Logs:"
Write-Host "  Backend:  $backendLog"
Write-Host "  Frontend: $frontendLog"
