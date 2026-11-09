# extends the acid cave (level_src/acid_cave/acid_cave.blend) past the cut
# level's end with new ground in its style, "reimagined": an organic middle
# (acid_cave_middle.py: a drop into a crystal geode, a fungal grotto, a river
# gorge), then a collapsed temple swallowed by the rock: a tiki hall between
# acid channels, a crystal cavern crossed on stepping stones, and acid falls
# stepping down to a round end chamber. it opens up the cut level's end into
# them, saves the .blend and exports the .obj and .mtl again. run headless:
#   blender --background level_src/acid_cave/acid_cave.blend --python extend_acid_cave.py
# running it again replaces what it made before (objects named ext_... and pit_ext...)
import math
import os
import sys

import bmesh
import bpy

sys.path.append(os.path.dirname(os.path.abspath(__file__)))  # its modules beside it
from acid_cave_pieces import *  # noqa: E402,F403 (the shared pieces: materials, lighting, shapes)
from acid_cave_middle import X_RANGE, middle_parts  # noqa: E402

TEMPLE_SHIFT = 85.0  # the temple, laid out from the cut level's end, moved along past the organic middle

EXTENSION = ("ext_", "pit_ext")
CUT_LEVEL_MESHES = ("k0_4W", "k1_4W", "k2_4W", "k3_4W", "k4_4W")


# the sections, along +y from the cut level's end

def corridor(parts):
    """from the cut level's end chamber, between rock, into the tiki hall"""
    light = lambda x, y, z: lit(path_light(x, y, -4, 2))
    floor(parts["path"], -6, 75, -2, 80, FLOOR, light)
    rock = lambda x, y, z: lit(wall_light(z, FLOOR, 6))
    wall(parts["green_rock"], (-6, 75), (-6, 80), FLOOR, 6, (1, 0, 0), rock)
    wall(parts["green_rock"], (-2, 75), (-2, 80), FLOOR, 6, (-1, 0, 0), rock)


def tiki_hall(parts):
    """a wide path between acid channels, carved green pillars standing in them"""
    near_acid = lambda x, y, z: lit(path_light(x, y, -4, 4), glow=max(0.0, (abs(x + 4) - 2.5) / 3))
    floor(parts["path"], -8, 80, 0, 102, FLOOR, near_acid)
    bank = lambda x, y, z: lit(70, glow=0.4)
    for x0, x1, inner, outwards in [(-11, -8, -8, -1), (0, 3, 0, 1)]:  # each channel, the path's edge beside it, and which way that faces
        acid(parts["acid"], x0, 80, x1, 102, ACID_LEVEL)
        wall(parts["dark_moss"], (inner, 80), (inner, 102), ACID_LEVEL - 0.2, FLOOR, (outwards, 0, 0), bank)
    rock = lambda x, y, z: lit(wall_light(z, ACID_LEVEL, 7), glow=low_glow(z, 1, 0.25))
    wall(parts["green_rock"], (-11, 80), (-11, 102), ACID_LEVEL - 0.2, 7, (1, 0, 0), rock)
    wall(parts["green_rock"], (3, 80), (3, 102), ACID_LEVEL - 0.2, 7, (-1, 0, 0), rock)
    wall(parts["green_rock"], (-11, 80), (-6, 80), ACID_LEVEL - 0.2, 7, (0, 1, 0), rock)
    wall(parts["green_rock"], (-2, 80), (3, 80), ACID_LEVEL - 0.2, 7, (0, 1, 0), rock)
    carved = lambda x, y, z: lit(wall_light(z, ACID_LEVEL, 5.5) + 15, glow=low_glow(z, 0.5, 0.3))
    tiki_hall_ruins(parts, carved)


# the tiki hall's pillars in their channels, some standing, some snapped off, some fallen in the acid
TIKI_PILLARS = [((-9.5, 84), "standing"), ((1.5, 84), "broken"), ((-9.5, 89), "fallen"), ((1.5, 89), "standing"),
                ((-9.5, 94), "broken"), ((1.5, 94), "fallen"), ((-9.5, 99), "standing"), ((1.5, 99), "broken")]
TIKI_HEADS = [((-10.0, 91.5), 1.3, 0.6, 0.5), ((1.8, 96.6), 1.2, -0.9, 0.45), ((-9.2, 101.0), 1.0, 2.2, 0.3)]


def towards_path(x):
    """which way across (+1 or -1) the tiki hall's path is from a channel at x"""
    if x < -4:
        return 1
    return -1


def tiki_hall_ruins(parts, carved):
    for index, ((x, y), state) in enumerate(TIKI_PILLARS):
        if state == "standing":
            prism(parts["tiki"], (x, y), 0.8, 8, ACID_LEVEL - 0.2, 5.0, carved, cap=parts["tiki_cap"])
        elif state == "broken":
            broken_pillar(parts["tiki"], parts["tiki_cap"], (x, y), 0.8, ACID_LEVEL - 0.2, 2.2 + 0.6 * (index % 3), carved, 50 + index)
        else:
            toppled_pillar(parts["tiki"], (x, y - 1.6), (x + 0.4 * towards_path(x), y + 2.6), 0.75, ACID_LEVEL + 0.15, carved)
    head_light = lambda x, y, z: lit(100, glow=0.4)
    for (x, y), size, turn, sink in TIKI_HEADS:
        tiki_head(parts["tiki_heads"], (x, y, ACID_LEVEL), size, turn, sink, head_light)


def crystal_cavern(parts):
    """an acid pool among crystals, crossed on stepping stones"""
    acid(parts["acid"], -13, 102, 5, 128, ACID_LEVEL)
    floor(parts["path"], -8, 102, 0, 104.5, FLOOR, lambda x, y, z: lit(path_light(x, y, -4, 4), glow=0.3))
    floor(parts["path"], -8, 125.5, 0, 128, FLOOR, lambda x, y, z: lit(path_light(x, y, -4, 4), glow=0.3))
    for edge, towards in [(104.5, 1), (125.5, -1)]:  # the ledges' edges over the pool, and which way they face
        wall(parts["dark_moss"], (-8, edge), (0, edge), ACID_LEVEL - 0.2, FLOOR, (0, towards, 0), lambda x, y, z: lit(70, glow=0.4))
    stone = lambda x, y, z: stone_light(z)
    for index, (x, y) in enumerate([(-4, 106.5), (-2.3, 109.2), (-4.2, 111.9), (-6, 114.6), (-4.1, 117.3), (-2.2, 120), (-4, 122.8)]):
        prism(parts["stones"], (x, y), 1.1, 6, ACID_LEVEL - 0.3, FLOOR, stone, cap=parts["stone_tops"])
    rock = lambda x, y, z: lit(wall_light(z, ACID_LEVEL, 8), glow=low_glow(z, 1, 0.3))
    wall(parts["purple_rock"], (-13, 102), (-13, 128), ACID_LEVEL - 0.2, 8, (1, 0, 0), rock)
    wall(parts["purple_rock"], (5, 102), (5, 128), ACID_LEVEL - 0.2, 8, (-1, 0, 0), rock)
    wall(parts["purple_rock"], (-13, 102), (-11, 102), ACID_LEVEL - 0.2, 8, (0, 1, 0), rock)
    wall(parts["purple_rock"], (3, 102), (5, 102), ACID_LEVEL - 0.2, 8, (0, 1, 0), rock)
    shine = lambda x, y, z: lit(150, glow=0.1)
    for (x, y, size, part) in [(-11, 106, 1.2, "crystals_purple"), (3.5, 108, 1.0, "crystals_green"), (-10.5, 115, 1.4, "crystals_purple"),
                               (3, 117, 1.3, "crystals_purple"), (-11.2, 123, 1.0, "crystals_green"), (3.8, 124, 1.2, "crystals_purple"),
                               (-8.5, 110.5, 0.7, "crystals_green"), (1, 113.5, 0.8, "crystals_purple")]:
        crystal_cluster(parts[part], (x, y), ACID_LEVEL, size, shine)


TERRACES = [(128, 132, FLOOR), (132, 136, FLOOR - 0.8), (136, 140, FLOOR - 1.6), (140, 144, FLOOR - 2.4)]
END_FLOOR = FLOOR - 2.4
END_CENTRE = (-4, 150)


def acid_falls(parts):
    """terraces stepping down between falls of acid"""
    for y0, y1, z in TERRACES:
        floor(parts["path"], -7, y0, -1, y1, z, lambda x, y, z: lit(path_light(x, y, -4, 3), glow=max(0.0, (abs(x + 4) - 1.5) / 2.5)))
        if z < FLOOR:
            wall(parts["dark_moss"], (-7, y0), (-1, y0), z, z + 0.8, (0, 1, 0), lambda x, y, z: lit(80, glow=0.3))
        for inner, outwards in [(-7, -1), (-1, 1)]:  # the terrace's edges over the falls, and which way they face
            wall(parts["dark_moss"], (inner, y0), (inner, y1), z - 1.5, z, (outwards, 0, 0), lambda x, y, z: lit(70, glow=0.5))
    for x0, x1 in [(-10, -7), (-1, 2)]:
        acid(parts["acid"], x0, 128, x1, 146, ACID_LEVEL, END_FLOOR - 1.2)
    rock = lambda x, y, z: lit(wall_light(z, END_FLOOR - 1.4, 7), glow=low_glow(z, 0, 0.3))
    wall(parts["green_rock_veined"], (-10, 128), (-10, 146), END_FLOOR - 1.4, 7, (1, 0, 0), rock)
    wall(parts["green_rock_veined"], (2, 128), (2, 146), END_FLOOR - 1.4, 7, (-1, 0, 0), rock)
    wall(parts["green_rock_veined"], (-13, 128), (-10, 128), ACID_LEVEL - 0.2, 8, (0, 1, 0), rock)
    wall(parts["green_rock_veined"], (2, 128), (5, 128), ACID_LEVEL - 0.2, 8, (0, 1, 0), rock)


def end_chamber(parts):
    """a round chamber of carved purple stone, the warp pad in its middle"""
    floor(parts["path"], -7, 144, -1, 146, END_FLOOR, lambda x, y, z: lit(100))
    points = ring(END_CENTRE, 6.5, 12)
    centre = (*END_CENTRE, END_FLOOR)
    glow = lambda x, y, z: lit(118 - 6 * math.hypot(x - END_CENTRE[0], y - END_CENTRE[1]))
    for (xa, ya), (xb, yb) in zip(points, points[1:] + points[:1]):
        parts["chamber_floor"].add([centre, (xa, ya, END_FLOOR), (xb, yb, END_FLOOR)], [glow(*centre), glow(xa, ya, 0), glow(xb, yb, 0)], UP)
    carved = lambda x, y, z: lit(wall_light(z, END_FLOOR, END_FLOOR + 7) + 10)
    for (xa, ya), (xb, yb) in zip(points, points[1:] + points[:1]):
        middle = ((xa + xb) / 2, (ya + yb) / 2)
        if middle[1] < 145.5 and abs(middle[0] - END_CENTRE[0]) < 3.5:
            continue  # the way in, from the terraces
        inward = (END_CENTRE[0] - middle[0], END_CENTRE[1] - middle[1], 0)
        wall(parts["chamber_walls"], (xa, ya), (xb, yb), END_FLOOR, END_FLOOR + 7, inward, carved)
    pillar = lambda x, y, z: lit(wall_light(z, END_FLOOR, END_FLOOR + 4.5) + 20)
    for index, (x, y) in enumerate(ring(END_CENTRE, 4.5, 6)):  # none straight in front of the way in: two stand either side of it
        if index % 2 == 0:
            prism(parts["tiki"], (x, y), 0.6, 8, END_FLOOR, END_FLOOR + 4.5, pillar, cap=parts["tiki_cap"])
        else:
            broken_pillar(parts["tiki"], parts["tiki_cap"], (x, y), 0.6, END_FLOOR, END_FLOOR + 2.0 + 0.5 * index, pillar, 70 + index)
    head_light = lambda x, y, z: lit(105)
    tiki_head(parts["tiki_heads"], (END_CENTRE[0] + 4.8, END_CENTRE[1] + 2.5, END_FLOOR), 1.4, 2.6, 0.35, head_light)


# the cut level's end, opened up

def open_cut_level_end():
    """removes the cut level's rock where the corridor goes through its end chamber's
    north side, and its leftover collision past there (an unfinished ramp)"""
    for name in CUT_LEVEL_MESHES + ("collision_floor",):
        obj = bpy.data.objects.get(name)
        if obj is None:
            continue
        mesh = bmesh.new()
        mesh.from_mesh(obj.data)
        is_floor_only = name == "collision_floor"
        doomed = [face for face in mesh.faces if blocks_the_way(face.calc_center_median(), is_floor_only)]
        bmesh.ops.delete(mesh, geom=doomed, context="FACES")
        mesh.to_mesh(obj.data)
        mesh.free()


def blocks_the_way(centre, is_floor_only):
    x, y, z = centre
    if is_floor_only:
        return X_RANGE[0] < x < X_RANGE[1] and y > 76.5
    if not -7.5 < x < 0.5:
        return False
    return y > 77 or (y > 75 and z > 0.7)


# all of it

PART_MATERIALS = {
    "path": (MOSS_PATH, False), "dark_moss": (DARK_MOSS, False), "green_rock": (GREEN_ROCK, False),
    "green_rock_veined": (GREEN_ROCK_VEINED, False), "purple_rock": (PURPLE_ROCK, False),
    "tiki": (TIKI_CARVED, True), "tiki_cap": (PURPLE_CARVED, True), "stones": (PURPLE_ROCK_BRIGHT, False),
    "stone_tops": (PURPLE_CARVED_DARK, True), "crystals_purple": (CRYSTAL_PURPLE, True),
    "crystals_green": (CRYSTAL_GREEN, True), "chamber_floor": (TIKI_CARVED_DARK, False),
    "chamber_walls": (PURPLE_CARVED, True), "acid": (ACID, False), "tiki_heads": (TIKI_FACE, True),
}

# how much each of the temple's parts is roughened: organic rock swallowing its square stone
ROUGHNESS = {"green_rock": 1.4, "green_rock_veined": 1.4, "purple_rock": 1.4, "chamber_walls": 0.6, "dark_moss": 0.3, "stones": 0.2}
FLOOR_UNEVENNESS = 0.06


def remove_earlier_extension():
    for obj in [obj for obj in bpy.data.objects if obj.name.startswith(EXTENSION)]:
        bpy.data.objects.remove(obj)


def object_name(part, section):
    if part == "acid":
        return f"pit_ext_{section}_acid"  # a pit (builder/collision.ts): it kills crash
    return f"ext_{section}_{part}"


def temple_parts():
    """the collapsed temple: the square sections, roughened where the rock has swallowed them, moved along past the middle"""
    parts = {part: Faces(material, keep_uvs) for part, (material, keep_uvs) in PART_MATERIALS.items()}
    for section in (corridor, tiki_hall, crystal_cavern, acid_falls, end_chamber):
        section(parts)
    for part, amount in ROUGHNESS.items():
        roughened(parts[part], amount, scale=2.2)
    roughened(parts["path"], FLOOR_UNEVENNESS, scale=1.2)
    for faces in parts.values():
        shifted(faces, TEMPLE_SHIFT)
    return parts


def main():
    remove_earlier_extension()
    open_cut_level_end()
    for section, parts in (("mid", middle_parts()), ("temple", temple_parts())):
        for part, faces in parts.items():
            if faces.faces:
                make_object(object_name(part, section), faces)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_mainfile()
    bpy.ops.wm.obj_export(
        filepath=os.path.splitext(bpy.data.filepath)[0] + ".obj", export_materials=True, export_colors=True,
        export_uv=True, export_normals=False, path_mode="STRIP",
    )


main()
