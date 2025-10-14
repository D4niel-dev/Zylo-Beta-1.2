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

set ENTRY=%REPO%\scripts\main.py

pyinstaller --noconfirm --onefile --name Zylo --clean ^
  --add-data "frontend;frontend" ^
  --add-data "backend;backend" ^
  --add-data "requirements.txt;." ^
  --hidden-import "engineio.async_drivers.eventlet" ^
  --hidden-import "eventlet" ^
  "%ENTRY%" || goto :error

if not exist dist mkdir dist
xcopy /e /i /y frontend dist\frontend >nul
xcopy /e /i /y backend dist\backend >nul

echo Build complete. Find Zylo.exe under dist\Zylo.exe
exit /b 0

:error
echo Build failed. Ensure Python and PyInstaller are installed and available.
exit /b 1
