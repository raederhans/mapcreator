@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "MAPCREATOR_OPEN_PATH=/backend/"
set "MAPCREATOR_DEV_CACHE_MODE=nostore"
call run_server.bat %*
exit /b %ERRORLEVEL%
