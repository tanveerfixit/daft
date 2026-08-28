@echo off
title EPOS Localhost Server
echo ===================================================
echo        Starting EPOS Local Dev Server...
echo ===================================================
echo.
echo Opening browser at http://localhost:3000...
start http://localhost:3000
echo.
npm run dev
pause
