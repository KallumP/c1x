# replaces a cut level's own meshes (k..W world meshes and pit_acid) in a level
# source's .blend with those of a newer export of it (exportCutLevel.ts's
# scene, written without blender), leaving everything else in the .blend as it
# is (such as objects added since), then saves it and exports its .obj and .mtl. run headless:
#   blender --background <level.blend> --python replace_cut_level_meshes.py -- <scene.json>
# then run anything that changed those meshes since (such as extend_acid_cave.py) again
import json
import os
import sys

import bpy

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from build_cut_level import export_obj, make_object  # noqa: E402

REPLACED = ("pit_acid",)  # and the world meshes, named k..W


def is_replaced(name):
    return name in REPLACED or (name.startswith("k") and name.endswith("W"))


def main():
    scene_path = sys.argv[sys.argv.index("--") + 1]
    with open(scene_path, encoding="utf8") as file:
        scene = json.load(file)
    materials = {material.name: material for material in bpy.data.materials}
    for entry in scene["objects"]:
        if not is_replaced(entry["name"]):
            continue
        old = bpy.data.objects.get(entry["name"])
        if old is not None:
            bpy.data.objects.remove(old)
        make_object(entry, materials)
        print("replaced", entry["name"])
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_mainfile()
    export_obj(os.path.splitext(bpy.data.filepath)[0] + ".obj")


main()
