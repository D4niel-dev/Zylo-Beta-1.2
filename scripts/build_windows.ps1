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
# Resolve icon path: prefer ICO, else convert PNG -> ICO
$iconDir = Join-Path $repoRoot 'frontend/images'
$iconArg = ''
if (Test-Path (Join-Path $iconDir 'Zylo_icon.ico')) {
  $iconArg = "--icon `"$((Join-Path $iconDir 'Zylo_icon.ico'))`""
} elseif (Test-Path (Join-Path $iconDir 'Zylo_icon.png')) {
  Write-Host 'Converting Zylo_icon.png to ICO...'
  $buildDir = Join-Path $repoRoot 'build'
  if (!(Test-Path $buildDir)) { New-Item -ItemType Directory -Path $buildDir | Out-Null }
  $outIco = Join-Path $buildDir 'Zylo_icon.ico'
  python -m pip install --disable-pip-version-check --quiet pillow | Out-Null
  $py = @"
from PIL import Image
from pathlib import Path
png = Path(r'''$iconDir\Zylo_icon.png''')
ico = Path(r'''$outIco''')
img = Image.open(png).convert('RGBA')
sizes = [(256,256),(128,128),(64,64),(48,48),(32,32),(16,16)]
img.save(ico, sizes=sizes)
print(f"Wrote {ico}")
"@
  python - <<PYEOF
$py
PYEOF
  $iconArg = "--icon `"$outIco`""
} else {
  Write-Warning 'No Zylo_icon.ico or Zylo_icon.png found. Using default icon.'
}

pyinstaller --noconfirm --onefile --name Zylo --clean --noconsole `
  --add-data "frontend;frontend" `
  --add-data "backend;backend" `
  --add-data "requirements.txt;." `
  --hidden-import "engineio.async_drivers.eventlet" `
  --hidden-import "eventlet" `
  $iconArg `
  $entry

# Copy static folders to dist for fallback serving if needed
Copy-Item -Recurse -Force frontend (Join-Path $dist 'frontend')
Copy-Item -Recurse -Force backend (Join-Path $dist 'backend')

Write-Host "Build complete. Find Zylo.exe under dist\\Zylo.exe"
