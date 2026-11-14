# c1x

c1x ("c1, extended") is a port of *Crash Bandicoot* to the PC, with quality of life improvements and custom levels. It's an unofficial fan project, built on [c1](https://github.com/wurlyfox/c1), wurlyfox's port of the game.

c1x doesn't include the game itself: you need the files from a copy of Crash Bandicoot you own, either the disc or a disc image (`.bin` or `.iso`) made from it.

## Playing

1. Open `c1x_launcher.exe`.
2. The first time, it says the game's files are missing. Choose your disc image with **Browse...** and click **Extract**. With the disc instead, see [`streams/README.md`](streams/README.md).
3. Click **Play**.

The launcher also has your **Settings** and **Controls** (keyboard keys for each PlayStation button). See [Controls](doc/controls.md) for the default keys, and [Settings](doc/settings.md) for what each setting does.

## Custom levels

c1x comes with four custom levels, in `level_src/`. In the launcher's **Levels** tab, click **Build** on one, then **Play**: it boots straight into it. Choose **title screen** under **Boot level** in Settings to start the game normally again.

To make your own, model a map in [Blender](https://www.blender.org/), then place boxes, enemies and obstacles in the level editor, in the launcher's **Level editor** tab. The editor needs [Node.js](https://nodejs.org/) 18 or later. See [Custom levels](doc/custom_levels.md).

## What's here

| | |
|---|---|
| `c1x_launcher.exe` | the launcher: open this |
| `build/` | the game (`c1x.exe`), what it needs, and the levels you build |
| `streams/` | the game's files, once you've added them |
| `level_src/` | the custom levels' sources, and yours |
| `tools/level_editor/` | the level editor |
| `doc/` | more on running, controls, settings and custom levels, and the [changelog](doc/changelog.md) |

## Licence

c1x's own work is under the MIT licence, which doesn't cover the original c1 port or the game: see [LICENSE](LICENSE).
