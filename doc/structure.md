# Structure

Project structure is listed below, including descriptions for each file.

```
.
├── doc                      # documentation
│   ├── changelog.md         # project changelog
│   ├── issues.md            # project issues
│   ├── building.md          # dependencies, compiling and tests
│   ├── running.md           # game files and running the game
│   ├── launcher.md          # the launcher (build/launcher.exe)
│   ├── controls.md          # default keys, and controls.cfg
│   ├── structure.md         # project structure; this file
│   ├── contributing.md      # commit messages and pull requests
│   ├── coding.md            # project coding standards
│   ├── settings.md          # settings.cfg settings and their defaults
│   ├── outline.md           # game outline
│   ├── funcs.md             # function descriptions
│   ├── files.md             # detailed file descriptions (incomplete)
│   └── memmap.xlsx          # memory map
├── src                      # source code
│   ├── formats              # entry [item] formats
│   │   ├── cvtx.h           # cvtx type entry item formats
│   │   ├── gool.h           # gool type entry item formats
│   │   ├── imag.h           # imag type entry item formats
│   │   ├── inst.h           # inst type entry item formats
│   │   ├── ipal.h           # ipal type entry item formats
│   │   ├── mdat.h           # mdat type entry item formats
│   │   ├── pbak.h           # pbak type entry item formats
│   │   ├── slst.h           # slst type entry item formats
│   │   ├── svtx.h           # svtx type entry item formats
│   │   ├── tgeo.h           # tgeo type entry item formats
│   │   ├── wgeo.h           # wgeo type entry item formats
│   │   └── zdat.h           # zdat type entry item formats
│   ├── pc                   # pc-specific code (non-inline)
│   │   ├── gfx              # pc graphics
│   │   │   ├── gl.c,h       # OpenGL backend (2D primitive rasterization)
│   │   │   ├── tex.c,h      # texture cache
│   │   │   ├── pixel.h      # ps1 5551 to rgba pixel conversion
│   │   │   └── pcgfx.h      # graphics primitives
│   │   │── sound            # pc sound
│   │   │   ├── audio.c,h    # audio/sfx backend
│   │   │   ├── midi.c,h     # midi backend
│   │   │   ├── util.c,h     # utility functions for SEQ/VAB conversion
│   │   │   └── formats      # audio and midi formats
│   │   │       ├── psx.h    # psx SEP, SEQ, VAB, and VAG formats
│   │   │       ├── sf2.h    # soundfont (sf2) format
│   │   │       └── smf.h    # standard midi format
│   │   │── init.c,h         # pc-specific initialization (incl. SDL)
│   │   │── math.c,h         # fixed point implementations of math functions
│   │   │── pad.c,h          # joypad emulation (keyboard bindings, controls.cfg loading)
│   │   │── controls.c,h     # controls.cfg's button names, default keys and lines (shared with the launcher)
│   │   │── config.c,h       # "name = value" file parsing shared by controls.cfg and settings.cfg
│   │   │── settings.c,h     # game settings (settings.cfg loading)
│   │   │── loading.c,h      # level loading screen image conversion and minimum display time
│   │   │── speed.c,h        # crash's speed measurement for the speed display
│   │   │── spin.c,h         # crash's spins left and next refill, for the spin display
│   │   │── boxhud.c,h       # the box counter: a hud lives counter showing broken/total boxes
│   │   │── boxhud_game.c    # creates the box counter with the hud and feeds it box_count each frame
│   │   │── boxtotals.c,h    # each level's box total: the game's (from the level end screen) or a custom level's
│   │   │── slash.c,h        # a '/' image for the hud's digits, which have none
│   │   │── frames.h         # game frames elapsed, started part way as on a ps1
│   │   │── follow.c,h       # the follow camera's sideways offset (cam_mode 9, custom levels)
│   │   └── time.c,h         # tick counter
│   ├── common.h             # common includes, macros, and codes
│   ├── geom.h               # geometric primitives (point, vector, angle, rect, matrix etc.)
│   ├── globals.h            # GOOL globals
│   ├── audio.c,h            # audio engine
│   ├── cam.c,h              # camera engine
│   ├── gfx.c,h              # upper-level graphics code
│   ├── gool.c,h             # GOOL object engine
│   ├── level.c,h            # level state and zone functions
│   ├── main.c,h             # main function and game loop
│   ├── math.c,h             # misc math functions
│   ├── midi.c,h             # midi/seq engine
│   ├── misc.c,h             # per-frame updates for world shader parameters
│   ├── ns.c,h               # paging/entry subsystem
│   ├── pad.c,h              # joypad interface
│   ├── pbak.c,h             # demo playback
│   ├── slst.c,h             # polygon id sort lists
│   ├── solid.c,h            # solidity and collision detection and movement limiting
│   ├── title.c,h            # handles title screen loading, transition between title states, and drawing of title card backdrops
│   ├── launcher             # the launcher (a separate program, make launcher)
│   │   ├── main.c           # its window and main loop
│   │   ├── command.c,h      # a command run in the background, keeping its output
│   │   ├── controls_file.c,h    # reading controls.cfg, and saving it keeping its other lines
│   │   ├── controls_section.c,h # the controls tab (each button's keys, Save)
│   │   ├── editor_section.c,h   # the level editor section (Node check, Install, Open editor)
│   │   ├── extract.c,h      # the command extracting the game's files from a disc image
│   │   ├── extract_section.c,h  # the disc image field, Browse and Extract
│   │   ├── file_dialog.c,h  # choosing a file with the system's dialog (windows)
│   │   ├── game.c,h         # the game: is it built, and starting it
│   │   ├── game_section.c,h # the game section (Play)
│   │   ├── level_editor.c,h # the level editor's folder, packages and address
│   │   ├── levels.c,h       # the levels built to build/levels/, for the boot level dropdown
│   │   ├── node.c,h         # node's version
│   │   ├── paths.c,h        # the repo folder, from the launcher's own path
│   │   ├── process.c,h      # running programs, and commands in the background with their output
│   │   ├── settings_file.c,h    # reading settings.cfg, and saving it keeping its other lines
│   │   ├── settings_section.c,h # the settings section (a field for each setting, Save)
│   │   ├── streams.c,h      # the game's files missing from streams/
│   │   ├── text_file.c,h    # editing a "name = value" file a line at a time
│   │   └── ui.c,h           # the launcher's look, and the parts the sections share
│   ├── util                 # utilities
│   │   ├── list.c,h         # generic linked list
│   │   └── tree.c,h         # generic tree
│   └── ext                  # extensions to original game code
│       ├── lib              # libraries
│       │   ├── gui.c        # minimal GUI library ([c]imgui thin wrapper)
│       │   ├── refl.c       # minimal type reflection library
│       │   └── cimgui       # cimgui and imgui
│       ├── gui.c,h          # in-game GUI
│       ├── refl.c,h         # game-specific type metadata
│       └── disgool.c,h      # GOOL disassembler
├── streams                  # game assets (.NSD/.NSF files)
├── tests                    # unit tests (make test)
│   ├── main.c               # test runner
│   ├── utest.h              # utest.h test framework (vendored)
│   ├── test_pad.c           # key state to joypad buttons
│   ├── test_pad_parse.c     # controls.cfg line parsing
│   ├── test_pad_config.c    # controls.cfg loading
│   ├── test_config.c        # shared "name = value" file parsing
│   ├── test_settings.c      # settings.cfg parsing and loading
│   ├── test_loading.c       # loading screen image conversion and timing
│   ├── test_gui.c           # in-game GUI tree node insertion and removal
│   ├── test_speed.c         # crash's speed measurement and tracking
│   ├── test_follow.c        # the follow camera's sideways offset
│   ├── test_launcher_*.c    # the launcher: its paths, running commands, the game, its files in streams/ and extracting them, controls.cfg, node, the level editor, built levels and settings.cfg
│   └── test_sf2.c           # soundfont record struct sizes
├── tools                    # helper scripts
│   └── level_editor         # the level editor and the tools beside it, in typescript (npm install first)
│       ├── src, server      # the level editor (npm run dev): places a level source's objects, sets its turn and scale, and builds and boots it
│       ├── builder          # builds a level from its source in level_src/ (npm run build-level -- <name>), for the editor's build button
│       ├── scripts          # extracts game assets from a disc image (npm run extract-streams -- <image>)
│       └── tests            # their tests (npm test)
├── level_src                # level sources: maps modelled in blender, a folder each, to build levels from (ignored by git, apart from the included ones listed in level_src/README.md)
├── controls.example.cfg     # default key bindings, which the launcher creates controls.cfg from
├── settings.example.cfg     # default settings, which the launcher creates settings.cfg from
├── Makefile                 # project makefile
├── rebuild.bat              # windows rebuild script (runs make in MSYS2 MINGW32)
└── README.md                # project overview and documentation links
```
