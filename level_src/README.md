# Level sources

The sources that [custom levels](../doc/custom_levels.md) are built from in the level editor, one folder each: a map modelled in Blender, as its `.obj`, `.mtl` and images, a `level.cfg` with its `turn` and `scale` if they aren't the defaults, and an `objects.json` placing objects in it, if it has any (see [Objects](#objects)). The editor writes `level.cfg` and `objects.json`. The built level goes to `build/levels/<name>`.

Some level sources are included in the repository, made for c1x, listed below. Open one in the level editor, then click **Build** and **Boot** (or press F5). The rest of `level_src/` is ignored by git, so sources you add stay local.

| Source | Origin |
|---|---|
| `tide_ruins/` | Made for c1x, with procedural textures. |
| `mossy_creek/` | Made for c1x, with procedural textures: a more organic map, its shores and ledges curves rather than straight lines. |

## Objects

An object in `objects.json` has a `kind`:

- `spawn`: where Crash starts (one at most)
- `end`: the warp pad that ends the level (one at most)
- `box`: a box, by its `type`; `stack` makes a stack of them. The types are `basic`, `question`, `life`, `aku_aku`, `checkpoint`, `arrow`, `slatted`, `iron`, `switch`, `outline` (filled in as a crate by a switch), `tnt`, `enemy_tnt` (a TNT for an enemy to be knocked into), `iron_arrow` (an iron box that bounces Crash) and `iron_outline` (filled in as an iron box by a switch)

Each object also has `at`, where it is in Blender, and can have `raise`, how far above that it is. The [level editor](../doc/custom_levels.md#2-place-objects-in-the-level-editor) writes all of these for you. Custom levels are built from Jungle Rollers, which has every kind of box.
