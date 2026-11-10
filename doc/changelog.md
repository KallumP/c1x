# Changelog

## 2026-11-10

### Added

- smoother play at up to 240 frames a second (60 by default), set in the launcher; the game still plays exactly as at 30
- an option to show the frame rate in the top right corner
- an option to show how many spins Crash has left, and when the next comes back, in the top right corner

### Changed

- the level editor's enemy paths start with 2 nodes

### Fixed

- Crash starting the game with few or no spins when booting straight into a level

## 2026-11-09

### Added

- custom levels can have more enemies from the original game
- custom levels can set how often bats come
- the acid cave cut from the original game, playable as a custom level, and going on past where it was cut off: a crystal geode, a mushroom grotto, a river gorge and a collapsed temple
- custom level maps keep their UVs and vertex colours

## 2026-11-08

### Added

- custom levels can have more enemies from the original game
- custom levels play Jungle Rollers' music
- custom levels can set how far the camera is from Crash, and how far above him it looks down from

### Changed

- the level editor's enemy paths start with 3 nodes, and nodes under the ground can be grabbed
- the level editor's Boot button builds the level first, and a bar shows while it saves, builds and boots
- the level editor draws the spawn as Crash and the end as a warp pad
- the level editor's palette picks a kind (box, enemy) and then its type

### Fixed

- objects in the level editor jumping to the pointer as you start dragging them
- boxes losing their textures in a custom level with several kinds of enemy from other levels
- Aku Aku's song not playing in custom levels when Crash has three masks

## 2026-11-06

### Added

- custom levels can have more enemies from the original game
- the level editor draws plants, crabs and turtles as themselves instead of a cone and a block
- enemies walk paths you set in the level editor, and the editor warns about a path that leaves the floor or runs through a wall

### Fixed

- all sound and music playing far too quietly
- some music instruments, such as Native Fortress's gong, playing too loudly
- soft music notes playing far quieter than on the PS1

## 2026-11-05

### Added

- custom levels can have enemies

### Fixed

- `sunset_canyon`'s skinniest cacti, now as thick as the others
- a spun plant in a custom level breaking every box in a long row behind it; it now only breaks boxes within about 3 m of where it stood
- the game freezing when a plant ate Crash: when it found no free spot to move Crash to, it searched for one forever
- the lab intro (shown when the title is left idle) playing all its voice lines at once and cutting the longer ones short; they now play in turn, in full
- the lab intro running about a fifth too fast; it now runs at the pace the PS1 managed (24 fps), taking 45 s as there

## 2026-11-04

### Fixed

- sounds far ahead of or behind the camera sometimes playing at full volume, such as a custom level's end warp pad heard from 70 m away

## 2026-11-03

### Added

- a launcher (`build/launcher.exe`, built with the game) for checking and extracting the game's files, changing the settings and controls, starting the game, and opening the level editor; see [Launcher](launcher.md)
- the level editor sets a level's turn and scale, shows which way the camera faces from the spawn, and F5 builds the level and boots into it, saying what it's doing as it goes; Shift gives finer steps for x, y and z
- textures can be TIFF images, as well as PNG and JPEG
- custom levels can have every box the game has: TNT, enemy TNT, iron arrow and iron outline as well
- the level editor sets a level's sky: its top and bottom colours, and where they split
- a third level source, `sunset_canyon`: a long desert canyon with an oasis, a chasm, a slot canyon, quicksand and hoodoos, and a full level's worth of boxes

### Changed

- custom levels are built from Jungle Rollers, which has every box, instead of N. Sanity Beach
- building levels and extracting the game's files need only Node, not Python (`npm run build-level`, `npm run extract-streams`)

### Removed

- `mossy_creek`'s generator (`make_map.py`); it's now edited like any other level source

### Fixed

- custom levels: polygons drawn untextured grey, invisible walls along banks and low edges, the end warp pad not working off the floor, and stray rock slabs and a spike in `mossy_creek`
- custom levels: the camera jumping up or down and settling back where the ground under its path changes height but Crash's doesn't, such as at ledges and rocks off to the side; it now keeps to the height of the floor Crash is on
- the level editor: dragging a box lagging on big levels, as every move rechecked every box against every face of the map

## 2026-10-30

### Added

- custom levels: maps modelled in Blender, built into playable levels with a spawn, an end and boxes; see [Custom levels](custom_levels.md)
- a level editor (`npm run dev` in `tools/level_editor`) for placing a level's spawn, end and boxes on its map in 3D
- two level sources to try custom levels with, `tide_ruins` and `mossy_creek`
- `boot_level` setting to start straight in a built level
- `fix_model_draw_order` setting (default off), so a model can't be drawn over one in front of it
- every run records its inputs to `build/recorded_inputs/` for reproducing bugs, and `replay_inputs` plays the newest one back

### Fixed

- custom levels: boxes showing through walls, objects floating past the end of the terrain, switch boxes not working, and the wrong box count at the end
- bug fixes ported from upstream (wurlyfox/c1, most from mateusfavarin/c1), such as TNT boxes falling through the floor and Pinstripe's bullets missing Crash
- loud, distorted sound after a volume fade
- terrain flashing across the screen when the camera passes close to it
- a crash with more than 28 boxes and other solid objects loaded at once
- landing on the warp pad skipping Crash's win animation
- the gem showing small in the top left of the level end screen before flying in

## 2026-10-28

### Added

- Windows builds, using MSYS2; see [Building](building.md)
- `streams/` can be next to the executable or one folder above it, so the game can start from any folder
- an error naming the missing file when a game file can't be opened
- key bindings in `controls.cfg`, with several keys per button and Shift, Ctrl and Alt usable; see [Controls](controls.md)
- game settings in `settings.cfg`: the loading screen, a speed display and skipping the splash screens; see [Settings](settings.md)
- a script to extract the game's files from a disc image
- unit tests (`make test`)

### Fixed

- the build failing with GCC 15 or newer
- a crash loading the music in 32-bit builds with FluidSynth 2.2 or newer
- no music on Windows
- game files read wrongly on Windows
- the README's controls list not matching the real keys
- the game freezing while the in-game GUI shows the object tree
- the level loading screen never appearing
- Crash drawn behind crates he's in front of, especially while jumping

## 2022-12-28

### Fixed

- object shading inaccuracy
- press X icon at level win is scaled incorrectly
- hot pipe shading intensity appears to be inverted
- sound dies after collecting 3 aku aku and any level transitions thereafter cause the game to crash 
- map controls do not work
- (partial) attempting to enter any title state other than the map from the main menu ultimately results in the game entering an infinite loop and/or crashing
- issue with singular/plural text
- Papu Papu: staff does no damage to Crash
- Hog Wild: works fine up until a certain point in the level where it is not possible to veer away from the camera path

## 2022-12-27

### Fixed

- aku aku sparkle fragments do not appear
- aku aku mask does not appear/invincibility is not completely effective
- wumpa fruit is collected in 'groups' of 3 (and then 1 for a total of 10) instead of 1 at a time when the [top of the] player hits the bottom face of a bouncy wumpa fruit box after being launched upwards from an bounceable object
- returning from a bonus round brings you back to the map instead of a level
- Jungle Rollers: camera is not positioned correctly at the beginning of the level
- The Great Gate: camera does not adjust quickly enough when moving upward
- The Great Gate: bounceable fire pit never transitions to flame state

## 2022-12-26

### Fixed

- broken sfx code
- broken music/midi player code
- myriad of issues related to audio
- no initialization of gool globals at game init
- transparency/blending behavior is incorrect for some objects

### Added

- custom audio sampler and mixer implementation

### Removed

- SDL mixer dependency

### Other

- Sound effects and music are now working. Volume levels may not be completely accurate to the original game, however. Expect a fix for this in future updates.

## 2022-12-19

### Fixed

- flickering colors during intro sequence
- rot matrix calc errors
- some text does not render
- issues preventing level transitions
- more ripple shader inaccuracies
- fog shader inaccuracies
- lightning shader inaccuracies
- dark shader inaccuracies
- background color not visible in levels that have one
- animated textures do not animate
- some objects randomly respawn
- some object collisions do not register (namely collisions with wumpa fruit)
- some objects appear to not complete their paths
- pausing the game does not work correctly
- beach does not display in N. Sanity Beach
- boot level is N. Sanity Beach instead of title

### Added

- top and bottom screen borders present in original
- toggleable render of object bounds (press <key>q</key> to toggle)
- issue tracking document

### Removed

- patches code (no longer used)

## 2022-12-13

### Fixed

- (most) transparency has not been implemented
- (most) semi-transparency/blending behavior is inaccurate
- incorrect starting location for pickups when moving to hud

## 2022-12-12

### Fixed

- textures should not use anti-aliasing
- (partial) object phong shading is inaccurate
- (partial) transparency has not been implemented
- screen does not fade out/in after death/before respawn
- player does not inherit zone brightness levels
- (some) gool issues
- timing issue with gool animations
- no deceleration of player when jumping
- (partial) it is sometimes possible to jump in mid-air when beside walls
- auto-cam transition takes multiple button presses to skip
- (many) solidity check/collision issues
- ripple shader inaccuracies
- text is not rendered at the correct locations

### Removed

- vertex buffer based draw code
- gl extensions dependency

### Added

- immediate mode based draw code
- toggleable render of wall bitmap image (press <key>d</key> to toggle)

## 2022-12-7

### Fixed

- path traversing objects are not oriented correctly
- display list ordering of objects is incorrect
- object geometry outside of viewing frustum is not rejected as it should be

## 2022-11-24

### Fixed

- (some) solidity check/collision issues
- wumpa fruit and other icon-based sprites are at incorrect scale
- (partial) HUD fails to render
- camera lags behind player
- camera path selection at divergences is incorrect
- infinite loop in `GoolObjectSearchTree`
- segfault on exit

### Added

- changelog (this file)
- in-game GUI re-write using [c]imgui as backend (press <key>esc</key> to toggle)
  - GOOL object code debugger
- toggleable render of zone octree query results (press <key>a</key> to toggle)

### Removed

- old in-game GUI implementation
- freetype dependency

### Other

Audio SFX are still disabled by default as they are not working 100% correctly, however they can now be enabled with compilation flag `-DCFLAGS_SFX_FLUIDSYNTH`.
