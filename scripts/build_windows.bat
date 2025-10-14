@echo off
setlocal enabledelayedexpansion

REM Build Zylo.exe for Windows using PyInstaller (portable)
REM Requires: Python, pip, and PyInstaller installed on Windows
REM Usage: run from repo root on Windows: scripts\build_windows.bat

set REPO=%~dp0..
cd /d %REPO%

python -m pip install --upgrade pip || goto :error
python -m pip install -r requirements.txt || goto :error
python -m pip install pyinstaller || goto :error

REM Resolve icon path: prefer ICO, else convert PNG -> ICO
set ICON_DIR=%REPO%\frontend\images
set ICON=
if exist "%ICON_DIR%\Zylo_icon.ico" (
  set ICON=%ICON_DIR%\Zylo_icon.ico
) else if exist "%ICON_DIR%\Zylo_icon.png" (
  echo Converting Zylo_icon.png to ICO...
  REM Create build directory for temporary artifacts
  if not exist "%REPO%\build" mkdir "%REPO%\build"
  set ICON="%REPO%\build\Zylo_icon.ico"
  REM Install Pillow if needed and convert PNG -> multi-size ICO
  python -m pip install --disable-pip-version-check --quiet pillow || goto :error
  python - <<PYEOF
from PIL import Image
from pathlib import Path
png = Path(r"%ICON_DIR%\Zylo_icon.png")
ico = Path(r"%REPO%\build\Zylo_icon.ico")
img = Image.open(png).convert("RGBA")
sizes = [(256,256),(128,128),(64,64),(48,48),(32,32),(16,16)]
img.save(ico, sizes=sizes)
print(f"Wrote {ico}")
PYEOF
) else (
  echo Warning: No Zylo_icon.ico or Zylo_icon.png found. Using default icon.
)

set ENTRY=%REPO%\scripts\main.py

pyinstaller --noconfirm --onefile --name Zylo --clean --noconsole ^
  --add-data "frontend;frontend" ^
  --add-data "backend;backend" ^
  --add-data "requirements.txt;." ^
  --hidden-import "engineio.async_drivers.eventlet" ^
  --hidden-import "eventlet" ^
  %ICON% ^
  "%ENTRY%" || goto :error

if not exist dist mkdir dist
xcopy /e /i /y frontend dist\frontend >nul
xcopy /e /i /y backend dist\backend >nul

echo Build complete. Find Zylo.exe under dist\Zylo.exe
exit /b 0

:error
echo Build failed. Ensure Python and PyInstaller are installed and available.
exit /b 1
