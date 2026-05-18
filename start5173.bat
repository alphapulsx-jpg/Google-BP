@echo off
cd /d "%~dp0"
echo Serving Google-BP at http://localhost:5173
echo   Deliverables: http://localhost:5173/deliverables/
echo   Triumph kit:  http://localhost:5173/deliverables/triumph-heating-kelowna/kit-report.html
npx --yes serve -l 5173
