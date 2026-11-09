# turns acid_cave's N platforms' logo upright as the camera sees it (along +y):
# each of a platform's four quarters gets the logo's quarter that belongs there
# (tex_001 top left, then clockwise), its UVs laid straight (the image's right
# along +x, its top towards +y), then saves the .blend and exports the .obj.
# the cut level maps the logo a quarter turn round, so run it headless after its
# meshes are made or replaced (replace_cut_level_meshes.py):
#   blender --background level_src/acid_cave/acid_cave.blend --python acid_cave_n_platforms.py
import os
import sys

import bmesh
import bpy

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from build_cut_level import export_obj  # noqa: E402

# the logo's quarters, by where they go on a platform: (across, along), each low or high
QUARTERS = {("low", "high"): "tex_001", ("high", "high"): "tex_002", ("high", "low"): "tex_003", ("low", "low"): "tex_004"}
LOGO = set(QUARTERS.values())
PLATFORM = 2.0  # a platform's side, in metres


def side(value, middle):
    if value < middle:
        return "low"
    return "high"


def quarter_start(quarter_side, middle):
    """where a quarter starts along an axis, from the platform's middle"""
    if quarter_side == "low":
        return middle - PLATFORM / 2
    return middle


def slot_name(slot):
    if slot.material is None:
        return ""
    return slot.material.name


def ensure_logo_materials(obj):
    """the object's material names, with the logo's four quarters among them"""
    names = [slot_name(slot) for slot in obj.material_slots]
    for name in sorted(LOGO - set(names)):
        obj.data.materials.append(bpy.data.materials[name])
        names.append(name)
    return names


def platforms(faces):
    """the logo's faces grouped by platform: each with the first one whose middle is near its own (a platform's faces are under 2 m apart, the platforms 8 m or more)"""
    grouped = []
    for face in faces:
        centre = face.calc_center_median()
        platform = next((group for group in grouped if (group[0].calc_center_median() - centre).length < PLATFORM * 1.2), None)
        if platform is None:
            grouped.append([face])
        else:
            platform.append(face)
    return grouped


def platform_middle(faces):
    xs = [loop.vert.co.x for face in faces for loop in face.loops]
    ys = [loop.vert.co.y for face in faces for loop in face.loops]
    return ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)


def lay_upright(face, middle, names, uv_layer):
    """a face of a platform: the logo's quarter for where it is, its UVs straight across it"""
    centre = face.calc_center_median()
    quarter = (side(centre.x, middle[0]), side(centre.y, middle[1]))
    face.material_index = names.index(QUARTERS[quarter])
    start = (quarter_start(quarter[0], middle[0]), quarter_start(quarter[1], middle[1]))
    for loop in face.loops:
        u = min(1.0, max(0.0, loop.vert.co.x - start[0]))
        v = min(1.0, max(0.0, loop.vert.co.y - start[1]))
        loop[uv_layer].uv = (u, v)


def turn_upright(obj):
    names = ensure_logo_materials(obj)
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    uv_layer = mesh.loops.layers.uv.active
    logo_faces = [face for face in mesh.faces if names[face.material_index] in LOGO]
    for faces in platforms(logo_faces):
        middle = platform_middle(faces)
        for face in faces:
            lay_upright(face, middle, names, uv_layer)
        print(obj.name, "platform at", tuple(round(value, 2) for value in middle), len(faces), "faces")
    mesh.to_mesh(obj.data)
    mesh.free()


def has_logo(obj):
    return obj.type == "MESH" and any(slot.material and slot.material.name in LOGO for slot in obj.material_slots)


def main():
    for obj in [obj for obj in bpy.data.objects if has_logo(obj)]:
        turn_upright(obj)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_mainfile()
    export_obj(os.path.splitext(bpy.data.filepath)[0] + ".obj")


main()
