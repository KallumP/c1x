# Launcher

The launcher is a small window for starting the game, changing its settings and controls, and opening the level editor. Open `c1x_launcher.exe` to start it.

**Play** is at the top, with a tab each for Settings, Controls, Levels, the Level editor and Help below it.

## Version

The launcher's version is in the top right corner of its window, for example `v1.3`.

When it opens, it asks the update server once whether c1x has a newer release. If it does, a button naming that release appears beside the version, for example **Version 1.4 is out**. Click it to install that release next to your c1x folder, as `c1x-1.4` beside `c1x-1.3`, then **Open v1.4** to switch to it.

- Your settings, controls, game files, memory card and custom levels are copied in. Custom levels build again when you choose them.
- Your old folder isn't changed: delete it once you're happy with the new one.
- If it can't install, the button opens the release's download page instead.

If you download a release yourself, copy these across from the old folder:

- `memory_card/`, your saves
- `controls.cfg`, your keybinds

Everything else is quick to set up again in the launcher.

If you're offline, or the update server doesn't answer, there's no button. It checks again the next time the launcher opens.

Besides this check, the launcher only goes online for mod.io's levels, when you open the Levels tab, search or download one, and when you install a release.

## Game

**Play** saves the settings and controls (see below), then starts the game. The launcher stays open, and the game keeps running if you close it. While a level is building, **Play** is greyed out until it's built.

If any of the game's files are missing, the launcher lists them instead of showing **Play**, with **Check again** and a way to extract them from a disc image. See [Running](running.md) for getting them.

## Settings

The launcher has a field for each setting in `settings.cfg` (see [Settings](settings.md)): a checkbox for each on/off setting and a box for each number. Hover over a field to see what it does.

Under **Co-op**, **Player 1 customization** and **Player 2 customization** show each player's colours. Click one of the colour squares, or **Edit**, to choose them in a popup:

- **Preset** picks a ready-made set: **Default** (Crash's own) or **Skunk**, which player 2 starts as.
- The list on the left picks a part (fur, belly, hair, shorts or shoes), and the picker beside it sets that part's colour.
- **Done** keeps the colours. **Cancel**, or Escape, leaves them as they were.

**Custom level**, the first setting, is the custom level that **CUSTOM LEVEL** on the game's title screen starts (under **LOAD GAME**): it lists the custom levels (see [Levels](#levels)), and **none**, which leaves **CUSTOM LEVEL** off the title screen. A level that isn't built says `(not built)`; choosing it builds it, then picks it once it's built.

**Save** keeps your settings. **Play** saves too, so you only need **Save** to keep them without playing.

When the level editor's **Build + boot** picks a level, the launcher shows it, unless you've changed settings without saving. **Reload** drops changes you haven't saved, and looks for newly built levels.

## Controls

The Controls tab shows each PlayStation button's keys, on its **Player 1 keyboard** tab, and game controller buttons, on its **Controller** tab (see [Controls](controls.md)). They're grouped by what they do: movement first, then jump, spin, start and select, then the other buttons.

- Click a key, then press the key you want instead; on the Controller tab, click a controller button and press the one you want on a plugged in controller. Esc cancels.
- **+** gives a button another key or controller button, and **x** removes one. A button always keeps at least one.
- **Reset to defaults** puts every button back to its default key and controller button.
- **Save** keeps them. **Play** saves too.

## Levels

The Levels tab lists the custom levels (see [Custom levels](custom_levels.md)). Each is listed by its title (its loading screen's, set under **Level** in the level editor), under **Comes with c1x** (the five levels that do), **Downloaded** and **Your own**. The **Custom level** setting lists them the same way.

Beside each level is whether it's built. It says `out of date` when a file in its source folder was saved after it was built (its `.blend` doesn't count: export the `.obj` again).

- **Build** builds that level, showing how it went below. Once it's built, it's the **Custom level**. Only one level builds at a time.
- **Check again** looks for level sources added, and ones saved, since the launcher opened.
- **Open levels folder** opens the folder the levels are in, to drop a level into.

**Online levels** lists the 10 most downloaded levels players have shared (see [Sharing levels](custom_levels.md#sharing-levels)) when you open the tab. Type part of a name in the box and click **Find levels** to list the levels with that in their name. **Download** adds a level and builds it.

## Level editor

The level editor (see [Custom levels](custom_levels.md)) needs nothing installed.

- **Open editor** starts the editor, which opens in your browser.
- While it runs, the launcher shows its address, with **Open in browser** to open it again and **Stop** to stop it.
- Closing the launcher stops it too.

## Help

The Help tab has a button for each page of c1x's guide (getting started, controls, settings, custom levels and what's new), which opens it in your browser.
