# Launcher

The launcher is a small window for changing the game's settings, starting it, and opening the level editor. It's built alongside the game, as `build/launcher.exe` (`build/launcher` on Linux).

It's a second program in C, built from SDL 2, OpenGL and cimgui, which the game already uses. So it needs nothing more to build, and it runs wherever the game runs.

## Building and running it

`make` builds the launcher along with the game (see [Building](building.md)). To build only the launcher, run `make launcher`. On Windows, `rebuild.bat` builds both.

Run `build/launcher.exe`, by double-clicking it or from any folder. It works on the project folder above its own `build` folder, wherever it's started from.

## Game

**Play** saves the settings (see below), then starts `build/c1.exe` from the project folder, so the game finds `streams/`, `settings.cfg` and `controls.cfg` there. The launcher stays open, and the game keeps running if you close it.

If the game isn't built, the launcher says so instead of showing **Play**. Build it, then the button appears.

If any of the game's files are missing from `streams/`, the launcher lists them instead of showing **Play**, with **Check again** and a way to extract them from a disc image. See [Running](running.md) for getting them.

## Settings

The launcher has a field for each setting in `settings.cfg` (see [Settings](settings.md)): a checkbox for each on/off setting, and a box for each number. Hover over a field to see what it does. When it opens, the fields show what `settings.cfg` sets, or the defaults if there isn't one.

**Boot level** lists the levels built to `build/levels/` (see [Custom levels](custom_levels.md)), and **title screen** to start the game normally.

**Save** writes the settings to `settings.cfg`. It changes each setting's line, or adds one for a setting the file doesn't have, and keeps the rest of the file as it is, comments included. Without a `settings.cfg`, it starts from a copy of `settings.example.cfg`. Choosing **title screen** comments out the `boot_level` line. **Play** saves too, so you only need **Save** to keep the settings without playing.

When something else changes `settings.cfg`, such as the level editor's **Boot** button, the fields update to match, unless you've changed them without saving. **Reload** reads `settings.cfg` again, dropping changes you haven't saved, and looks for newly built levels.

## Level editor

The level editor (see [Custom levels](custom_levels.md)) needs [Node.js](https://nodejs.org/) 18 or later. The launcher checks for it when it opens, and if it's missing or too old, says so with **Get Node.js**. After installing it, click **Check again**, or reopen the launcher if that doesn't find it.

The first time, **Install** downloads the editor's packages (`npm install`), showing its output. After that:

- **Open editor** starts the editor, which opens in your browser.
- While it runs, the launcher shows its address, with **Open in browser** to open it again and **Stop** to stop it.
- Closing the launcher stops it too.
