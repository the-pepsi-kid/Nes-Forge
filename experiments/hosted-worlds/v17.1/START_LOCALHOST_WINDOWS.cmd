@echo off
setlocal
cd /d "%~dp0"
echo NES Forge 3.x Localhost Hosted World — v0.17 Source-Derived Link Stabs / Experimental (protocol 13)
where py >nul 2>&1
if errorlevel 1 (
  echo Python launcher 'py' not found. Install Python 3.11+ and enable the launcher.
  echo After install: py -m pip install aiohttp pycryptodome
  pause
  exit /b 1
)
py host\diagnose.py
if errorlevel 1 (
  echo Resolve the FAILED prerequisites above. Typical install: py -m pip install aiohttp pycryptodome
  pause
  exit /b 1
)
py host\server.py
pause
