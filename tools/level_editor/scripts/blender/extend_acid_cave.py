# extends the acid cave (level_src/acid_cave/acid_cave.blend) past the cut
# level's end with new ground in its style, "reimagined": a tiki hall between
# acid channels, a crystal cavern crossed on stepping stones, and acid falls
# stepping down to a round end chamber. it opens up the cut level's end into
# them, saves the .blend and exports the .obj and .mtl again. run headless:
#   blender --background level_src/acid_cave/acid_cave.blend --python extend_acid_cave.py
# running it again replaces what it made before (objects named ext_... and pit_ext...)
import math
import os

import bmesh
import bpy

# the cave's materials (level_src/acid_cave), by what they look like
MOSS_PATH = "tex_077"
DARK_MOSS = "tex_006"
GREEN_ROCK = "tex_022"
GREEN_ROCK_VEINED = "tex_024"
TIKI_CARVED = "tex_043"
TIKI_CARVED_DARK = "tex_050"
PURPLE_ROCK = "tex_029"
PURPLE_ROCK_BRIGHT = "tex_030"
PURPLE_CARVED = "tex_038"
PURPLE_CARVED_DARK = "tex_098"
CRYSTAL_PURPLE = "tex_056"
CRYSTAL_GREEN = "tex_055"
ACID = "acid"

FLOOR = 0.3          # the path's height, level with the cut level's end chamber
ACID_LEVEL = -0.9    # the acid's surface, beside the paths
GRID = 2.0           # floors are made of squares this big, so their lighting varies
EXTENSION = ("ext_", "pit_ext")
CUT_LEVEL_MESHES = ("k0_4W", "k1_4W", "k2_4W", "k3_4W", "k4_4W")


# lighting: the game's vertex colours (128 leaves a texture as it is), dark as
# the cave's, brighter along the path, and green near the acid

def lit(base, glow=0.0):
    green = (base * (1 - glow) + 60 * glow, base * (1 - glow) + 150 * glow, base * (1 - glow) + 50 * glow)
    return tuple(min(255, max(0, round(channel))) for channel in green)


def low_glow(z, below, amount):
    """the acid's glow on what's lower than below"""
    if z < below:
        return amount
    return 0.0


def stone_light(z):
    """a stepping stone: its top lit, its sides in the acid's shadow"""
    if z > 0:
        return lit(95, glow=0.35)
    return lit(70, glow=0.35)


def path_light(x, y, centre_x, half_width):
    across = min(1.0, abs(x - centre_x) / max(half_width, 0.01))
    return 112 - 30 * across


def wall_light(z, bottom, top):
    up = (z - bottom) / max(top - bottom, 0.01)
    return 100 - 55 * min(1.0, max(0.0, up))


def linear_from_srgb(value):
    if value <= 0.04045:
        return value / 12.92
    return ((value + 0.055) / 1.055) ** 2.4


# meshes, face by face

class Faces:
    """a mesh's faces as it's made: corners, UVs and colours, each face turned
    to face its open side"""

    def __init__(self, material, keep_uvs=False):
        self.material = material
        self.keep_uvs = keep_uvs  # the whole image on each face; otherwise it repeats every 2.6 m in the game
        self.faces = []

    def add(self, corners, colours, towards):
        normal = face_normal(corners)
        if sum(n * t for n, t in zip(normal, towards)) < 0:
            corners, colours = corners[::-1], colours[::-1]
        self.faces.append((corners, colours))

    def quad(self, corners, colour_at, towards):
        self.add(corners, [colour_at(*corner) for corner in corners], towards)


def face_normal(corners):
    (ax, ay, az), (bx, by, bz), (cx, cy, cz) = corners[0], corners[1], corners[2]
    ux, uy, uz, vx, vy, vz = bx - ax, by - ay, bz - az, cx - ax, cy - ay, cz - az
    return (uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx)


def corner_uvs(count):
    """the whole image on a face: a quad's corners at the image's, a triangle's with its tip at the top"""
    if count == 4:
        return [(0, 0), (1, 0), (1, 1), (0, 1)]
    return [(0, 0), (1, 0), (0.5, 1)]


def make_object(name, faces):
    mesh = bpy.data.meshes.new(name)
    corners = [corner for face, _ in faces.faces for corner in face]
    polygons, at = [], 0
    for face, _ in faces.faces:
        polygons.append(tuple(range(at, at + len(face))))
        at += len(face)
    mesh.from_pydata(corners, [], polygons)
    colours = mesh.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    flat = [colour for _, face_colours in faces.faces for colour in face_colours]
    for index, colour in enumerate(flat):
        colours.data[index].color = (*(linear_from_srgb(channel / 255) for channel in colour), 1)
    if faces.keep_uvs:
        layer = mesh.uv_layers.new(name="UVMap")
        for polygon in mesh.polygons:
            for uv, loop in zip(corner_uvs(polygon.loop_total), polygon.loop_indices):
                layer.data[loop].uv = uv
    mesh.materials.append(bpy.data.materials[faces.material])
    mesh.validate()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)


# pieces

UP = (0, 0, 1)


def floor(faces, x0, y0, x1, y1, z, colour_at):
    """a flat floor from (x0, y0) to (x1, y1) at height z, in GRID squares, facing up"""
    xs = steps(x0, x1)
    ys = steps(y0, y1)
    for xa, xb in zip(xs, xs[1:]):
        for ya, yb in zip(ys, ys[1:]):
            faces.quad([(xa, ya, z), (xb, ya, z), (xb, yb, z), (xa, yb, z)], colour_at, UP)


def steps(start, end):
    count = max(1, math.ceil(abs(end - start) / GRID))
    return [start + (end - start) * index / count for index in range(count + 1)]


def wall(faces, a, b, bottom, top, towards, colour_at):
    """an upright wall along the ground from a to b, from bottom to top, facing towards"""
    (xa, ya), (xb, yb) = a, b
    along = steps(0.0, 1.0)
    heights = steps(bottom, top)
    for t0, t1 in zip(along, along[1:]):
        for z0, z1 in zip(heights, heights[1:]):
            p0 = (xa + (xb - xa) * t0, ya + (yb - ya) * t0)
            p1 = (xa + (xb - xa) * t1, ya + (yb - ya) * t1)
            faces.quad([(*p0, z0), (*p1, z0), (*p1, z1), (*p0, z1)], colour_at, towards)


def ring(centre, radius, sides, turn=0.0):
    cx, cy = centre
    return [(cx + radius * math.cos(turn + 2 * math.pi * side / sides), cy + radius * math.sin(turn + 2 * math.pi * side / sides)) for side in range(sides)]


def prism(faces, centre, radius, sides, bottom, top, colour_at, cap=None):
    """an upright prism (a pillar, a stepping stone): its sides facing out, its top (into cap, or faces) facing up"""
    points = ring(centre, radius, sides, math.pi / sides)
    for (xa, ya), (xb, yb) in zip(points, points[1:] + points[:1]):
        out = ((xa + xb) / 2 - centre[0], (ya + yb) / 2 - centre[1], 0)
        faces.quad([(xa, ya, bottom), (xb, yb, bottom), (xb, yb, top), (xa, ya, top)], colour_at, out)
    top_faces = cap or faces
    for (xa, ya), (xb, yb) in zip(points, points[1:] + points[:1]):
        top_faces.add([(*centre, top), (xa, ya, top), (xb, yb, top)], [colour_at(*centre, top), colour_at(xa, ya, top), colour_at(xb, yb, top)], UP)


def crystal(faces, base, radius, height, lean, colour_at):
    """a crystal: a four sided spike from base, leaning by lean (dx, dy)"""
    x, y, z = base
    tip = (x + lean[0], y + lean[1], z + height)
    points = ring((x, y), radius, 4, 0.3)
    for (xa, ya), (xb, yb) in zip(points, points[1:] + points[:1]):
        out = ((xa + xb) / 2 - x, (ya + yb) / 2 - y, 0.2)
        faces.add([(xa, ya, z), (xb, yb, z), tip], [colour_at(xa, ya, z), colour_at(xb, yb, z), colour_at(*tip)], out)


def crystal_cluster(faces, centre, z, size, colour_at):
    """a cluster of crystals around centre, the middle one the tallest"""
    cx, cy = centre
    crystal(faces, (cx, cy, z), 0.35 * size, 2.6 * size, (0.1, 0.1), colour_at)
    for index, (dx, dy) in enumerate([(0.6, 0.2), (-0.5, 0.4), (0.1, -0.6), (-0.4, -0.3)]):
        crystal(faces, (cx + dx * size, cy + dy * size, z), 0.25 * size, (1.2 + 0.3 * index) * size, (dx * 0.8, dy * 0.8), colour_at)


def acid(faces, x0, y0, x1, y1, z0, z1=None):
    """acid from (x0, y0) to (x1, y1), level at z0, or sloping from z0 at y0 to z1 at y1 (falls)"""
    if z1 is None:
        z1 = z0
    glow = lambda x, y, z: (150, 220, 90)
    ys = steps(y0, y1)
    for ya, yb in zip(ys, ys[1:]):
        za = z0 + (z1 - z0) * (ya - y0) / (y1 - y0)
        zb = z0 + (z1 - z0) * (yb - y0) / (y1 - y0)
        faces.quad([(x0, ya, za), (x1, ya, za), (x1, yb, zb), (x0, yb, zb)], glow, UP)


# the sections, along +y from the cut level's end

def corridor(parts):
    """from the cut level's end chamber, between rock, into the tiki hall"""
    light = lambda x, y, z: lit(path_light(x, y, -4, 2))
    floor(parts["path"], -6, 74, -2, 80, FLOOR, light)
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
    for y in [84, 89, 94, 99]:
        for x in [-9.5, 1.5]:
            prism(parts["tiki"], (x, y), 0.8, 8, ACID_LEVEL - 0.2, 5.0, carved, cap=parts["tiki_cap"])


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
    for (x, y) in ring(END_CENTRE, 4.5, 6, math.pi / 6)[1:-1]:
        prism(parts["tiki"], (x, y), 0.6, 8, END_FLOOR, END_FLOOR + 4.5, pillar, cap=parts["tiki_cap"])


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
        return -9 < x < 2 and y > 76.5
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
    "chamber_walls": (PURPLE_CARVED, True), "acid": (ACID, False),
}


def remove_earlier_extension():
    for obj in [obj for obj in bpy.data.objects if obj.name.startswith(EXTENSION)]:
        bpy.data.objects.remove(obj)


def object_name(part):
    if part == "acid":
        return "pit_ext_acid"  # a pit (builder/collision.ts): it kills crash
    return f"ext_{part}"


def main():
    remove_earlier_extension()
    open_cut_level_end()
    parts = {part: Faces(material, keep_uvs) for part, (material, keep_uvs) in PART_MATERIALS.items()}
    for section in (corridor, tiki_hall, crystal_cavern, acid_falls, end_chamber):
        section(parts)
    for part, faces in parts.items():
        if faces.faces:
            make_object(object_name(part), faces)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_mainfile()
    bpy.ops.wm.obj_export(
        filepath=os.path.splitext(bpy.data.filepath)[0] + ".obj", export_materials=True, export_colors=True,
        export_uv=True, export_normals=False, path_mode="STRIP",
    )


main()
