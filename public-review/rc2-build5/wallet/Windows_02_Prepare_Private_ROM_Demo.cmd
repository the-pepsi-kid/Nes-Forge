@echo off
setlocal
cd /d "%~dp0"
echo NES Forge 3.x private Zelda II demo setup
if not exist "PREPARE_PRIVATE_Z2_DEMO.py" (
  echo Preparation script missing. Extract the COMPLETE review ZIP.
  pause
  exit /b 1
)
set "SETUP_MODE="
if /I "%~1"=="--repair-assets" set "SETUP_MODE=--repair-assets"
if not "%~1"=="" if not defined SETUP_MODE (
  echo Usage: 02_PREPARE_PRIVATE_ROM_WINDOWS.cmd [--repair-assets]
  exit /b 2
)
echo Start the RC2 host in another console first.
echo Use 03_OPEN_MULTIPLAYER_WINDOWS.cmd to resume an existing world.
echo If needed: py -m pip install -r requirements-dev.txt
 echo If needed: py -m playwright install chromium
set /p "SOURCE_ROM=Full private Zelda II US ROM path: "
set /p "HOST_ADMIN=Local host admin token: "
py PREPARE_PRIVATE_Z2_DEMO.py --rom "%SOURCE_ROM%" --admin-token "%HOST_ADMIN%" %SETUP_MODE%
if errorlevel 1 (
 echo Preparation failed or refused. Review error above. No ROM was uploaded.
 pause
 exit /b 1
)
echo Local game: http://127.0.0.1:8765/
echo Use TWO SEPARATE WALLET BROWSER PROFILES with different test wallets.
pause
