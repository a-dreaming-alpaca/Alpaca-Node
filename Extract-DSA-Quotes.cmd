@echo off
setlocal
set "DSA_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%DSA_PYTHON%" (
  "%DSA_PYTHON%" "%~dp0tools\extract_dsa_quotes.py" %*
) else (
  python "%~dp0tools\extract_dsa_quotes.py" %*
)
if errorlevel 1 (
  echo Extraction failed. See the error above.
) else (
  echo Results saved in output\dsa-quotes.
)
pause
