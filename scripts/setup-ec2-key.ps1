# Copy EC2 PEM into .ssh/ for this project (gitignored).
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

$sshDir = Join-Path $root '.ssh'
$keyName = 'RCE-practicetests-key.pem'
$dest = Join-Path $sshDir $keyName
$src = Join-Path (Join-Path $env:USERPROFILE 'Downloads') $keyName

if (-not (Test-Path $src)) {
  Write-Error "Key not found at $src. Download your .pem from AWS EC2 key pairs."
}

New-Item -ItemType Directory -Force -Path $sshDir | Out-Null
Copy-Item -Force $src $dest

# OpenSSH on Windows requires restricted ACL on private keys
icacls $dest /inheritance:r | Out-Null
icacls $dest /grant:r "${env:USERNAME}:(R)" | Out-Null

Write-Host "Key installed: $dest"
Write-Host 'Connect with: .\scripts\connect-ec2.ps1'
