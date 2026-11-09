# adds a wall to a level source's .blend: a slab between two points on the map
# (blender metres), from bottom to top, in one of its materials, then saves it
# and exports its .obj and .mtl again (as build_cut_level.py does). run headless:
#   blender --background <level.blend> --python add_wall.py -- <name> <material> <x1> <y1> <x2> <y2> <bottom> <top> <thickness>
import math
import os
import sys

import bpy

GREY = 100 / 255  # a little darker than a texture's own colours (128), as the cave's walls are


def arguments():
    name, material, *numbers = sys.argv[sys.argv.index("--") + 1:]
    return name, material, [float(number) for number in numbers]


def linear_from_srgb(value):
    if value <= 0.04045:
        return value / 12.92
    return ((value + 0.055) / 1.055) ** 2.4


# the slab's 8 corners: along the line from (x1, y1) to (x2, y2), thickness across it
def slab_corners(x1, y1, x2, y2, bottom, top, thickness):
    length = math.hypot(x2 - x1, y2 - y1)
    across = (-(y2 - y1) / length * thickness / 2, (x2 - x1) / length * thickness / 2)
    ends = [(x1, y1), (x2, y2)]
    sides = [(ex + side * across[0], ey + side * across[1]) for ex, ey in ends for side in (-1, 1)]
    return [(x, y, z) for z in (bottom, top) for x, y in sides]


# its faces, each facing out of it
SLAB_FACES = [(0, 2, 6, 4), (3, 1, 5, 7), (1, 0, 4, 5), (2, 3, 7, 6), (4, 6, 7, 5), (1, 3, 2, 0)]


def add_colours(mesh):
    attribute = mesh.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    grey = linear_from_srgb(GREY)
    for data in attribute.data:
        data.color = (grey, grey, grey, 1)


def add_wall(name, material, corners):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(corners, [], SLAB_FACES)
    add_colours(mesh)
    mesh.materials.append(bpy.data.materials[material])
    mesh.validate()
    wall = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(wall)


def main():
    name, material, numbers = arguments()
    if name in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects[name])
    add_wall(name, material, slab_corners(*numbers))
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_mainfile()
    obj_path = os.path.splitext(bpy.data.filepath)[0] + ".obj"
    bpy.ops.wm.obj_export(
        filepath=obj_path, export_materials=True, export_colors=True, export_uv=True,
        export_normals=False, path_mode="STRIP",
    )


main()
