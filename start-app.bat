@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\vite\bin\vite.js" (
  echo App dependencies are missing. Open a terminal here and run: npm install
  pause
  exit /b 1
)
set "CODEX_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%CODEX_NODE%" (
  start "ARISE Dev Server" /D "%~dp0" "%CODEX_NODE%" "%~dp0node_modules\vite\bin\vite.js" --host 127.0.0.1
) else (
  start "ARISE Dev Server" /D "%~dp0" "%~dp0node_modules\.bin\vite.cmd" --host 127.0.0.1
)
timeout /t 2 /nobreak >nul
start "ARISE: THE SYSTEM" http://localhost:5173/
