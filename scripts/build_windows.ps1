# Build Zylo.exe for Windows using PyInstaller (portable)
# Requires: Python, pip, and PyInstaller installed on Windows
# Usage: run from repo root on a Windows machine:
#   powershell -ExecutionPolicy Bypass -File scripts/build_windows.ps1

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $root '..')
cd $repoRoot

# Ensure deps
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip install pyinstaller

# Entry script launches Flask backend and opens browser
$entry = Join-Path $repoRoot 'scripts\main.py'

# Output dist path
$dist = Join-Path $repoRoot 'dist'
if (!(Test-Path $dist)) { New-Item -ItemType Directory -Path $dist | Out-Null }

# Create onefile exe.
pyinstaller --noconfirm --onefile --name Zylo --clean `
  --add-data "frontend;frontend" `
  --add-data "backend;backend" `
  --add-data "requirements.txt;." `
  --hidden-import "engineio.async_drivers.eventlet" `
  --hidden-import "eventlet" `
  $entry

# Copy static folders to dist for fallback serving if needed
Copy-Item -Recurse -Force frontend (Join-Path $dist 'frontend')
Copy-Item -Recurse -Force backend (Join-Path $dist 'backend')

Write-Host "Build complete. Find Zylo.exe under dist\\Zylo.exe"
