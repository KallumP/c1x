# Launcher

The launcher is a small window for starting the game, changing its settings and controls, and opening the level editor. It's built alongside the game, as `build/launcher.exe` (`build/launcher` on Linux).

It's a second program in C, built from SDL 2, OpenGL and cimgui, which the game already uses. So it needs nothing more to build, and it runs wherever the game runs.

## Building and running it

`make` builds the launcher along with the game (see [Building](building.md)). To build only the launcher, run `make launcher`. On Windows, `rebuild.bat` builds both.

Run `build/launcher.exe`, by double-clicking it or from any folder. It works on the project folder above its own `build` folder, wherever it's started from.

**Play** is at the top, with a tab each for Settings, Controls and the Level editor below it.

## Game

**Play** saves the settings and controls (see below), then starts `build/c1.exe` from the project folder, so the game finds `streams/`, `settings.cfg` and `controls.cfg` there. The launcher stays open, and the game keeps running if you close it.

If the game isn't built, the launcher says so instead of showing **Play**. Build it, then the button appears.

If any of the game's files are missing from `streams/`, the launcher lists them instead of showing **Play**, with **Check again** and a way to extract them from a disc image. See [Running](running.md) for getting them.

## Settings

The launcher has a field for each setting in `settings.cfg` (see [Settings](settings.md)): a checkbox for each on/off setting, and a box for each number. Hover over a field to see what it does. When it opens, the fields show what `settings.cfg` sets. If there isn't one, it creates it from `settings.example.cfg`, with the defaults.

**Boot level** lists the levels built to `build/levels/` (see [Custom levels](custom_levels.md)), and **title screen** to start the game normally.

**Save** writes the settings to `settings.cfg`. It changes each setting's line, or adds one for a setting the file doesn't have, and keeps the rest of the file as it is, comments included. Choosing **title screen** comments out the `boot_level` line. **Play** saves too, so you only need **Save** to keep the settings without playing.

When something else changes `settings.cfg`, such as the level editor's **Boot** button, the fields update to match, unless you've changed them without saving. **Reload** reads `settings.cfg` again, dropping changes you haven't saved, and looks for newly built levels.

## Controls

The Controls tab shows each PlayStation button's keys from `controls.cfg` (see [Controls](controls.md)), which it creates from `controls.example.cfg` if there isn't one.

- Click a key, then press the key you want instead. Esc cancels. Tab can't be used, as the game's debug GUI uses it.
- **+** gives a button another key, and **x** removes one. A button always keeps at least one.
- **Reset to defaults** puts every button back to its default key.
- **Save** writes `controls.cfg`, changing only the lines for buttons whose keys changed and keeping the rest of the file. **Play** saves too.

## Level editor

The level editor (see [Custom levels](custom_levels.md)) needs [Node.js](https://nodejs.org/) 18 or later. The launcher checks for it when it opens, and if it's missing or too old, says so with **Get Node.js**. After installing it, click **Check again**, or reopen the launcher if that doesn't find it.

The first time, **Install** downloads the editor's packages (`npm install`), showing its output. After that:

- **Open editor** starts the editor, which opens in your browser.
- While it runs, the launcher shows its address, with **Open in browser** to open it again and **Stop** to stop it.
- Closing the launcher stops it too.
