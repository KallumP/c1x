@echo off
rem Make the player release zip, release\c1x-<version>.zip beside this script (see doc/releasing.md):
rem build everything with rebuild.bat (the launcher is built as that version),
rem then zip the release with the level editor's release script (npm run release).
rem
rem   release.bat 1.3      make the 1.3 release
rem   release.bat          ask for the version, suggesting the next one
rem
rem Needs MSYS2 (as rebuild.bat does) and Node.js.

setlocal
set "VERSION=%~1"
if "%VERSION%"=="" call :ask_version_suggesting_next
if "%VERSION%"=="" (
  echo No version given. Use: release.bat 1.3
  set "RESULT=1"
  goto done
)

rem two numbers with a dot between, checked before anything is built
echo %VERSION%| findstr /r /x /c:"[0-9][0-9]*\.[0-9][0-9]*" >nul
if errorlevel 1 (
  echo The version has to be two numbers, like 1.3, not "%VERSION%".
  set "RESULT=1"
  goto done
)

rem rebuild.bat's make reads C1X_VERSION from the environment and compiles it
rem into the launcher (see the Makefile), which is how a released launcher
rem knows its version and can tell when a newer release is out
set "C1X_VERSION=%VERSION%"
call "%~dp0rebuild.bat"
if errorlevel 1 (
  echo The build failed, so there's no release.
  set "RESULT=1"
  goto done
)

pushd "%~dp0tools\level_editor"
call npm run release -- %VERSION%
set "RESULT=%ERRORLEVEL%"
popd

echo.
if "%RESULT%"=="0" (
  echo Release made: release\c1x-%VERSION%.zip
) else (
  echo The release failed with exit code %RESULT%.
)

:done
rem keep the window open when started by double-clicking
echo %cmdcmdline% | find /i "%~0" >nul && pause
exit /b %RESULT%

rem without npm there's no suggestion, so it asks as before
:ask_version_suggesting_next
set "NEXT="
for /f "delims=" %%v in ('npm --prefix "%~dp0tools\level_editor" run -s next-version 2^>nul') do set "NEXT=%%v"
if "%NEXT%"=="" (
  set /p "VERSION=Version (like 1.3): "
  exit /b
)
set "VERSION=%NEXT%"
set /p "VERSION=Version (enter nothing for %NEXT%): "
exit /b
