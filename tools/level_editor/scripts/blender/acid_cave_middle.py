# the acid cave's organic middle, between the cut level's end and the temple:
# the drop into a crystal geode, a fungal grotto, and a river gorge. its ground
# is one sculpted terrain: a height at every point, from noisy rock walls, each
# feature pulling it to its own height with a soft edge, so it has no holes.
# crystals, mushrooms, a rock arch and boulders stand on it
import math

from acid_cave_pieces import (  # noqa: F401
    ACID, CRYSTAL_GREEN, CRYSTAL_PURPLE, DARK_MOSS, FLOOR, GREEN_ROCK, GREEN_ROCK_VEINED, MOSS_PATH, MUSHROOM_CAP,
    MUSHROOM_STALK, PURPLE_ROCK, PURPLE_ROCK_BRIGHT, UP, Faces, crystal, crystal_cluster, lit, lumpy_ball, mushroom, wobble,
)

X_RANGE = (-16, 10)   # the terrain's extent (blender metres), within the zone's width
Y_RANGE = (76, 160)   # from the cut level's end chamber to the temple
STEP = 1.25           # the terrain's grid (coarser gives the game's sort lists less to hold)
GEODE_END, GROTTO_END = 110, 128.5  # where each part gives way to the next, along y
GEODE_CENTRE, GEODE_RADIUS = (-4.0, 97.0), 11.0
ACID_LEVELS = {"geode": -3.4, "grotto": -0.9, "gorge": -3.3}
WALL_TOPS = {"geode": 8.0, "grotto": 5.0, "gorge": 7.0}
PURPLE_ROCK_DARK = "tex_053"
ROCK_TOP_ABOVE = FLOOR + 1.5  # flat ground higher than this is the rock's top, not a floor to walk on
GREEN_SPORE = "tex_055"


def part_of(y):
    if y < GEODE_END:
        return "geode"
    if y < GROTTO_END:
        return "grotto"
    return "gorge"


def acid_level(y):
    return ACID_LEVELS[part_of(y)]


# shaping: each feature is a distance (how far a point is outside it) and its height

def smoothstep(edge0, edge1, value):
    t = min(1.0, max(0.0, (value - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)


def segment_distance(point, a, b):
    """how far point is from the segment a to b, and how far along it (0 to 1)"""
    (px, py), (ax, ay), (bx, by) = point, a, b
    dx, dy = bx - ax, by - ay
    t = min(1.0, max(0.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy), t


class Path:
    """a walkable way: through points (x, y, height), radius wide, its height
    changing along it, its edge falling off over falloff"""

    def __init__(self, points, radius, falloff=1.2):
        self.points, self.radius, self.falloff = points, radius, falloff

    def pull(self, x, y):
        best = (math.inf, 0.0)
        for (ax, ay, az), (bx, by, bz) in zip(self.points, self.points[1:]):
            distance, t = segment_distance((x, y), (ax, ay), (bx, by))
            if distance < best[0]:
                best = (distance, az + (bz - az) * t)
        distance, height = best
        return 1 - smoothstep(self.radius, self.radius + self.falloff, distance), height


class Blob:
    """a round feature (an island, a pool, a bowl) at centre, radius wide (made
    irregular by noise), at height, its edge falling off over falloff"""

    def __init__(self, centre, radius, height, falloff=1.0, roughness=0.18, seed=1.0):
        self.centre, self.radius, self.height, self.falloff, self.roughness, self.seed = centre, radius, height, falloff, roughness, seed

    def pull(self, x, y):
        cx, cy = self.centre
        radius = self.radius * (1 + self.roughness * wobble(x, y, 0, 2.5, self.seed))
        distance = math.hypot(x - cx, y - cy)
        return 1 - smoothstep(radius, radius + self.falloff, distance), self.height


class Strip:
    """a band along a curve x = curve(y) between y0 and y1, half_width wide, at height (a river bed)"""

    def __init__(self, curve, y0, y1, half_width, height, falloff=0.8):
        self.curve, self.y0, self.y1, self.half_width, self.height, self.falloff = curve, y0, y1, half_width, height, falloff

    def pull(self, x, y):
        if not self.y0 <= y <= self.y1:
            return 0.0, self.height
        distance = abs(x - self.curve(y))
        return 1 - smoothstep(self.half_width, self.half_width + self.falloff, distance), self.height


def river_x(y):
    """the gorge's river winds from side to side"""
    return -3.0 + 3.0 * math.sin((y - 130.0) / 5.0)


LEDGE_OFFSET = 3.4  # how far the gorge's ledges are from its river


def gorge_ledge(side, y0, y1):
    points = [(river_x(y) + side * LEDGE_OFFSET, y, FLOOR) for y in frange(y0, y1, 1.5)]
    return Path(points, 1.5, 0.9)


def frange(start, end, step):
    values, value = [], start
    while value < end:
        values.append(value)
        value += step
    return values + [end]


GEODE_LEDGE = [(-11.5, 99.0, -3.0), (-12.0, 103.0, -2.2), (-9.0, 107.5, -1.2), (-4.5, 109.5, -0.4), (0.0, 110.0, FLOOR), (1.0, 113.0, FLOOR)]
GEODE_ISLANDS = [((-4.5, 89.5), 1.6), ((-6.5, 92.2), 1.5), ((-5.0, 95.6), 1.7), ((-8.0, 98.2), 1.5)]
GROTTO_CAPS = [((-1.5, 117.5), 0.5, 1.45), ((-4.5, 119.2), 0.9, 1.35), ((-7.0, 121.6), 1.2, 1.4), ((-4.5, 124.0), 0.8, 1.35), ((-1.6, 126.0), 0.5, 1.4)]
ARCH_Y = 140.0
CRYSTAL_CLUSTERS = 30
BOULDER_Y = 151.5


def features():
    """the middle's features, in the order they shape it (later ones win)"""
    return [
        # the cave spaces, carved out of the rock
        Blob(GEODE_CENTRE, GEODE_RADIUS, -4.4, falloff=3.0, roughness=0.12, seed=3.0),
        Blob((-3.0, 121.0), 8.0, -1.6, falloff=3.0, roughness=0.2, seed=7.0),
        Strip(river_x, 128.5, 157.0, 1.6, -4.0),
        # the drop: from the cut level's end chamber, a ledge, then a slope down onto a beach
        Path([(-4.0, 75.0, FLOOR), (-4.0, 78.5, FLOOR), (-4.0, 84.0, -3.0)], 2.4, 1.6),
        Blob((-4.0, 85.6), 2.2, -3.0, roughness=0.15, seed=4.0),
        # the geode's cracked islands, and the ledge spiralling up its wall to the high way out
        *[Blob(centre, radius, -3.0, falloff=1.0, roughness=0.2, seed=10.0 + index) for index, (centre, radius) in enumerate(GEODE_ISLANDS)],
        Path(GEODE_LEDGE, 1.6, 1.0),
        # the grotto's shores, either side of its marsh of mushrooms
        Blob((0.5, 114.6), 2.2, FLOOR, seed=5.0),
        Blob((-2.0, 128.6), 2.5, FLOOR, seed=6.0),
        # the gorge's ledges: left of the river, then right (over the arch), then left (over the boulders), to the temple
        gorge_ledge(-1, 128.5, ARCH_Y + 1.0),
        gorge_ledge(1, ARCH_Y - 1.0, BOULDER_Y + 1.0),
        gorge_ledge(-1, BOULDER_Y - 1.0, 157.0),
        Path([(river_x(156.0) - LEDGE_OFFSET, 156.0, FLOOR), (-4.0, 158.5, FLOOR), (-4.0, 160.0, FLOOR)], 2.0, 1.0),
    ]


def rock_top(x, y):
    """the rock's height where nothing's carved: lumpy, the walls' tops"""
    return WALL_TOPS[part_of(y)] + 1.5 * wobble(x, y, 0, 5.0, 2.0) + 0.6 * wobble(x, y, 0, 1.7, 9.0)


def height_at(x, y, shaping):
    height = rock_top(x, y)
    for feature in shaping:
        weight, target = feature.pull(x, y)
        if weight > 0:
            height = height * (1 - weight) + target * weight
    return height + 0.06 * wobble(x, y, 0, 0.9, 13.0)  # a little unevenness everywhere


# the terrain, as a grid of heights

class Terrain:
    def __init__(self):
        shaping = features()
        self.xs = frange(X_RANGE[0], X_RANGE[1], STEP)
        self.ys = frange(Y_RANGE[0], Y_RANGE[1], STEP)
        self.heights = [[height_at(x, y, shaping) for x in self.xs] for y in self.ys]
        self.acid_distance = self.distances_from(self.is_under_acid)
        self.open_distance = self.distances_from(self.is_open)

    def at(self, column, row):
        return (self.xs[column], self.ys[row], self.heights[row][column])

    def is_under_acid(self, column, row):
        return self.heights[row][column] < acid_level(self.ys[row])

    def is_open(self, column, row):
        """whether a point is in the cave's open space (low enough to walk on, or under acid), not the rock's top"""
        return self.heights[row][column] < ROCK_TOP_ABOVE + 0.5

    def is_kept(self, column, row):
        """whether a grid square is part of the cave: near its open space. the rock's top beyond is never seen"""
        return min(self.open_distance[r][c] for c, r in square(column, row)) <= KEPT_REACH

    def distances_from(self, is_source):
        """each point's distance (in grid steps, up to 6) to the nearest point that is_source"""
        far = 6
        distance = [[far] * len(self.xs) for _ in self.ys]
        frontier = [(row, column) for row in range(len(self.ys)) for column in range(len(self.xs)) if is_source(column, row)]
        for row, column in frontier:
            distance[row][column] = 0
        while frontier:
            reached = []
            for row, column in frontier:
                for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    r, c = row + dr, column + dc
                    if 0 <= r < len(self.ys) and 0 <= c < len(self.xs) and distance[r][c] > distance[row][column] + 1:
                        distance[r][c] = distance[row][column] + 1
                        reached.append((r, c))
            frontier = reached
        return distance

    def hollowness(self, column, row):
        """how much lower a point is than the ground round it (metres): hollows are darker"""
        around = [self.heights[r][c] for r in range(row - 2, row + 3) for c in range(column - 2, column + 3)
                  if 0 <= r < len(self.ys) and 0 <= c < len(self.xs)]
        return max(0.0, sum(around) / len(around) - self.heights[row][column])


def vertex_light(terrain, column, row):
    """a terrain point's colour: lit on open ground, darker up the walls and in hollows, green near the acid"""
    x, y, z = terrain.at(column, row)
    above_acid = z - acid_level(y)
    base = 112 - 9 * max(0.0, above_acid - 3.5) - 18 * min(1.5, terrain.hollowness(column, row))
    glow = max(0.0, 1 - terrain.acid_distance[row][column] / 5) * 0.55 * smoothstep(6, 1, above_acid)
    return lit(max(35, base), glow=glow)


def face_material(corners):
    """a terrain face's material, by its part of the middle, its slope and height"""
    xs, ys, zs = zip(*corners)
    y = sum(ys) / len(ys)
    part = part_of(y)
    (ax, ay, az), (bx, by, bz), (cx, cy, cz) = corners[:3]
    ux, uy, uz, vx, vy, vz = bx - ax, by - ay, bz - az, cx - ax, cy - ay, cz - az
    normal = (uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx)
    upness = abs(normal[2]) / max(1e-9, math.hypot(*normal))
    if max(zs) < acid_level(y) + 0.05:
        return DARK_MOSS
    return MATERIALS[part][slope_kind(upness, sum(zs) / len(zs))]


def slope_kind(upness, height):
    if upness > 0.8 and height > ROCK_TOP_ABOVE:
        return "wall"
    if upness > 0.8:
        return "floor"
    if upness > 0.5:
        return "slope"
    return "wall"


MATERIALS = {
    "geode": {"floor": DARK_MOSS, "slope": PURPLE_ROCK_BRIGHT, "wall": PURPLE_ROCK},
    "grotto": {"floor": MOSS_PATH, "slope": PURPLE_ROCK_DARK, "wall": PURPLE_ROCK},
    "gorge": {"floor": MOSS_PATH, "slope": GREEN_ROCK_VEINED, "wall": GREEN_ROCK},
}


KEPT_REACH = 2  # grid steps from the cave's open space that the terrain is built over


def square(column, row):
    """a grid square's corners, from its lowest"""
    return [(column, row), (column + 1, row), (column + 1, row + 1), (column, row + 1)]


def terrain_faces(terrain, parts):
    """the terrain's faces into parts by material (its squares near the cave's open space), and the acid over it"""
    for row in range(len(terrain.ys) - 1):
        for column in range(len(terrain.xs) - 1):
            if not terrain.is_kept(column, row):
                continue
            cell = square(column, row)
            corners = [terrain.at(c, r) for c, r in cell]
            colours = [vertex_light(terrain, c, r) for c, r in cell]
            level = acid_level(terrain.ys[row])
            for triangle in ([0, 1, 2], [0, 2, 3]):
                add_above(parts, [corners[i] for i in triangle], [colours[i] for i in triangle], level)
            if any(terrain.is_under_acid(c, r) for c, r in cell):
                parts["acid"].add([(x, y, level) for x, y, _ in corners], [(150, 220, 90)] * 4, UP)


def add_above(parts, corners, colours, level):
    """a terrain triangle, cut off at the acid's level: only its part above it.
    the game draws polygons farthest first, so ground under the acid could be
    drawn over it; under the acid it's never seen, and the acid is a pit"""
    kept, kept_colours = clipped_above(corners, colours, level)
    if len(kept) < 3:
        return
    material = face_material(kept)
    for k in range(1, len(kept) - 1):
        parts[material].add([kept[0], kept[k], kept[k + 1]], [kept_colours[0], kept_colours[k], kept_colours[k + 1]], UP)


def clipped_above(corners, colours, level):
    """a polygon's part at or above height level, its corners and colours (blended where its edges cross it)"""
    kept, kept_colours = [], []
    for index, corner in enumerate(corners):
        following = (index + 1) % len(corners)
        here, there = corner[2] - level, corners[following][2] - level
        if here >= 0:
            kept.append(corner)
            kept_colours.append(colours[index])
        if (here >= 0) != (there >= 0):
            t = here / (here - there)
            kept.append(tuple(a + (b - a) * t for a, b in zip(corner, corners[following])))
            kept_colours.append(tuple(round(a + (b - a) * t) for a, b in zip(colours[index], colours[following])))
    return kept, kept_colours


# what stands on the ground

def geode_crystals(terrain, parts):
    """the geode's walls crusted with crystals, all round the bowl"""
    shine = lambda x, y, z: lit(150, glow=0.1)
    for index in range(CRYSTAL_CLUSTERS):
        angle = 2 * math.pi * index / CRYSTAL_CLUSTERS + 0.4 * wobble(index, 0, 0, 1, 3)
        reach = GEODE_RADIUS + 0.8 + 1.6 * (0.5 + 0.5 * wobble(index, 1, 0, 1, 4))
        x = GEODE_CENTRE[0] + reach * math.cos(angle)
        y = GEODE_CENTRE[1] + reach * math.sin(angle)
        if not (X_RANGE[0] < x < X_RANGE[1]) or near_way(x, y):
            continue
        z = ground_height(terrain, x, y) - 0.2
        size = 0.6 + 0.6 * (0.5 + 0.5 * wobble(index, 2, 0, 1, 5))
        crystal_cluster(parts[crystal_colour(index)], (x, y), z, size, shine)


def near_way(x, y):
    """whether a point is on or by the way through the geode (the drop, its beach and the spiral ledge), to keep crystals off it"""
    if abs(x + 4) < 3.5 and y < 88:
        return True
    ledge = [(px, py) for px, py, _ in GEODE_LEDGE]
    return any(segment_distance((x, y), a, b)[0] < 2.8 for a, b in zip(ledge, ledge[1:]))


def crystal_colour(index):
    """every third cluster green, the rest purple"""
    if index % 3 == 0:
        return "crystals_green"
    return "crystals_purple"


def ground_height(terrain, x, y):
    column = min(len(terrain.xs) - 1, max(0, round((x - X_RANGE[0]) / STEP)))
    row = min(len(terrain.ys) - 1, max(0, round((y - Y_RANGE[0]) / STEP)))
    return terrain.heights[row][column]


def grotto_mushrooms(terrain, parts):
    """giant mushrooms across the marsh, their caps the way over it, and smaller ones round its edge"""
    cap_light = lambda x, y, z: lit(120, glow=0.25)
    stalk_light = lambda x, y, z: lit(85, glow=0.45)
    for index, ((x, y), top, radius) in enumerate(GROTTO_CAPS):
        mushroom(parts["mushroom_stalks"], parts["mushroom_caps"], (x, y, -1.7), top, radius, cap_light, 20 + index)
    for index, (x, y) in enumerate([(-10.5, 116), (-11.2, 122.5), (-9.5, 126.5), (4.5, 118.5), (5.2, 123.5), (3.5, 127.0)]):
        z = ground_height(terrain, x, y)
        if z > ROCK_TOP_ABOVE:
            continue  # on the rock's top, which isn't built: it would float
        mushroom(parts["mushroom_stalks"], parts["mushroom_caps"], (x, y, z - 0.3), z + 1.2 + 0.4 * (index % 3), 0.7 + 0.15 * (index % 2), cap_light, 40 + index)


def grotto_spores(parts):
    """glowing shards drifting high over the marsh"""
    glow = lambda x, y, z: lit(170, glow=0.4)
    for index in range(14):
        x = -3.0 + 7.5 * wobble(index, 7, 0, 1, 8)
        y = 121.0 + 6.5 * wobble(index, 9, 0, 1, 9)
        z = 4.2 + 1.2 * (0.5 + 0.5 * wobble(index, 11, 0, 1, 10))
        crystal(parts["spores"], (x, y, z), 0.12, 0.5, (0.05, 0.05), glow)


def gorge_arch(parts):
    """a natural rock arch over the river, from the left ledge to the right"""
    y0, y1 = ARCH_Y - 1.1, ARCH_Y + 1.1
    left, right = river_x(ARCH_Y) - LEDGE_OFFSET + 0.6, river_x(ARCH_Y) + LEDGE_OFFSET - 0.6
    rock = lambda x, y, z: lit(95 - 8 * max(0.0, FLOOR - z), glow=0.25)
    count = 8
    def top(t):
        return FLOOR + 0.25 * math.sin(math.pi * t)
    def underside(t):
        return top(t) - 0.7 - 3.0 * (1 - math.sin(math.pi * t)) ** 2
    for index in range(count):
        ta, tb = index / count, (index + 1) / count
        xa, xb = left + (right - left) * ta, left + (right - left) * tb
        parts["arch"].quad([(xa, y0, top(ta)), (xb, y0, top(tb)), (xb, y1, top(tb)), (xa, y1, top(ta))], rock, UP)
        for y, towards in [(y0, -1), (y1, 1)]:
            parts["arch"].quad([(xa, y, underside(ta)), (xb, y, underside(tb)), (xb, y, top(tb)), (xa, y, top(ta))], rock, (0, towards, 0))


def gorge_boulders(parts):
    """fallen boulders across the river, their tops level enough to jump along"""
    rock = lambda x, y, z: lit(90, glow=0.3)
    left, right = river_x(BOULDER_Y) - LEDGE_OFFSET + 1.0, river_x(BOULDER_Y) + LEDGE_OFFSET - 1.0
    for index in range(3):
        x = left + (right - left) * (index + 0.5) / 3
        lumpy_ball(parts["boulders"], (x, BOULDER_Y + 0.3 * (index % 2), -0.65), 1.0, rock, 30 + index, flat_top=FLOOR)


MIDDLE_PARTS = {
    DARK_MOSS: (DARK_MOSS, False), MOSS_PATH: (MOSS_PATH, False), PURPLE_ROCK: (PURPLE_ROCK, False),
    PURPLE_ROCK_BRIGHT: (PURPLE_ROCK_BRIGHT, False), PURPLE_ROCK_DARK: (PURPLE_ROCK_DARK, False),
    GREEN_ROCK: (GREEN_ROCK, False), GREEN_ROCK_VEINED: (GREEN_ROCK_VEINED, False), "acid": (ACID, False),
    "crystals_purple": (CRYSTAL_PURPLE, True), "crystals_green": (CRYSTAL_GREEN, True), "spores": (GREEN_SPORE, True),
    "mushroom_stalks": (MUSHROOM_STALK, True), "mushroom_caps": (MUSHROOM_CAP, True), "arch": (PURPLE_ROCK, False),
    "boulders": (PURPLE_ROCK_BRIGHT, False),
}


def middle_parts():
    """the organic middle, as parts (name to faces)"""
    parts = {part: Faces(material, keep_uvs) for part, (material, keep_uvs) in MIDDLE_PARTS.items()}
    terrain = Terrain()
    terrain_faces(terrain, parts)
    geode_crystals(terrain, parts)
    grotto_mushrooms(terrain, parts)
    grotto_spores(parts)
    gorge_arch(parts)
    gorge_boulders(parts)
    return parts
