@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_FORGE_AGENTS.ps1"
if errorlevel 1 (
  echo.
  echo Forge Agent Lab encountered an error. Review the output above.
  pause
)
