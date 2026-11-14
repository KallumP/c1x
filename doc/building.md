# Building

As of currently, compilation has only been tested on Ubuntu/Debian and on Windows (MSYS2 MinGW32). However, the game should build on any system with a working 32-bit GNU toolchain and other dependencies listed below.

Note that only 32-bit target executables are currently supported. If you are not already running a 32-bit OS, you will need multilib versions of gcc and g++ and 32-bit versions of the dependencies.

To compile c1x, install the dependencies listed below, `cd` into the main project directory, and run `make`. This builds the game, the [launcher](launcher.md), a window for starting the game, to `c1x_launcher.exe` in the project directory (`c1x_launcher` on Linux; `make launcher` builds just the launcher), and `build/build-level.exe` (`build/build-level` on Linux), which the launcher builds custom levels with (`make builder` builds just that).

## Building levels without Node

`build-level.exe` is the level editor's level build (`tools/level_editor/builder/`) bundled into one file with Node.js built in (a [single executable application](https://nodejs.org/api/single-executable-applications.html)), so players can build [custom levels](custom_levels.md) from the launcher without installing Node or the editor. Making it needs [Node.js](https://nodejs.org/) 18 or later: `make` runs `npm install` in `tools/level_editor/` if it's never been run, then `npm run builder-exe`. It's about 85 MB. Without Node, `make` says it's skipping it and builds the rest; the launcher then says levels can't be built. Players running a build made elsewhere need nothing else installed.

## Dependencies

### pc
- gcc / binutils / glibc
- GNU make
- OpenGL 2.0 or higher
- SDL 2
- FluidSynth
- Dear ImGui / cimgui (embedded in project)
- g++ / libstdc++ (for ImGui compilation)

Ubuntu/Debian:

- 64-bit: `sudo apt install build-essential gcc-multilib g++-multilib libstdc++6:i386 libgl1-mesa-dev:i386 libsdl2-dev:i386 libfluidsynth-dev:i386`
- 32-bit: `sudo apt install build-essential libstdc++6 libgl1-mesa-dev libsdl2-dev libfluidsynth-dev`

Fedora (64-bit): `sudo dnf install make gcc gcc-c++ glibc-devel.i686 libstdc++-devel.i686 mesa-libGL-devel.i686 sdl2-compat-devel.i686 fluidsynth-devel.i686`

On Linux, `make` builds the game to `build/c1` and the launcher to `c1x_launcher`. Run `./c1x_launcher` and click **Play** (see [Launcher](launcher.md)).

Windows (MSYS2):

1. Install [MSYS2](https://www.msys2.org/) (e.g. `winget install MSYS2.MSYS2`).
2. From an MSYS2 shell: `pacman -S --needed make mingw-w64-i686-gcc mingw-w64-i686-SDL2 mingw-w64-i686-fluidsynth`
3. Open the **MSYS2 MINGW32** shell, `cd` into the project directory and run `make`. This builds the game into `build/`, copying the DLLs it needs next to it (see below), and the launcher to `c1x_launcher.exe` in the project directory, which needs no DLLs. Alternatively, run `rebuild.bat` from the project directory (`rebuild.bat clean` for a full rebuild, `rebuild.bat test` for the tests), which runs `make` in the MINGW32 environment for you.
4. Open `c1x_launcher.exe` and click **Play** (see [Launcher](launcher.md)).

The launcher links SDL2 and the GCC runtime statically, so `c1x_launcher.exe` runs on its own. The game links dynamically against SDL2, FluidSynth (and its audio codec dependencies) and the GCC runtime. Windows only looks for DLLs next to the executable or on `PATH`, so outside the MINGW32 shell the game fails to start with an error such as *"libfluidsynth-3.dll was not found"*. To avoid this, the Windows build has an extra `dlls` step that runs after linking. It recursively follows the game's imports and copies each one found in the MinGW32 `bin` directory (currently 17 DLLs) into `build/`. To re-copy them on their own, run `make dlls`. The `build` directory is ignored by git, and `make clean` removes it. To run the game on another machine, copy `c1x_launcher.exe` and the `build` directory with the `streams` directory beside them, and your `controls.cfg` and `settings.cfg` (if you have them) next to `streams`. To build custom levels there, put `level_src` next to `streams` too.

### psx
As of 30 October 2026, c1x no longer supports building for the PS1, and the `PSX` flag and PS1-specific code have been removed (the last version with them is tagged `psx-last`). See [PS1 build](psx-build.md) for why.

## Tests

Run `make test` to build and run the unit tests in `tests/`. They use the [utest.h](https://github.com/sheredom/utest.h) single-header framework (vendored in `tests/`), build to `build/tests` (`build/tests.exe` on Windows) and only need SDL 2. Tests are plain C files in `tests/`; each `UTEST(group, name)` registers itself, so adding a file there is enough for `make test` to pick it up.

The [level editor](custom_levels.md#2-place-objects-in-the-level-editor) in `tools/level_editor/`, with the level build (`builder/`) beside it, has its own tests: `npm test` there (after `npm install`), and `npm run typecheck` for its types. The tests that build a level from Jungle Rollers, which custom levels are built from, are skipped without it in `streams/`.
