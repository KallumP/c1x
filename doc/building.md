# Building

Compilation has only been tested on Fedora Linux and on Windows (MSYS2 MinGW32). However, the game should build on any system with a working 32-bit GNU toolchain and the other dependencies listed below.

Note that only 32-bit target executables are currently supported. If you are not already running a 32-bit OS, you will need multilib versions of gcc and g++ and 32-bit versions of the dependencies.

To compile c1x, install the dependencies listed below, then run `rebuild.bat` on Windows or `./rebuild.sh` on Linux, from the main project directory. The rebuild script runs `make` for you (see [Dependencies](#dependencies) for what else each one does). This builds:

- the game, in `build/`
- the [launcher](launcher.md), a window for starting the game and adjusting all the settings: `c1x_launcher.exe` in the project directory (`c1x_launcher` on Linux)
- the tools the launcher builds custom levels and runs the level editor with: `build/c1x_tools.exe` (`build/c1x_tools` on Linux), with the level editor's page in `build/editor/`

`make launcher` builds just the launcher, and `make tools` just the tools.

## The level build and editor without Node

`c1x_tools.exe` is c1x's tools bundled into one file with Node.js built in (a [single executable application](https://nodejs.org/api/single-executable-applications.html)): the level build (`tools/level_editor/builder/`), the level editor's server (`server/`) and the check for a newer release (`scripts/updateCheck.ts`).

So players with the final build can make [custom levels](custom_levels.md) and use the level editor from the launcher without installing anything extra.

Its commands:

- `c1x_tools build-level <name>` builds a level.
- `c1x_tools editor` serves the editor's page, built by Vite into `build/editor/`, and says where it's running.
- `c1x_tools check-update <version>` says if GitHub has a release newer than that version, which the launcher asks when it opens (see [Releasing](releasing.md#the-launchers-version)).

Making the tools needs [Node.js](https://nodejs.org/) 18 or later. `make` runs `npm install` in `tools/level_editor/` if it's never been run, then `npm run tools-exe` and `npm run build`, each only when its sources have changed (so `rebuild.bat` keeps them up to date too). The exe is about 85 MB.

Without Node, `make` says it's skipping them and builds the rest. The launcher then says levels can't be built and the editor can't run. Players running a build made elsewhere need nothing else installed.

To work on the editor itself:

- `npm run dev` in `tools/level_editor/` runs it with Vite, which reloads it as you change it.
- `npm run editor` runs the built page as the exe does.

## Dependencies

### pc
- gcc / binutils / glibc
- GNU make
- OpenGL 2.0 or higher
- SDL 2
- FluidSynth
- Dear ImGui / cimgui (embedded in project)
- g++ / libstdc++ (for ImGui compilation)

Fedora (64-bit): `sudo dnf install make gcc gcc-c++ glibc-devel.i686 libstdc++-devel.i686 mesa-libGL-devel.i686 sdl2-compat-devel.i686 fluidsynth-devel.i686`

On Linux, run `./rebuild.sh` from the project directory, which runs `make` for the game (`build/c1x`), the launcher (`c1x_launcher`) and the tools:

- `./rebuild.sh` builds whatever changed
- `./rebuild.sh clean` does a full rebuild
- `./rebuild.sh test` builds and runs the tests

Then run `./c1x_launcher` and click **Play** (see [Launcher](launcher.md)).

Making `c1x_tools` copies the `node` it runs with, so it needs node as one whole program. Some distributions' node, such as Fedora's, is a small program that loads node from `libnode.so`, and with it `make` fails with *"Could not find the sentinel NODE_SEA_FUSE_..."*.

`rebuild.sh` checks for this. If so, it downloads node from nodejs.org (`NODE_VERSION`, `v22.23.1` by default), checks it against nodejs.org's published checksums, keeps it in `~/.cache/c1x/` and builds the tools with it.

It also removes a `build/c1x_tools` left behind by a failed build, which `make` would otherwise take as up to date.

Windows (MSYS2):

1. Install [MSYS2](https://www.msys2.org/) (e.g. `winget install MSYS2.MSYS2`).
2. From an MSYS2 shell: `pacman -S --needed make mingw-w64-i686-gcc mingw-w64-i686-SDL2 mingw-w64-i686-fluidsynth`
3. Run `rebuild.bat` from the project directory, which runs `make` in the MINGW32 environment for you (`rebuild.bat clean` for a full rebuild, `rebuild.bat test` for the tests).

   This builds the game into `build/`, copying the DLLs it needs next to it (see below), and the launcher to `c1x_launcher.exe` in the project directory, which needs no DLLs.

   To run `make` yourself instead, open the **MSYS2 MINGW32** shell and `cd` into the project directory first.

   `release.bat` builds the same way, then makes the zip players download (see [Releasing](releasing.md)).
4. Open `c1x_launcher.exe` and click **Play** (see [Launcher](launcher.md)).

The launcher links SDL2 and the GCC runtime statically, so `c1x_launcher.exe` runs on its own.

The game links dynamically against SDL2, FluidSynth (and its audio codec dependencies) and the GCC runtime. Windows only looks for DLLs next to the executable or on `PATH`, so outside the MINGW32 shell the game fails to start with an error such as *"libfluidsynth-3.dll was not found"*.

To avoid this, the Windows build has an extra `dlls` step that runs after linking. It recursively follows the game's imports and copies each one found in the MinGW32 `bin` directory (currently 17 DLLs) into `build/`. To re-copy them on their own, run `make dlls`. The `build` directory is ignored by git, and `make clean` removes it.

To run the game on another machine, copy:

- `c1x_launcher.exe` and the `build` directory, with the `streams` directory beside them
- your `controls.cfg` and `settings.cfg` (if you have them), next to `streams`
- `level_src`, next to `streams` too, to build custom levels there

### psx
As of 30 October 2026, c1x no longer supports building for the PS1, and the `PSX` flag and PS1-specific code have been removed (the last version with them is tagged `psx-last`). See [PS1 build](psx-build.md) for why.

## Tests

Run `make test` to build and run the unit tests in `tests/`. They use the [utest.h](https://github.com/sheredom/utest.h) single-header framework (vendored in `tests/`), build to `build/tests` (`build/tests.exe` on Windows) and only need SDL 2.

Tests are plain C files in `tests/`. Each `UTEST(group, name)` registers itself, so adding a file there is enough for `make test` to pick it up.

The [level editor](custom_levels.md#2-place-objects-in-the-level-editor) in `tools/level_editor/`, with the level build (`builder/`) beside it, has its own tests:

- `npm test` there (after `npm install`) runs them.
- `npm run typecheck` checks its types.

The tests that build a level from Jungle Rollers, which custom levels are built from, are skipped without it in `streams/`.
