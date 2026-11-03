# Launcher

The launcher is a small window for starting the game. It's built alongside the game, as `build/launcher.exe` (`build/launcher` on Linux).

It's a second program in C, built from SDL 2, OpenGL and cimgui, which the game already uses. So it needs nothing more to build, and it runs wherever the game runs.

## Building and running it

`make` builds the launcher along with the game (see [Building](building.md)). To build only the launcher, run `make launcher`. On Windows, `rebuild.bat` builds both.

Run `build/launcher.exe`, by double-clicking it or from any folder. It works on the project folder above its own `build` folder, wherever it's started from.

## Game

**Play** starts `build/c1.exe` from the project folder, so the game finds `streams/`, `settings.cfg` and `controls.cfg` there. The launcher stays open, and the game keeps running if you close it.

If the game isn't built, the launcher says so instead of showing **Play**. Build it, then the button appears.
