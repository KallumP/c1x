# closes off acid_cave's start, from behind the spawn to the lake: fills the
# gaps in its ground with ground like that round them (start_fill_<material>
# objects), and puts invisible walls round the ground's edge, so crash can't
# walk off it (collision_start_walls: solid, not drawn). the cut level only
# lets crash walk its path; its ground either side is scenery with no edge.
# then saves the .blend and exports the .obj. run headless after the other
# acid_cave scripts (acid_cave_n_platforms.py):
#   blender --background level_src/acid_cave/acid_cave.blend --python acid_cave_start.py
import math
import os
import sys

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from acid_cave_pieces import Faces, make_object  # noqa: E402
from build_cut_level import export_obj  # noqa: E402

REGION = (-19.0, -9.0, 18.0, 33.0)  # the start's map (x0, y0, x1, y1), blender metres; the lake past y1
CELL = 0.5             # the map's cells
RAY_TOP = 3.5          # looking down for ground from this high (under the cave's roof)
RAY_LENGTH = 8.0
COVER_TOP = 8.0        # a gap with anything over it up to this high is under a mound or rock: out of sight, not filled
CLOSE_RADIUS = 4       # cells: gaps up to twice this wide count as inside the ground
HEIGHT_RADIUS = 5      # cells: how far a fill looks for the ground's height round it
FILL_DROP = 0.02       # fills a little under the ground round them
WALL_BOTTOM = -2.0
WALL_TOP = 8.0         # out of crash's reach
OURS = ("start_fill_", "collision_start_walls")
WALLS = "collision_start_walls"
NEIGHBOURS = [(1, 0), (-1, 0), (0, 1), (0, -1)]


def srgb_from_linear(value):
    if value <= 0.0031308:
        return value * 12.92
    return 1.055 * value ** (1 / 2.4) - 0.055


def is_ours(obj):
    return obj.name.startswith(OURS)


def remove_ours():
    for obj in [obj for obj in bpy.data.objects if is_ours(obj)]:
        bpy.data.objects.remove(obj)


def polygon_colour(mesh, polygon):
    """a polygon's vertex colour (0 to 255, as the .obj has it), its corners' average"""
    attribute = mesh.color_attributes.get("Col")
    if attribute is None:
        return (128, 128, 128)
    if attribute.domain == "POINT":
        values = [attribute.data[index].color for index in polygon.vertices]
    else:
        values = [attribute.data[index].color for index in polygon.loop_indices]
    return tuple(round(srgb_from_linear(sum(value[channel] for value in values) / len(values)) * 255) for channel in range(3))


class Scene:
    """the level's faces, to look down on: each polygon's material, colour and whether it's ground (faces up)"""

    def __init__(self):
        self.vertices, self.polygons, self.details = [], [], []
        for obj in bpy.data.objects:
            if obj.type == "MESH" and not is_ours(obj):
                self.add(obj)
        self.tree = BVHTree.FromPolygons(self.vertices, self.polygons)

    def add(self, obj):
        mesh = obj.data
        start = len(self.vertices)
        self.vertices.extend(obj.matrix_world @ vertex.co for vertex in mesh.vertices)
        for polygon in mesh.polygons:
            self.polygons.append([start + index for index in polygon.vertices])
            self.details.append((material_of(obj, polygon), polygon_colour(mesh, polygon), obj.name))

    def below(self, x, y):
        """what's under (x, y): (height, material, colour, whether it's ground), or None"""
        hit, normal, index, _ = self.tree.ray_cast(Vector((x, y, RAY_TOP)), Vector((0, 0, -1)), RAY_LENGTH)
        if hit is None:
            return None
        material, colour, name = self.details[index]
        is_ground = abs(normal.z) > 0.5 and not name.startswith(("pit", "collision"))
        return (hit.z, material, colour, is_ground)

    def is_covered(self, x, y):
        """whether anything's over (x, y) above where the ground is looked for, under the cave's roof"""
        hit, _, _, _ = self.tree.ray_cast(Vector((x, y, RAY_TOP)), Vector((0, 0, 1)), COVER_TOP - RAY_TOP)
        return hit is not None


def material_of(obj, polygon):
    slot = obj.material_slots[polygon.material_index] if obj.material_slots else None
    if slot is None or slot.material is None:
        return ""
    return slot.material.name


def cell_middle(i, j):
    x0, y0, _, _ = REGION
    return (x0 + (i + 0.5) * CELL, y0 + (j + 0.5) * CELL)


def grid_size():
    x0, y0, x1, y1 = REGION
    return (round((x1 - x0) / CELL), round((y1 - y0) / CELL))


def look_down(scene):
    """each cell's middle: what's under it, for the cells with anything; and the cells with something over them"""
    width, height = grid_size()
    found, covered = {}, set()
    for i in range(width):
        for j in range(height):
            below = scene.below(*cell_middle(i, j))
            if below is not None:
                found[(i, j)] = below
            elif scene.is_covered(*cell_middle(i, j)):
                covered.add((i, j))
    return found, covered


def disc(radius):
    return [(di, dj) for di in range(-radius, radius + 1) for dj in range(-radius, radius + 1) if di * di + dj * dj <= radius * radius]


def grown(cells, radius):
    return {(i + di, j + dj) for i, j in cells for di, dj in disc(radius)}


def shrunk(cells, radius):
    offsets = disc(radius)
    return {(i, j) for i, j in cells if all((i + di, j + dj) in cells for di, dj in offsets)}


def closed(cells, radius):
    """the cells with their gaps up to 2 radius wide filled in (a morphological closing)"""
    width, height = grid_size()
    inside = shrunk(grown(cells, radius), radius)
    return {(i, j) for i, j in inside if 0 <= i < width and 0 <= j < height} | cells


def nearby_ground(found, cell):
    i, j = cell
    near = [(found[(i + di, j + dj)], di * di + dj * dj) for di, dj in disc(HEIGHT_RADIUS) if (i + di, j + dj) in found]
    return [(below, distance) for below, distance in near if below[3]]


def fill_of(found, cell):
    """a gap cell's ground: the height round it (nearer counts more), and its nearest ground's material and colour"""
    near = nearby_ground(found, cell)
    if not near:
        return None
    weights = [1 / distance for _, distance in near]
    height = sum(below[0] * weight for (below, _), weight in zip(near, weights)) / sum(weights)
    nearest, _ = min(near, key=lambda entry: entry[1])
    return (height - FILL_DROP, nearest[1], nearest[2])


def corner_heights(fills):
    """each fill cell corner's height: the average of the fill cells round it, so the fill is all one surface"""
    sums = {}
    for (i, j), (height, _, _) in fills.items():
        for corner in [(i, j), (i + 1, j), (i, j + 1), (i + 1, j + 1)]:
            total, count = sums.get(corner, (0.0, 0))
            sums[corner] = (total + height, count + 1)
    return {corner: total / count for corner, (total, count) in sums.items()}


def corner_place(corner, heights):
    x0, y0, _, _ = REGION
    i, j = corner
    return (x0 + i * CELL, y0 + j * CELL, heights[corner])


def add_fills(fills):
    heights = corner_heights(fills)
    by_material = {}
    for (i, j), (_, material, colour) in fills.items():
        faces = by_material.setdefault(material, Faces(material))
        corners = [corner_place(corner, heights) for corner in [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]]
        faces.add(corners, [colour] * 4, (0, 0, 1))
    for material, faces in by_material.items():
        make_object(f"start_fill_{material}", faces)
    return sum(len(faces.faces) for faces in by_material.values())


def is_open_edge(cell, ground):
    """whether crash could walk off ground over this side of a cell: nothing past it, and not past the start's lake end"""
    i, j = cell
    _, height = grid_size()
    return cell not in ground and j < height


def edges(ground):
    """the ground's edge, cell side by cell side: ((i, j), (i2, j2)) corner to corner"""
    found = []
    for i, j in ground:
        for di, dj in NEIGHBOURS:
            if is_open_edge((i + di, j + dj), ground):
                found.append(side_of(i, j, di, dj))
    return found


def side_of(i, j, di, dj):
    if di == 1:
        return ((i + 1, j), (i + 1, j + 1))
    if di == -1:
        return ((i, j), (i, j + 1))
    if dj == 1:
        return ((i, j + 1), (i + 1, j + 1))
    return ((i, j), (i + 1, j))


def merged(sides):
    """cell sides in a line joined into runs: fewer, longer walls"""
    runs = []
    for along in (0, 1):
        lines = {}
        for start, end in sides:
            if start[1 - along] == end[1 - along]:
                lines.setdefault(start[1 - along], []).append(start[along])
        for line, starts in lines.items():
            runs.extend(runs_on(line, sorted(set(starts)), along))
    return runs


def runs_on(line, starts, along):
    runs, first = [], starts[0]
    for previous, current in zip(starts, starts[1:] + [None]):
        if current != previous + 1:
            runs.append(corner_pair(line, first, previous + 1, along))
            first = current
    return runs


def corner_pair(line, start, end, along):
    if along == 0:
        return ((start, line), (end, line))
    return ((line, start), (line, end))


def add_walls(runs):
    x0, y0, _, _ = REGION
    faces = Faces("flat_000000")
    for (ia, ja), (ib, jb) in runs:
        a = (x0 + ia * CELL, y0 + ja * CELL)
        b = (x0 + ib * CELL, y0 + jb * CELL)
        corners = [(a[0], a[1], WALL_BOTTOM), (b[0], b[1], WALL_BOTTOM), (b[0], b[1], WALL_TOP), (a[0], a[1], WALL_TOP)]
        faces.add(corners, [(128, 128, 128)] * 4, (0, 0, 0))
    make_object(WALLS, faces)
    return len(faces.faces)


def main():
    remove_ours()
    found, covered = look_down(Scene())
    ground = closed(set(found) | covered, CLOSE_RADIUS)
    gaps = ground - set(found) - covered
    fills = {cell: fill for cell in gaps if (fill := fill_of(found, cell)) is not None}
    print("filled", add_fills(fills), "gap cells;", add_walls(merged(edges(ground))), "walls round the start")
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_mainfile()
    export_obj(os.path.splitext(bpy.data.filepath)[0] + ".obj")


main()
