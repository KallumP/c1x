# the acid cave extension's shared pieces (extend_acid_cave.py, acid_cave_middle.py):
# its materials, lighting (the game's vertex colours), faces turned to their open
# side, and the shapes it's made of
import math

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
    """a crystal: a three sided spike from base, leaning by lean (dx, dy)"""
    x, y, z = base
    tip = (x + lean[0], y + lean[1], z + height)
    points = ring((x, y), radius, 3, 0.3)  # three sided: fewer faces for the game's sort lists
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


# organic touches

from mathutils import Vector, noise  # noqa: E402 (blender's own)

TIKI_FACE = "tex_042"     # a carved face, for the toppled heads
MUSHROOM_CAP = "tex_061"  # pink, spotted
MUSHROOM_STALK = "tex_064"
DOWN = (0, 0, -1)


def wobble(x, y, z, scale, seed):
    """smooth noise at a point, -1 to 1, the same wherever the point is met (so shared corners stay together)"""
    return noise.noise(Vector((x / scale + seed, y / scale - seed, z / scale + 2 * seed)))


def roughened(faces, amount, scale=1.6, up_too=True):
    """faces with each corner pushed about by noise, up to amount: rock that bulges and sags"""
    def pushed(corner):
        x, y, z = corner
        dx = amount * wobble(x, y, z, scale, 11.1)
        dy = amount * wobble(x, y, z, scale, 23.7)
        dz = 0.0
        if up_too:
            dz = 0.5 * amount * wobble(x, y, z, scale, 41.3)
        return (x + dx, y + dy, z + dz)
    faces.faces = [([pushed(corner) for corner in corners], colours) for corners, colours in faces.faces]


def shifted(faces, dy):
    """faces moved dy along the route (+y)"""
    faces.faces = [([(x, y + dy, z) for x, y, z in corners], colours) for corners, colours in faces.faces]


def lumpy_ball(faces, centre, radius, colour_at, seed, flat_top=None):
    """a boulder: a ball with a lumpy surface, its top cut flat at flat_top if given (to stand on)"""
    cx, cy, cz = centre
    rings, around = 6, 9
    def point(ring_index, side):
        polar = math.pi * ring_index / rings
        azimuth = 2 * math.pi * side / around
        direction = (math.sin(polar) * math.cos(azimuth), math.sin(polar) * math.sin(azimuth), math.cos(polar))
        bulge = radius * (1 + 0.22 * wobble(*direction, 0.7, seed))
        z = cz + bulge * direction[2]
        if flat_top is not None:
            z = min(z, flat_top)
        return (cx + bulge * direction[0], cy + bulge * direction[1], z)
    for ring_index in range(rings):
        for side in range(around):
            corners = [point(ring_index, side), point(ring_index, side + 1), point(ring_index + 1, side + 1), point(ring_index + 1, side)]
            middle = [sum(corner[axis] for corner in corners) / 4 for axis in range(3)]
            out = tuple(middle[axis] - centre[axis] for axis in range(3))
            faces.quad(corners, colour_at, out)


def mushroom(stalks, caps, base, top, cap_radius, colour_at, seed):
    """a giant mushroom from base (x, y, z) up to its cap's top at height top: a leaning
    stalk and a wide domed cap, its top flat enough to stand on"""
    x, y, z = base
    lean = (0.25 * wobble(x, y, 0, 3, seed), 0.25 * wobble(x, y, 0, 3, seed + 5))
    stalk_top = top - 0.45
    stalk = ring((x, y), 0.45, 8)
    for (xa, ya), (xb, yb) in zip(stalk, stalk[1:] + stalk[:1]):
        out = ((xa + xb) / 2 - x, (ya + yb) / 2 - y, 0)
        stalks.quad([(xa, ya, z), (xb, yb, z), (xb + lean[0], yb + lean[1], stalk_top), (xa + lean[0], ya + lean[1], stalk_top)], colour_at, out)
    middle = (x + lean[0], y + lean[1])
    rim = ring(middle, cap_radius, 12)
    under = ring(middle, cap_radius * 0.92, 12)
    crown = (*middle, top + 0.12)
    for (xa, ya), (xb, yb), (ua, va), (ub, vb) in zip(rim, rim[1:] + rim[:1], under, under[1:] + under[:1]):
        caps.add([crown, (xa, ya, top), (xb, yb, top)], [colour_at(*crown), colour_at(xa, ya, top), colour_at(xb, yb, top)], UP)
        out = ((xa + xb) / 2 - middle[0], (ya + yb) / 2 - middle[1], -0.3)
        caps.quad([(xa, ya, top), (xb, yb, top), (ub, vb, top - 0.4), (ua, va, top - 0.4)], colour_at, out)


def broken_pillar(faces, cap, centre, radius, bottom, top, colour_at, seed):
    """a pillar snapped off: its top jagged, lower on one side"""
    own_sides, own_cap = Faces(faces.material, faces.keep_uvs), Faces(cap.material, cap.keep_uvs)
    prism(own_sides, centre, radius, 8, bottom, top, colour_at, cap=own_cap)
    snap = lambda corner: snapped(corner, top, 0.6 * radius, seed)
    for own, into in [(own_sides, faces), (own_cap, cap)]:
        into.faces.extend(([snap(corner) for corner in corners], colours) for corners, colours in own.faces)


def snapped(corner, top, depth, seed):
    """a corner of a pillar, lowered by up to depth where it's on its top: where it broke"""
    x, y, z = corner
    if abs(z - top) > 1e-6:
        return corner
    return (x, y, z - depth * (0.5 + 0.5 * wobble(x, y, 0, 0.5, seed)))


def toppled_pillar(faces, start, end, radius, z, colour_at):
    """a fallen pillar lying from start to end (x, y), its middle at height z"""
    (xa, ya), (xb, yb) = start, end
    length = math.hypot(xb - xa, yb - ya)
    along = ((xb - xa) / length, (yb - ya) / length)
    across = (-along[1], along[0])
    sides = 8
    def at(t, side):
        angle = 2 * math.pi * side / sides
        offset_across, offset_up = radius * math.cos(angle), radius * math.sin(angle)
        return (xa + (xb - xa) * t + across[0] * offset_across, ya + (yb - ya) * t + across[1] * offset_across, z + offset_up)
    for side in range(sides):
        angle = 2 * math.pi * (side + 0.5) / sides
        out = (across[0] * math.cos(angle), across[1] * math.cos(angle), math.sin(angle))
        faces.quad([at(0, side), at(1, side), at(1, side + 1), at(0, side + 1)], colour_at, out)


def tiki_head(faces, centre, size, turn, sink, colour_at):
    """a carved tiki head, toppled: a block turned by turn about the up axis, sunk sink into the ground"""
    x, y, z = centre
    half = (0.5 * size, 0.42 * size, 0.6 * size)
    def corner(sx, sy, sz):
        px, py = sx * half[0], sy * half[1]
        return (x + px * math.cos(turn) - py * math.sin(turn), y + px * math.sin(turn) + py * math.cos(turn), z - sink + sz * half[2] + half[2])
    for normal, quad in [((0, -1, 0), [(-1, -1, -1), (1, -1, -1), (1, -1, 1), (-1, -1, 1)]), ((0, 1, 0), [(1, 1, -1), (-1, 1, -1), (-1, 1, 1), (1, 1, 1)]),
                         ((-1, 0, 0), [(-1, 1, -1), (-1, -1, -1), (-1, -1, 1), (-1, 1, 1)]), ((1, 0, 0), [(1, -1, -1), (1, 1, -1), (1, 1, 1), (1, -1, 1)]),
                         ((0, 0, 1), [(-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)])]:
        corners = [corner(*point) for point in quad]
        nx, ny = normal[0] * math.cos(turn) - normal[1] * math.sin(turn), normal[0] * math.sin(turn) + normal[1] * math.cos(turn)
        faces.quad(corners, colour_at, (nx, ny, normal[2]))
