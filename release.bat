@echo off
rem Make the player release zip, build\release\c1x-<version>.zip (see doc/releasing.md):
rem build everything with rebuild.bat, then zip the release with the level editor's
rem release script (npm run release).
rem
rem   release.bat 0.1.0    make the 0.1.0 release
rem   release.bat          ask for the version
rem
rem Needs MSYS2 (as rebuild.bat does) and Node.js.

setlocal
set "VERSION=%~1"
if "%VERSION%"=="" set /p "VERSION=Version (like 0.1.0): "
if "%VERSION%"=="" (
  echo No version given. Use: release.bat 0.1.0
  set "RESULT=1"
  goto done
)

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
  echo Release made: build\release\c1x-%VERSION%.zip
) else (
  echo The release failed with exit code %RESULT%.
)

:done
rem keep the window open when started by double-clicking
echo %cmdcmdline% | find /i "%~0" >nul && pause
exit /b %RESULT%
