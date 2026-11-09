# removes an object's faces inside a box on the map of a level source's .blend
# (their middles from (x0, y0) to (x1, y1), blender metres), then saves it and
# exports its .obj and .mtl again (as build_cut_level.py does). run headless:
#   blender --background <level.blend> --python remove_faces.py -- <object> <x0> <y0> <x1> <y1>
import os
import sys

import bmesh
import bpy


def arguments():
    name, *numbers = sys.argv[sys.argv.index("--") + 1:]
    return name, [float(number) for number in numbers]


def is_inside(centre, x0, y0, x1, y1):
    x, y, _ = centre
    return min(x0, x1) <= x <= max(x0, x1) and min(y0, y1) <= y <= max(y0, y1)


def remove_faces(obj, box):
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    doomed = [face for face in mesh.faces if is_inside(face.calc_center_median(), *box)]
    bmesh.ops.delete(mesh, geom=doomed, context="FACES")
    mesh.to_mesh(obj.data)
    mesh.free()
    return len(doomed)


def main():
    name, box = arguments()
    removed = remove_faces(bpy.data.objects[name], box)
    print(f"removed {removed} faces from {name}")
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_mainfile()
    bpy.ops.wm.obj_export(
        filepath=os.path.splitext(bpy.data.filepath)[0] + ".obj", export_materials=True, export_colors=True,
        export_uv=True, export_normals=False, path_mode="STRIP",
    )


main()
