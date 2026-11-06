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

Each object also has `at`, where it is in Blender, and can have `raise`, how far above that it is. The [level editor](../doc/custom_levels.md#2-place-objects-in-the-level-editor) writes all of these for you. Custom levels are built from Jungle Rollers, which has every kind of box, and its plant and rolling stone. Other enemies are taken from the level they're in, such as the crab from N. Sanity Beach, so the game's files for that level have to be in `streams/` too.

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
- `rolling_stone`: a stone wheel that comes with Jungle Rollers' stone track, set on the floor at `at`, and rolls back and forth along it, across the map: at right angles to the way the spawn's arrow points. The track is about 14 m long (at scale 400), and its middle, where the stone dips lowest, stands a box's height over the floor at `at`, so Crash has to jump up into it. Put it somewhere flat and wide enough.
- `crab`: N. Sanity Beach's crab, which walks back and forth along its `path`: unless you give it one, a straight line 4 m long (at scale 400) with its middle at `at`, across the map like the rolling stone. It always faces the camera, walking sideways, forwards or backwards. Crash dies if it walks into him; spun, it's flung away.
- `turtle`: N. Sanity Beach's turtle, which walks back and forth along its `path`: unless you give it one, a straight line 5 m long (at scale 400) with its middle at `at`, along the route (the way the camera faces). It turns to face the way it walks. Jumping on it bounces Crash off and turns it onto its back, where he can stand on it; spun, it's knocked away. It shares its textures with the crab, so a level with both takes no more room for textures than one with crabs.

A crab's or turtle's `path` is the nodes it walks through, in order, there and back, starting at the first: `"path": [[x, y, z], ...]`, 2 to 20 of them, each in metres from where the enemy stands (`at`, raised by `raise`), so the path moves with it. In the game its points are spaced as N. Sanity Beach's are, which keeps it walking at its own speed, however far apart the nodes are. It walks straight through walls and off edges, so keep its path on clear floor; the level editor warns about a path that isn't.

A crab's or turtle's `speed` is how many times the game's own pace it walks at, 0.25 to 3 (1 without one). It's the same all along its path, wherever the nodes are. Its legs don't move any faster, so a fast one looks like it's sliding.
