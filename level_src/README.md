# Level sources

The sources that [custom levels](../doc/custom_levels.md) are built from in the level editor, one folder each: a map modelled in Blender, as its `.obj`, `.mtl` and images, a `level.cfg` with its `turn`, `scale` and sky (`sky_top`, `sky_bottom` and `sky_split`) if they aren't the defaults, and an `objects.json` placing objects in it, if it has any (see [Objects](#objects)). The editor writes `level.cfg` and `objects.json`. The built level goes to `build/levels/<name>`.

Some level sources are included in the repository, made for c1x, listed below. Open one in the level editor, then click **Build** and **Boot** (or press F5). The rest of `level_src/` is ignored by git, so sources you add stay local.

| Source | Origin |
|---|---|
| `tide_ruins/` | Made for c1x, with procedural textures. |
| `mossy_creek/` | Made for c1x, with procedural textures: a more organic map, its shores and ledges curves rather than straight lines. |
| `sunset_canyon/` | Made for c1x in Blender (its `.blend` is included), with procedural textures: a long, winding desert canyon at sunset, about twice mossy creek's length, with boxes laid out as in the game's own levels. |

## Objects

An object in `objects.json` has a `kind`:

- `spawn`: where Crash starts (one at most)
- `end`: the warp pad that ends the level (one at most)
- `box`: a box, by its `type` (see [Boxes](#boxes)); `stack` makes a stack of them
- `enemy`: an enemy, by its `type` (see [Enemies](#enemies))

Each object also has `at`, where it is in Blender, and can have `raise`, how far above that it is. The [level editor](../doc/custom_levels.md#2-place-objects-in-the-level-editor) writes all of these for you. Custom levels are built from Jungle Rollers, which has every kind of box, and its plant, rolling stone and badger. Other enemies are taken from the level they're in, such as the crab from N. Sanity Beach, so the game's files for that level have to be in `streams/` too.

### Boxes

- `basic`
- `question`
- `life`
- `aku_aku`
- `checkpoint`
- `arrow`
- `slatted`
- `iron`
- `switch`
- `outline`: filled in as a crate by a switch
- `tnt`
- `enemy_tnt`: a TNT for an enemy to be knocked into
- `iron_arrow`: an iron box that bounces Crash
- `iron_outline`: filled in as an iron box by a switch

### Enemies

- `plant`: a biting plant that bites Crash if he walks into it, and stays where it is. Spun, it's flung straight back, away from the camera, and breaks the boxes it passes within about 3 m of where it stood (at scale 400); boxes further back are safe.
- `rolling_stone`: a stone wheel that comes with Jungle Rollers' stone track, set on the floor at `at`, and rolls back and forth along it, across the map: at right angles to the way the spawn's arrow points. The track is about 14 m long (at scale 400), and its middle, where the stone dips lowest, stands a box's height over the floor at `at`, so Crash has to jump up into it. Put it somewhere flat and wide enough. `"start"` is how far along its track it starts, from 0 (its first end, the default) to 1 (its far end), and `"reverse": true` makes it roll back towards its first end first, rather than on.
- `crab`: N. Sanity Beach's crab, which walks back and forth along its `path`: unless you give it one, a straight line 4 m long (at scale 400) with its middle at `at`, across the map like the rolling stone. It always faces the camera, walking sideways, forwards or backwards. Crash dies if it walks into him; spun, it's flung away.
- `turtle`: N. Sanity Beach's turtle, which walks back and forth along its `path`: unless you give it one, a straight line 5 m long (at scale 400) with its middle at `at`, along the route (the way the camera faces). It turns to face the way it walks. Jumping on it bounces Crash off and turns it onto its back, where he can stand on it; spun, it's knocked away. It shares its textures with the crab, so a level with both takes no more room for textures than one with crabs.
- `native`: The Great Gate's native with a shield, which stands guard on its `path`: unless you give it one, a straight line about 5 m long (at scale 400) with its middle at `at`, across the map like the crab. It starts at its path's first node. When Crash comes within about 6 m it walks along its path to stay in front of him, shield first, and when he leaves it goes back to its first node. Walking into its shield pushes Crash back along its path, whichever way that runs, and jumping on it bounces him off the shield it holds up; a spin from the front does nothing. Get round it and spin it from the side or behind. Its model has no textures, so it takes no room for them. Put its path across Crash's way, like The Great Gate's natives, or along it, so it can block him.
- `badger`: Jungle Rollers' badgers (skunks), which run along their `path` once, from its first node to its last, and dive into the ground there: unless you give them one, a straight line 13 m long (at scale 400) with its middle at `at`, along the route back towards the spawn, so they run at Crash. When Crash comes within about 8 m of the path's first node, `count` of them (1 to 6, 2 by default) pop out of the ground there, one after the other, and run along it, turning towards him; while he stays near, more follow. Crash dies if one runs into him; spun, it's knocked away. They're Jungle Rollers' own, so they take no room for textures.

- `warthog`: Road to Nowhere's warthog, which waits at its `path`'s first node until Crash comes within about 10 m, then charges back and forth along it, edging sideways towards him (up to about 2 m off its path). Unless you give it one, its path is a straight line 13 m long (at scale 400) with its middle at `at`, along the route (the way the camera faces). Its sideways charge is across the map, so keep its path along the route, as Road to Nowhere's are. Crash dies if it runs into him, and a spin doesn't stop it: jump over it.

- `spider`: Fumbling in the Dark's spider, which hangs on its thread about 4 m above `at` (at scale 400), drops to the floor there, climbs back up, and drops again, over and over, turning slowly as it hangs. Crash dies if he walks into it; spun, it's knocked away. Put it over the route, where Crash has to time his way under it.
- `walking_spider`: Fumbling in the Dark's walking spiders, which work like badgers: they run along their `path` once, from its first node to its last, and go down out of sight there. Unless you give them one, their path is a straight line 8 m long (at scale 400) with its middle at `at`, along the route back towards the spawn, so they run at Crash. When he comes near the path's first node, `count` of them (1 to 6, 1 by default) come out there, one after the other; while he stays near, more follow. Crash dies if one runs into him; spun, it's knocked away. Both spiders come from Fumbling in the Dark, so its files need to be in `streams/`.

A crab's, turtle's, native's or warthog's `path` is the nodes it walks through, in order, there and back, starting at the first (badgers and walking spiders run it once, first to last): `"path": [[x, y, z], ...]`, 2 to 20 of them, each in metres from where the enemy stands (`at`, raised by `raise`), so the path moves with it. In the game its points are spaced as its own level's are, which keeps it walking at its own speed, however far apart the nodes are. It walks straight through walls and off edges, so keep its path on clear floor; the level editor warns about a path that isn't.

A crab's, turtle's, native's, badger's, warthog's or walking spider's `speed` is how many times the game's own pace it walks at, 0.25 to 3 (1 by default). It's the same all along its path, wherever the nodes are. Its legs don't move any faster, so a fast one looks like it's sliding.
