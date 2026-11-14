# Launcher

The launcher is a small window for starting the game, changing its settings and controls, and opening the level editor. It's built alongside the game, as `c1x_launcher.exe` in the project folder (`c1x_launcher` on Linux).

It's a second program in C, built from SDL 2, OpenGL and cimgui, which the game already uses. So it needs nothing more to build, and it runs wherever the game runs.

## Building and running it

`make` builds the launcher along with the game (see [Building](building.md)). To build only the launcher, run `make launcher`. On Windows, `rebuild.bat` builds both.

Run `c1x_launcher.exe`, by double-clicking it or from any folder. It works on its own folder, the project folder, wherever it's started from, and finds the game and the rest in `build/` from there. On Windows it has SDL2 and the GCC runtime built in, so it needs no DLLs beside it.

**Play** is at the top, with a tab each for Settings, Controls and the Level editor below it.

## Game

**Play** saves the settings and controls (see below), then starts `build/c1.exe` (`build/c1` on Linux) from the project folder, so the game finds `streams/`, `settings.cfg` and `controls.cfg` there. The launcher stays open, and the game keeps running if you close it.

If the game isn't built, the launcher says so instead of showing **Play**. Build it, then the button appears.

If any of the game's files are missing from `streams/`, the launcher lists them instead of showing **Play**, with **Check again** and a way to extract them from a disc image. See [Running](running.md) for getting them.

## Settings

The launcher has a field for each setting in `settings.cfg` (see [Settings](settings.md)): a checkbox for each on/off setting, and a box for each number. Hover over a field to see what it does. When it opens, the fields show what `settings.cfg` sets. If there isn't one, it creates it from `settings.example.cfg`, with the defaults.

**Boot level** lists the custom levels (see [Levels](#levels)), and **title screen** to start the game normally. A level that isn't built says `(not built)`; choosing it builds it, then sets it as the boot level once it builds.

**Save** writes the settings to `settings.cfg`. It changes each setting's line, or adds one for a setting the file doesn't have, and keeps the rest of the file as it is, comments included. Choosing **title screen** comments out the `boot_level` line. **Play** saves too, so you only need **Save** to keep the settings without playing.

When something else changes `settings.cfg`, such as the level editor's **Build + boot** button, the fields update to match, unless you've changed them without saving. **Reload** reads `settings.cfg` again, dropping changes you haven't saved, and looks for newly built levels.

## Controls

The Controls tab shows each PlayStation button's keys from `controls.cfg` (see [Controls](controls.md)), which it creates from `controls.example.cfg` if there isn't one.

- Click a key, then press the key you want instead. Esc cancels. Tab can't be used, as the game's debug GUI uses it.
- **+** gives a button another key, and **x** removes one. A button always keeps at least one.
- **Reset to defaults** puts every button back to its default key.
- **Save** writes `controls.cfg`, changing only the lines for buttons whose keys changed and keeping the rest of the file. **Play** saves too.

## Levels

The Levels tab lists the custom levels (see [Custom levels](custom_levels.md)): each level source in `level_src/` (a folder with a map, its `.obj`) and each level built to `build/levels/`, saying whether it's built. A level says `out of date` when a file in its source folder was saved after it was built (its `.blend` doesn't count: export the `.obj` again). **Build** builds that level with `build/build-level.exe`, without Node or the level editor, showing its output below. When it builds, it's set as the boot level and `settings.cfg` is saved. Only one level builds at a time. **Check again** looks for level sources added, and ones saved, since the launcher opened.

If `build-level.exe` isn't there (`make` skips it without Node; see [Building](building.md#building-levels-without-node)), the tab says so and **Build** is greyed out.

## Level editor

The level editor (see [Custom levels](custom_levels.md)) needs [Node.js](https://nodejs.org/) 18 or later. The launcher checks for it when it opens, and if it's missing or too old, says so with **Get Node.js**. After installing it, click **Check again**, or reopen the launcher if that doesn't find it.

The first time, **Install** downloads the editor's packages (`npm install`), showing its output. After that:

- **Open editor** starts the editor, which opens in your browser.
- While it runs, the launcher shows its address, with **Open in browser** to open it again and **Stop** to stop it.
- Closing the launcher stops it too.
