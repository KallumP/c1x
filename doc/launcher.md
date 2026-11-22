# Launcher

The launcher is a small window for starting the game, changing its settings and controls, and opening the level editor. It's built alongside the game, as `c1x_launcher.exe` in the project folder (`c1x_launcher` on Linux).

It's a second program in C, built from SDL 2, OpenGL and cimgui, which the game already uses. So it needs nothing more to build, and it runs wherever the game runs.

## Building and running it

`make` builds the launcher along with the game (see [Building](building.md)). To build only the launcher, run `make launcher`. On Windows, `rebuild.bat` builds both, and on Linux, `rebuild.sh` does.

Run `c1x_launcher.exe`, by double-clicking it or from any folder. It works on its own folder, the project folder, wherever it's started from, and finds the game and the rest in `build/` from there. On Windows it has SDL2 and the GCC runtime built in, so it needs no DLLs beside it.

**Play** is at the top, with a tab each for Settings, Controls, Levels, the Level editor and Help below it.

## Version

The launcher's version is in the top right corner of its window, for example `v1.3`.

When it opens, it asks GitHub once whether c1x has a newer release. If it does, a button naming that release appears beside the version, for example **Version 1.4 is out**. Click it to open the newest release's page in your browser, and download it from there. Nothing is downloaded or changed for you.

A new release unzips to its own folder. To carry on where you were, copy these across from the old folder:

- `streams/`, the game's files
- `settings.cfg` and `controls.cfg`
- `memory_card/`, if you save to the memory card
- any levels of your own in `level_src/`

There's no **Version ... is out** button when the launcher can't tell whether there's a newer release:

- you're offline, or GitHub doesn't answer
- `build/c1x_tools.exe` isn't there, as the check runs from it
- it's a launcher you built yourself, which says `dev build` and doesn't check (see [Releasing](releasing.md#the-launchers-version))

This check is the only time the launcher uses the internet.

## Game

**Play** saves the settings and controls (see below), then starts `build/c1x.exe` (`build/c1x` on Linux) from the project folder, so the game finds `streams/`, `settings.cfg` and `controls.cfg` there. It starts the game without a console window, so the game's messages (such as "replaying ...") only show when you run `build/c1x.exe` yourself from a terminal. The launcher stays open, and the game keeps running if you close it. While a level is building, **Play** is greyed out until it's built.

If the game isn't built, the launcher says so instead of showing **Play**. Build it, then the button appears.

If any of the game's files are missing from `streams/`, the launcher lists them instead of showing **Play**, with **Check again** and a way to extract them from a disc image. See [Running](running.md) for getting them.

## Settings

The launcher has a field for each setting in `settings.cfg` (see [Settings](settings.md)): a checkbox for each on/off setting, and a box for each number. Hover over a field to see what it does. When it opens, the fields show what `settings.cfg` sets. If there isn't one, it creates it from `settings.example.cfg`, with the defaults.

**Custom level**, the first setting, is the custom level that **CUSTOM LEVEL** on the game's title screen starts (under **LOAD GAME**): it lists the custom levels (see [Levels](#levels)), and **none**, which leaves **CUSTOM LEVEL** off the title screen. A level that isn't built says `(not built)`; choosing it builds it, then sets it as the boot level once it builds.

**Save** writes the settings to `settings.cfg`. It changes each setting's line, or adds one for a setting the file doesn't have, and keeps the rest of the file as it is, comments included. Choosing **none** comments out the `boot_level` line. **Play** saves too, so you only need **Save** to keep the settings without playing.

When something else changes `settings.cfg`, such as the level editor's **Build + boot** button, the fields update to match, unless you've changed them without saving. **Reload** reads `settings.cfg` again, dropping changes you haven't saved, and looks for newly built levels.

## Controls

The Controls tab shows each PlayStation button's keys, on its **Keyboard** tab, and game controller buttons, on its **Controller** tab, from `controls.cfg` (see [Controls](controls.md)), which it creates from `controls.example.cfg` if there isn't one. They're grouped by what they do: movement first, then jump, spin, start and select, then the other buttons.

- Click a key, then press the key you want instead; on the Controller tab, click a controller button and press the one you want on a plugged in controller. Esc cancels.
- **+** gives a button another key or controller button, and **x** removes one. A button always keeps at least one.
- **Reset to defaults** puts every button back to its default key and controller button.
- **Save** writes `controls.cfg`, changing only the lines for buttons whose keys or controller buttons changed and keeping the rest of the file. **Play** saves too.

## Levels

The Levels tab lists the custom levels (see [Custom levels](custom_levels.md)): each level source in `level_src/` (a folder with a map, its `.obj`) and each level built to `build/levels/`, saying whether it's built. A level says `out of date` when a file in its source folder was saved after it was built (its `.blend` doesn't count: export the `.obj` again). **Build** builds that level with `build/c1x_tools.exe`, without Node or the level editor, showing its output below. When it builds, it's set as the boot level and `settings.cfg` is saved. Only one level builds at a time. **Check again** looks for level sources added, and ones saved, since the launcher opened.

If `c1x_tools.exe` isn't there (`make` skips it without Node; see [Building](building.md#the-level-build-and-editor-without-node)), the tab says so and **Build** is greyed out.

## Level editor

The level editor (see [Custom levels](custom_levels.md)) runs from `build/c1x_tools.exe`, so it needs nothing installed. If that isn't there (see [Building](building.md#the-level-build-and-editor-without-node)), the tab says so.

- **Open editor** starts the editor, which opens in your browser.
- While it runs, the launcher shows its address, with **Open in browser** to open it again and **Stop** to stop it.
- Closing the launcher stops it too.

## Help

The Help tab has a button for each page of c1x's guide (getting started, controls, settings, custom levels and what's new), which opens it in your browser: a release's own page (its docs as pages; see [Releasing](releasing.md#whats-in-the-zip)), or the doc on GitHub in a project folder without them.
