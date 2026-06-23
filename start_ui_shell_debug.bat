@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "MAPCREATOR_OPEN_PATH=/app/?ui_shell=1&startup_interaction=full&startup_worker=0&startup_cache=0"
set "MAPCREATOR_DEV_CACHE_MODE=nostore"
call run_server.bat %*
exit /b %ERRORLEVEL%
