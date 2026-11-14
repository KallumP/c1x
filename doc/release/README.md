# c1x

c1x is a fan-made PC version of *Crash Bandicoot*, with extra options and new levels to play. It's unofficial, and built on [c1](https://github.com/wurlyfox/c1) by wurlyfox.

**You need your own copy of Crash Bandicoot:** the disc, or a disc image (`.bin` or `.iso`) of it. c1x doesn't come with the game.

## Playing

### The first time

1. Open `c1x_launcher.exe`.
2. It says the game's files are missing. Click **Browse...**, choose your disc image, then click **Extract**.
   - Using the disc instead? See [getting the game's files](streams/README.md).
3. Click **Play**.

### After that

Open `c1x_launcher.exe` and click **Play**.

### Controls and settings

The launcher has a tab for each:

- **Controls**: choose which keys do what. See [Controls](doc/controls.md) for the keys to start with.
- **Settings**: such as full screen and the speed display. See [Settings](doc/settings.md) for what each one does.

**Help**, in the launcher, opens this guide.

## Custom levels

### Play the new levels

c1x comes with four new levels.

1. In the launcher, open the **Levels** tab.
2. Click **Build** next to a level.
3. Click **Play**. The game starts in that level.

To play the normal game again, open **Settings**, set **Boot level** to **title screen**, then click **Play**.

### Make your own

1. Make a map in [Blender](https://www.blender.org/), which is free.
2. In the launcher, open the **Level editor** tab and click **Open editor**. It opens in your web browser.
3. Place Crash's start, the end, and boxes, enemies and obstacles, then build it and play it.

The full guide is in [Custom levels](doc/custom_levels.md).

## What's in this folder

| | |
|---|---|
| `c1x_launcher.exe` | Open this to play |
| `build` | The game, the level editor, and the levels you've built |
| `streams` | The game's files, once you've added them |
| `level_src` | The custom levels, and the ones you make |
| `doc` | The guides, and [what's new](doc/changelog.md) |

## Licence

c1x's own work is free to use under the MIT licence. That doesn't cover the original c1 port or Crash Bandicoot itself: see [LICENSE](LICENSE).
