# Level sources

The sources that [custom levels](../doc/custom_levels.md) are built from in the level editor, one folder each: a map modelled in Blender, as its `.obj`, `.mtl` and images, a `level.cfg` with its `turn`, `scale`, sky (`sky_top`, `sky_bottom` and `sky_split`) and camera (`camera_distance`, 0.5 to 3 times its usual distance from Crash, and `camera_angle`, 10 to 80 degrees above him, 42 usual) and `music` (one of the game's songs, by the first level it plays in, such as `the_lost_city`; `jungle_rollers` usual; or an `.mp3`, `.ogg`, `.flac` or `.wav` in the folder, by its file name) if they aren't the defaults, and an `objects.json` placing objects in it, if it has any (see [Objects](#objects)). The editor writes `level.cfg` and `objects.json`. The built level goes to `build/levels/<name>`.

Some level sources are included in the repository, made for c1x, listed below. Open one in the level editor, then click **Build** and **Boot** (or press F5). The rest of `level_src/` is ignored by git, so sources you add stay local.

| Source | Origin |
|---|---|
| `1_tide_ruins/` | Made for c1x, with procedural textures. |
| `2_mossy_creek/` | Made for c1x, with procedural textures: a more organic map, its shores and ledges curves rather than straight lines. Its song, `Dragon Roost Island.mp3`, is by [TV on Guitar](https://youtu.be/zPI_3XOZoUk). |
| `3_sunset_canyon/` | Made for c1x in Blender (its `.blend` is included), with procedural textures: a long, winding desert canyon at sunset, about twice mossy creek's length, with boxes laid out as in the game's own levels. Its song, `Gerudo Valley Played.mp3`, is by [LucasGitanoFamily](https://www.youtube.com/watch?v=CPUKGFVrQvE). |
| `4_acid_cave/` | The acid cave cut from the original game (its files are in `streams/s0000004`), exported with `npm run export-cut-level` (in `tools/level_editor`) through Blender (its `.blend` is included): its own models, textures and lighting, its boxes, the acid killing Crash, and fixed pads in place of its platforms over the acid. Past where the cut level ends, it goes on, reimagined in its style by `scripts/blender/extend_acid_cave.py`: a drop into a crystal geode, a fungal grotto of giant mushrooms over an acid marsh, and a river gorge crossed on a rock arch and boulders, then a collapsed temple swallowed by the rock (a tiki hall between acid channels, a crystal cavern of stepping stones, and acid falls down to a round end chamber). |

## Objects

An object in `objects.json` has a `kind`:

- `spawn`: where Crash starts (one at most)
- `end`: the warp pad that ends the level (one at most)
- `box`: a box, by its `type` (see [Boxes](#boxes)); `stack` makes a stack of them
- `enemy`: an enemy, by its `type` (see [Enemies](#enemies))
- `obstacle`: a part of the level with a mind of its own, by its `type` (see [Obstacles](#obstacles)): something Crash rides, like a lily pad, or has to get past

Each object also has `at`, where it is in Blender. The [level editor](../doc/custom_levels.md#2-place-objects-in-the-level-editor) writes all of these, and the settings below, for you.

### Settings many objects share

What each enemy and obstacle takes is listed in its entry below; this is what those settings mean. Distances in the entries are at scale 400 (a level's `scale` in `level.cfg`), so they grow and shrink with it.

- **Where it comes from.** Custom levels are built from Jungle Rollers, which has every kind of box, and its plant, rolling stone and badgers. Every other enemy and obstacle is taken from a level of the original game, named in its entry, so that level's files (`streams/s00000xx.nsd` and `.nsf`) have to be in `streams/`. Many also take room for more texture pages, of the 16 the game holds at once: the build says when a level has too many.
- **`raise`**: how far above `at` it is, in metres. Objects that ride or float are raised over the floor; the editor starts some already raised.
- **`path`**: the nodes it moves through, `"path": [[x, y, z], ...]`, 2 to 20 of them, each in metres from where it stands (`at`, raised by `raise`), so the path moves with it. Enemies walk it there and back from its first node (those that come out of the ground, like badgers, run it once, first to last); obstacles go along it and back, easing at each end. Without one, it has the default path its entry gives. Its points are spaced as its own level's, so it moves at its own pace however far apart the nodes are. Things on paths go straight through walls and off edges (except where an entry says it flies), so keep paths on clear floor: the level editor warns about one that isn't. A bat roost, leader bats and a lab assistant have one node instead, where their bats fly to or their vials land.
- **`speed`**: for an enemy on a path, how many times the game's own pace it walks at, 0.25 to 3 (1 by default), the same all along its path; its legs don't move any faster, so a fast one looks like it's sliding. For an obstacle on a path, how fast it goes in metres a second, 0.25 to 6, whatever its path's length (its default is in its entry).
- **`every`** and **`offset`**: for an obstacle on a timer, the seconds between its pushes, flames, slams or turns (2 to 20; its default is in its entry), and the seconds they're put off by (0 to 20, 0 by default). Without an offset every one of a kind goes at once: give a row of them offsets of 0, 2 and 4 so they go one after another, or two of them 0 and 3 so they take turns.
- **`reverse`**: `"reverse": true` sends it the other way: round, across or back, as its entry says.
- **`count`** and **`delay`**: for enemies that come out in numbers, how many come out at once (1 to 6), and for bats, the seconds between flocks (1 to 20).

### Boxes

- `basic`
- `question`
- `life`
- `aku_aku`
- `checkpoint`
- `arrow`
- `slatted`
- `iron`
- `switch`: `"switch"` is its number (1 or more), different for each switch in the level
- `tnt`
- `iron_arrow`: an iron box that bounces Crash

Any box can be an outline: `"outline"` is the number of the switch that fills it in. The game only has outlines of `basic` and `iron` boxes, so an outline of any other type is hidden until its switch is hit, as on Road to Nowhere. A switch can be an outline of another switch: it appears when that switch is hit, and fills in its own outlines when it's hit itself. A switch can fill in only one other switch, and switches can't be outlines of each other in a loop.

### Enemies

- `plant` (Jungle Rollers): spun, it breaks the boxes within about 3 m behind where it stood, away from the camera.
- `snake` (Temple Ruins; one texture page): comes up out of the floor at `at` (Temple Ruins' pot is part of its map: model one round it if you want it).
- `gunman` (Cortex Power; one texture page): `"range"` is how near Crash comes, in metres, before he shoots (2 to 40, 16 by default); he stops once Crash is about 5 m past him, and his shots stop at walls.
- `blue_river_plant`, `green_river_plant` (Up the Creek; three texture pages, shared with its fish, lily pads and leaves): stays at `at`; it needs no water.
- `crab` (N. Sanity Beach): default path 4 m across the map, its middle at `at`.
- `turtle` (N. Sanity Beach; shares the crab's textures): default path 5 m along the route, its middle at `at`.
- `native` (The Great Gate; no textures): default path about 5 m across the map, its middle at `at`. It guards its path and goes back to its first node, so put the path across or along Crash's way.
- `badger` (Jungle Rollers): runs its path once, at Crash; default path 13 m along the route back towards the spawn, its middle at `at`. `count` 2 by default; they come out once Crash is within about 8 m of the first node.
- `warthog` (Road to Nowhere): default path 13 m along the route, its middle at `at`. It charges once Crash is within about 10 m of its first node and edges up to 2 m sideways, across the map, so keep its path along the route.
- `spider` (Fumbling in the Dark): drops from about 4 m above `at` to the floor at `at`.
- `fish` (Up the Creek): leaps from `at` 4 m across the map and back, about 5 m high; `reverse` leaps the other way. It needs no water.
- `lab_assistant` (Stormy Ascent; no textures): its one node is where its vials land (default about 4.7 m across the map, the other way from a rolling stone). A vial lands on its node at the spot's height; higher or lower ground in the way stops it short.
- `walking_spider` (Fumbling in the Dark): runs its path once, like badgers; default path 8 m along the route back towards the spawn, its middle at `at`. `count` 1 by default.
- `bat` (code from Sunset Vista; two texture pages for bats of either kind): `at` is an invisible roost. Its one node is where the bats fly to (default 25 m along the route back towards the spawn). `count` 4 and `delay` 10 by default. The swoop dips about 3.3 m, so raise the roost about 5 m over Crash's floor (the editor starts new ones that high); the roost waits for Crash along the route, wherever its node is, and bats fly through walls.
- `leader_bats` (Sunset Vista): the first leader at `at`, the second at its one node (default 15 m across the map, the other way from a rolling stone). `count` 5 and `delay` 4.5 by default. Raise the first about 1.5 m over Crash's floor (the editor starts new ones that high) and put the second at his height too, for him to spin them.
- `monkey` (The Great Gate; no textures): default path 6 m across the map, its middle at `at`; it starts at its first node.
- `lizard` (The Lost City; one texture page, shared by its lizards): default path 8 m across the map, its middle at `at`, its points 4 m apart. Its `speed` spaces its points, so a fast one leaps further each time.
- `red_lizard` (The Lost City): default path 12 m across the map, its middle at `at`, its points 2 m apart; `speed` as a lizard's.
- `walking_lizard` (The Lost City): default path 2 m across the map, its middle at `at`.
- `robot_dog` (Heavy Machinery; one texture page): default path 4 m along the route, its middle at `at`.
- `barrel_roller` (Toxic Waste; one texture page): stands at his path's first node and rolls barrels down it; default path 12 m along the route back towards the spawn, its middle at `at` (so he stands 6 m beyond it). Give him a path down the route at Crash.
- `camera_robot` (Castle Machinery; one texture page, the gunman's too): default path 3 m straight up from `at`. It flies, so its path can go anywhere; it's only drawn red if it runs through a wall.
- `bird` (Slippery Climb; one texture page): default path 3 m straight up from `at`; it flies, as the camera robot does. Its wings reach about 2 m.
- `electric_scientist` (The Lab; one texture page): walks to the end of his path nearest Crash; default path 12 m along the route back towards the spawn, its middle at `at`. He can share a level with the lab assistant and the robot dog.
- `blob` (The Lab; one texture page): comes out at its path's first node once Crash is 8 to 14 m from it and hasn't reached it, so give it a path down the route at him; default path 13 m along the route back towards the spawn, its middle at `at`.
- `flying_camera` (Heavy Machinery, as the robot dog; one texture page, the robot dog's too): `at` is its middle. Default path 3 m straight up; it flies, as the camera robot does.

### Obstacles

Each one's name in the level editor's palette is in brackets.

- `lily_pad` (Up the Creek; three texture pages, shared with its river plants and fish): sinks 1 m below `at` with Crash on it, so raise it over a gap or drop; on the floor it sinks into it. It needs no water.
- `leaf` (Up the Creek, as the lily pad): default path Up the Creek's, about 6 m back towards the spawn. Its path takes as long as Up the Creek's, so a longer one is faster, and every leaf drifts in step. Raise it over a gap: Crash rides it only landing from above.
- `wooden_peg` ("Wood platform (spinnable)"; The Great Gate; three texture pages): flips out about 2.8 m towards the camera from `at`; it needs no wall behind it. Raise it to where Crash should step up to.
- `rolling_stone` (Jungle Rollers): comes with its track, about 14 m across the map (at right angles to the spawn's arrow), its middle a box's height over the floor at `at`, so put it somewhere flat and wide enough. `"start"` is how far along its track it starts (0 to 1, 0 by default); `reverse` rolls it back towards its first end first.
- `mossy_slide` (The Great Gate): invisible, only its slide, so model the slope in Blender where the editor draws it. It starts at `at` (its top end) and runs `"length"` metres (2 to 20, 4 by default) down at `"angle"` degrees (5 to 30, 14 by default), across the map turned `"rotation"` degrees anticlockwise from above (0 to 359, 0 by default; 90 is the spawn's arrow's way). It slides Crash on any floor within about 0.8 m of its line, so keep other floors away.
- `rising_spiked_log` ("Spiked log (rising)"; The Great Gate, with the wood platform's texture pages): `at` is the floor it pushes up out of, about 4 m. `every` 6 by default.
- `falling_spiked_log` ("Spiked log (falling)"; as the rising one): `at` is the floor it comes down on, from about 4 m above: keep that space clear. `every` 6 by default.
- `fire_pit` (The Great Gate, with the wood platform's texture pages): its bowl reaches about 2 m towards the camera from `at`. `every` 4 by default.
- `floor_fire` ("Fire (bursts from the floor)"; Sunset Vista): no model of its own (its hole is Sunset Vista's map), so put it on floor that suits it. `every` (the seconds between bursts) 2 by default, and `offset` as other timed obstacles'. Unlike Sunset Vista's, it bursts whether Crash is near or not.
- `steady_fire` ("Fire (always burning)"; Sunset Vista): the same fire, never dying down.
- `dropping_pillar` ("Pillar (drops)"; Boulder Dash; two texture pages): `at` is its top; it reaches about 6 m down. It doesn't come back.
- `sliding_pillar` ("Pillar (slides)"; as the dropping one): default path about 2 m across the map; `speed` 1 m/s by default.
- `tall_thin_gate` ("Gate (tall, thin)"; Boulder Dash; one texture page): stands on the floor at `at`, about 4 m tall and 2.3 m wide.
- `low_wide_gate` ("Gate (low, wide)"; as the tall one): stands on the floor at `at`, about 1 m tall and 6 m wide.
- `pushing_block` ("Block (pushes out)"; Sunset Vista; two texture pages): about 4 m tall, pushing about 5 m from `at` towards the camera. `every` 2 by default.
- `pushing_platform` ("Platform (interval, long)"; Sunset Vista; three texture pages, with the block's): its top is just under `at`, so raise it to where Crash should stand; it slides about 4.5 m towards the camera. `every` 2.5 by default.
- `short_pushing_platform` ("Platform (interval, short)"; as the long one): the same, its slab about 1 m out instead of 1.8 m.
- `rotating_pots`, `rotating_platforms` ("Pots (rotating)", "Platforms (rotating)"; Sunset Vista): go round an upright circle across the map, its middle at `at`. `"platforms"` is how many (1 to 7: 3 pots or 2 platforms by default) and `"radius"` how far out (1 to 10 m, 3.5 by default); `every` 6 by default a turn, and `reverse` sends them round the other way.
- `dropping_platform` ("Platform (retracts when stood on)"; Sunset Vista): sticks out 1 m towards the camera from `at`, as if from a wall. `"shake"` is the seconds it shakes before it drops (0.25 to 5, 0.75 by default) and `"down"` the seconds it stays dropped (0.5 to 10, 2 by default).
- `seesaw` ("Seesaw"; Sunset Vista): five blocks 0.8 m apart, about 4 m end to end, the middle one's top at `at`.
- `slamming_walls` ("Walls (slamming)"; Temple Ruins): its two halves (about 3 m across and 2.6 m tall each) stand either side of `at` and meet there; put them across Crash's way. `every` 3 by default.
- `rising_pillar` ("Pillar (rises)"; Temple Ruins; one texture page): `at` is its top at its lowest; it rises about 4 m, so put `at` level with the floor for it to rise out of it. `every` (a rise and fall) 4 by default.
- `carrying_platform` ("Platform (moves on touch)"; Temple Ruins): `at` is its top. Default path 6 m straight across the map; `speed` 1.5 m/s by default. It carries Crash through walls, so keep its path clear.
- `rotating_pegs` ("Pegs (rotating)"; Temple Ruins): go round a level circle about `at`, their tops raised by `raise`. `"radius"` 1 to 10 m (4 by default, to the nearest 400 game units), `"platforms"` 4, 5, 8 or 9 (5 by default; others go to the nearest of those, as the game has no more), `every` 20 by default a turn, and `reverse` the other way round.
- `bounce_pad` ("Bounce pad"; Castle Machinery): stands on `at`.
- `steam_vent` ("Steam vent"; Castle Machinery): no pipe of its own (Castle Machinery's are its map's), so put it on something that looks like one. `every` 3 by default.
- `moving_platform` ("Platform (moves along a path)"; Slippery Climb): `at` is its top. Default path 4 m straight across the map; `speed` 2 m/s by default.
- `lift_platform` ("Platform (lifts up and down)"; Slippery Climb): `at` is its top. Default path 3 m straight up; `speed` 2 m/s by default.
- `falling_platform` ("Platform (falls when stood on)"; The Lost City): about 1 m square, `at` its top.
- `timed_plank` ("Plank (breaks after a moment)"; Road to Nowhere): 1.2 m across, `at` its top. `"delay"` is the seconds it waits once Crash is first over its middle (1 to 20, 3 by default); near its ends it only dips.
- `breaking_plank` ("Plank (breaks at once)"; Road to Nowhere): the same size as a timed plank.
