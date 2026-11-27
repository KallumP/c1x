# Settings

The game's settings are in `settings.cfg`, next to `streams/`. Change them in the [launcher](launcher.md#settings), which creates the file from [`settings.example.cfg`](../settings.example.cfg) and keeps it up to date. The game reads it when it starts.

### General

| Setting | Default | What it does |
|---|---|---|
| `fullscreen` | `off` | Fill the screen instead of a 1024x768 window. The picture keeps its 4:3 shape, with black bars at the sides on a widescreen. <kbd>Alt</kbd>+<kbd>Enter</kbd> or <kbd>F11</kbd> switches between the two while playing, without changing the setting. |
| `fps_display` | `on` | Show how many frames are drawn a second in the top right corner (see `frame_rate`). |
| `frame_rate` | `60` | How many frames a second to draw, from `30` to `240`. The game itself still runs at the PS1's speed, 29.97 frames a second, so it plays the same; the frames in between show the camera and everything moving smoothly between them. `30` draws only the game's own frames. Each game frame gets the same whole number of frames, so the counter can read a little off the setting: `144` shows about 150. |
| `mute` | `off` | Start the game with no sound. |

### Game adjustments

| Setting | Default | What it does |
|---|---|---|
| `box_display` | `on` | Show how many of the level's boxes Crash has broken at the top of the screen, such as `12/49`. It slides in with the lives and wumpa counters when triangle shows them, not each time a box breaks. Levels without a box gem (bosses, bonus rounds) show only the number broken. |
| `skip_splash_screens` | `on` | Go straight to the main menu, skipping the Sony, Universal and Naughty Dog screens. |
| `skip_loading_screen` | `off` | Don't show each level's loading screen while it loads. |
| `loading_screen_min_ms` | `1000` | Keep the loading screen up for at least this many milliseconds (up to `60000`), as levels load much faster than from the PS1's CD. `0` shows it only while loading. |
| `fix_model_draw_order` | `on` | Draw 3D models in front of or behind each other by their actual depth, so a crate can't be drawn over Crash in front of it. `off` keeps the original game's order. |
| `spin_ledge_jump` | `on` | Let Crash jump for a moment after a spin carries him off a ledge (such as one he landed on mid-spin), as he can after walking off one. `off` keeps the original game, where he can't jump until the spin ends. |
| `speed_display` | `off` | Show how fast Crash is moving in the top right corner. |
| `spin_display` | `off` | Show how many spins Crash has left in the top right corner, and the seconds until the next comes back. He holds up to 5, and each comes back 2 seconds after it's used. |

### Co-op

| Setting | Default | What it does |
|---|---|---|
| `two_players` | `off` | Two Crashes play together: player 2 on the arrow keys and number pad, or a second controller (see [Controls](controls.md#two-players)). The camera follows whoever is nearest it, and the other can walk out of view. If either Crash dies, both go back to the last checkpoint. |
| `p1_fur_color` | `ff3100` | The colour of player 1's fur, as six hex digits: red, green, blue. His belly is a lighter shade of it. The default is Crash's own, and leaves him exactly as the original draws him. |
| `p1_shorts_color` | `002790` | The colour of player 1's shorts. |
| `p1_shoes_color` | `330000` | The colour of player 1's shoes and gloves. |
| `p2_fur_color`, `p2_shorts_color`, `p2_shoes_color` | `2f80ed`, `e8590c`, `1b2a4a` | The same three colours for player 2, who starts in blue fur, orange shorts and navy shoes so the two are easy to tell apart. |

### Start

| Setting | Default | What it does |
|---|---|---|
| `boot_level` | none | The custom level, built to `build/levels/`, that **CUSTOM LEVEL** on the title screen starts; without one, the title screen has no **CUSTOM LEVEL** (see [Custom levels](custom_levels.md)). |

### Saving

| Setting | Default | What it does |
|---|---|---|
| `memory_card` | `off` | Let the game's own save and load screens save your progress, as a PS1 memory card does (see below). `off` leaves them without a card, as they were. |

### Replays

| Setting | Default | What it does |
|---|---|---|
| `replay_inputs` | `off` | Play back the newest recording (see below) instead of recording this run. |
| `replay_speed` | `1` | How fast a replay plays: this many times normal speed (up to `16`), or `0` for as fast as possible. |

## Memory card

With `memory_card` on, the game's own screens save and load your progress: **LOAD GAME** on the title screen, and the save screen after a bonus round or a gem. The saves are files in `memory_card/`, next to `settings.cfg`, one for each slot the game shows (up to 15), named as the PS1 game names its saves, such as `BASCUS-9490000123456`. To back a save up or move it to another PC, copy its file; to delete one, delete its file. Formatting the card on the game's screen deletes them all.

A save keeps what the PS1 game's does: the levels reached, gems and keys, lives and the sound settings. A slot shows the same icon whatever its save, not one of the PS1 save's own.

## Recorded inputs

To help reproduce bugs, every run records the buttons held each frame to its own file in `build/recorded_inputs/`, named by when it started. `replay_inputs` plays the newest one back, so delete or move newer ones to replay an older run. A recording only plays back the same way with the same game files and `skip_splash_screens` setting.

A recording also keeps a copy of the memory card's saves as they were when it started, in a `.card` folder named after it. A replay plays on that copy, in `memory_card_replay/`, so it never changes your own saves.

Recordings are never deleted for you (each is about 15 KB a minute), but `make clean` deletes `build/` with them in it.
