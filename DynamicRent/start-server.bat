@echo off
REM Double-click this file to serve DynamicRent locally on Windows.
REM This avoids the browser's CORS block on fetch() over file:// URLs.
cd /d "%~dp0"
echo Starting DynamicRent at http://localhost:8000 ...
echo Press Ctrl+C to stop, then close this window.
python -m http.server 8000
if errorlevel 1 (
  py -m http.server 8000
)
pause
