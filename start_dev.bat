@echo off
setlocal

REM Switch to UTF-8 just in case, but plain English is safest
chcp 65001 >nul

set "PYTHON_CMD="
where python >nul 2>nul && set "PYTHON_CMD=python"
if not defined PYTHON_CMD (
  where python3 >nul 2>nul && set "PYTHON_CMD=python3"
)
if not defined PYTHON_CMD (
  where py >nul 2>nul && set "PYTHON_CMD=py"
)

if not defined PYTHON_CMD (
  echo [ERROR] Python not found. Install Python and ensure it is on PATH.
  pause
  exit /b 1
)

echo [INFO] Regenerating Map Data...
%PYTHON_CMD% init_map_data.py
if errorlevel 1 (
  echo.
  echo [ERROR] Data regeneration failed. See errors above.
  pause
  exit /b %errorlevel%
)

echo [SUCCESS] Data Ready. Opening Browser...
start "" "http://localhost:8000"

echo [INFO] Starting Server on Port 8000...
%PYTHON_CMD% -m http.server 8000

endlocal
