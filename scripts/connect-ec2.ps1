# SSH to PrepIndia EC2 using the project PEM key.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$key = Join-Path $root '.ssh\RCE-practicetests-key.pem'
$hostIp = if ($env:EC2_HOST) { $env:EC2_HOST } else { '13.200.219.228' }
$user = if ($env:EC2_USER) { $env:EC2_USER } else { 'ec2-user' }

if (-not (Test-Path $key)) {
  Write-Host "PEM not in .ssh yet. Running setup-ec2-key.ps1 ..."
  & (Join-Path $PSScriptRoot 'setup-ec2-key.ps1')
}

if (-not (Test-Path $key)) {
  Write-Error "Missing $key"
}

Write-Host "Connecting to ${user}@${hostIp} ..."
ssh -i $key -o StrictHostKeyChecking=accept-new "${user}@${hostIp}"
