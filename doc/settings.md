# Settings

The game's settings are in `settings.cfg`, next to `streams/`. Change them in the [launcher](launcher.md#settings), which creates the file from [`settings.example.cfg`](../settings.example.cfg) and keeps it up to date. The game reads it when it starts.

| Setting | Default | What it does |
|---|---|---|
| `loading_screen` | `on` | Show each level's loading screen while it loads. |
| `loading_screen_min_ms` | `2000` | Keep the loading screen up for at least this many milliseconds (up to `60000`), as levels load much faster than from the PS1's CD. `0` shows it only while loading. |
| `speed_display` | `off` | Show how fast Crash is moving in the top right corner. |
| `fps_display` | `off` | Show how many frames are drawn a second in the top right corner (see `frame_rate`). |
| `spin_display` | `off` | Show how many spins Crash has left in the top right corner, and the seconds until the next comes back. He holds up to 5, and each comes back 2 seconds after it's used. |
| `box_display` | `off` | Show how many of the level's boxes Crash has broken at the top of the screen, such as `12/49`. Like the lives and wumpa counters, it slides in when a box breaks, then back out. Levels without a box gem (bosses, bonus rounds) show only the number broken. |
| `skip_splash_screens` | `off` | Go straight to the main menu, skipping the Sony, Universal and Naughty Dog screens. |
| `fix_model_draw_order` | `off` | Draw 3D models in front of or behind each other by their actual depth, so a crate can't be drawn over Crash in front of it. `off` keeps the original game's order. |
| `replay_inputs` | `off` | Play back the newest recording (see below) instead of recording this run. |
| `replay_speed` | `1` | How fast a replay plays: this many times normal speed (up to `16`), or `0` for as fast as possible. |
| `frame_rate` | `60` | How many frames a second to draw, from `30` to `240`. The game itself still runs at 30 frames a second, as on the PS1, so it plays the same; the frames in between show the camera and everything moving smoothly between them. `30` draws only the game's own frames. |
| `fullscreen` | `off` | Fill the screen instead of a 1024x768 window. The picture keeps its 4:3 shape, with black bars at the sides on a widescreen. <kbd>Alt</kbd>+<kbd>Enter</kbd> switches between the two while playing, without changing the setting. |
| `boot_level` | none | Start in a custom level built to `build/levels/` instead of the title screen (see [Custom levels](custom_levels.md)). |

## Recorded inputs

To help reproduce bugs, every run records the buttons held each frame to its own file in `build/recorded_inputs/`, named by when it started. `replay_inputs` plays the newest one back, so delete or move newer ones to replay an older run. A recording only plays back the same way with the same game files and `skip_splash_screens` setting.

Recordings are never deleted for you (each is about 15 KB a minute), but `make clean` deletes `build/` with them in it.
