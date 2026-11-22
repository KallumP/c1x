@echo off
rem Rebuild c1 on Windows using MSYS2 MinGW32 (see doc/building.md, "Windows (MSYS2)").
rem
rem   rebuild.bat          build whatever changed
rem   rebuild.bat clean    remove all build output first, then build everything
rem   rebuild.bat test     build and run the unit tests
rem
rem MSYS2 is expected in C:\msys64; set MSYS2_ROOT to use another location.

setlocal
if not defined MSYS2_ROOT set "MSYS2_ROOT=C:\msys64"
set "BASH=%MSYS2_ROOT%\usr\bin\bash.exe"

if not exist "%BASH%" (
  echo MSYS2 was not found at %MSYS2_ROOT%. Install it, or set MSYS2_ROOT.
  set "RESULT=1"
  goto done
)

set "TARGET="
if /i "%~1"=="clean" set "TARGET=clean"
if /i "%~1"=="test" set "TARGET=test"
if not "%~1"=="" if not defined TARGET (
  echo Unknown option "%~1". Use: rebuild.bat [clean^|test]
  set "RESULT=1"
  goto done
)

rem a running launcher, game or tools would stop make replacing their exes,
rem so they're closed first (the tests replace none of them)
if not "%TARGET%"=="test" (
  call :close_running c1x_launcher.exe
  call :close_running c1x.exe
  call :close_running c1x_tools.exe
)

rem run make in a MINGW32 login shell, from this script's directory. it keeps
rem the Windows PATH after its own, so make finds Node.js for c1x_tools.exe and
rem the level editor's page
set "MSYSTEM=MINGW32"
set "CHERE_INVOKING=1"
set "MSYS2_PATH_TYPE=inherit"
pushd "%~dp0"
if "%TARGET%"=="clean" (
  "%BASH%" -lc "export OS=Windows_NT; make clean; make"
) else (
  "%BASH%" -lc "export OS=Windows_NT; make %TARGET%"
)
set "RESULT=%ERRORLEVEL%"
popd

echo.
if "%RESULT%"=="0" (
  if "%TARGET%"=="test" (echo Tests passed.) else (echo Build succeeded: c1x_launcher.exe and build\c1x.exe)
) else (
  echo Failed with exit code %RESULT%.
)

:done
rem keep the window open when started by double-clicking
echo %cmdcmdline% | find /i "%~0" >nul && pause
exit /b %RESULT%

rem closes the program %1 if it's running, and says so
:close_running
tasklist /fi "imagename eq %1" | find /i "%1" >nul || exit /b
echo Closing %1, which was running.
taskkill /f /im %1 >nul
exit /b
