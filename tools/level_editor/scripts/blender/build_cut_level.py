# builds a cut level's scene (scripts/cutLevel/exportCutLevel.ts) in blender:
# an object per world mesh with its UVs and vertex colours, a material per
# image, saved as a .blend (images beside it) and exported as the level
# source's .obj and .mtl. run headless:
#   blender --background --python build_cut_level.py -- <scene.json> <out.blend> <out.obj>
import json
import os
import sys

import bpy

COLOUR_ATTRIBUTE = "Col"


def arguments():
    return sys.argv[sys.argv.index("--") + 1:]


def empty_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_material(name, image_path):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    shader = nodes.get("Principled BSDF")
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = bpy.data.images.load(image_path)
    texture.interpolation = "Closest"
    texture.location = (-300, 300)
    material.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    return material


def make_materials(scene, folder):
    return {entry["name"]: make_material(entry["name"], os.path.join(folder, entry["image"])) for entry in scene["materials"]}


def mesh_data(name, faces):
    corners = [corner for face in faces for corner in face["corners"]]
    triangles = [(3 * index, 3 * index + 1, 3 * index + 2) for index in range(len(faces))]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(corners, [], triangles)
    return mesh


def add_uvs(mesh, faces):
    layer = mesh.uv_layers.new(name="UVMap")
    uvs = [uv for face in faces for uv in face["uvs"]]
    for loop in mesh.loops:
        layer.data[loop.index].uv = uvs[loop.vertex_index]


# the linear value blender keeps for an sRGB value (0 to 1): the .obj exporter
# writes colours as sRGB, so this comes back out as value
def linear_from_srgb(value):
    if value <= 0.04045:
        return value / 12.92
    return ((value + 0.055) / 1.055) ** 2.4


# the game's vertex colours (0 to 255), on each vertex, so the .obj has them as 0 to 1
def add_colours(mesh, faces):
    attribute = mesh.color_attributes.new(COLOUR_ATTRIBUTE, "FLOAT_COLOR", "POINT")
    colours = [colour for face in faces for colour in face["colours"]]
    for index, colour in enumerate(colours):
        attribute.data[index].color = (*(linear_from_srgb(channel / 255) for channel in colour), 1)


def assign_materials(mesh, faces, materials):
    names = sorted({face["material"] for face in faces})
    for name in names:
        mesh.materials.append(materials[name])
    slot_of = {name: slot for slot, name in enumerate(names)}
    for polygon, face in zip(mesh.polygons, faces):
        polygon.material_index = slot_of[face["material"]]


def make_object(entry, materials):
    faces = entry["faces"]
    mesh = mesh_data(entry["name"], faces)
    add_uvs(mesh, faces)
    add_colours(mesh, faces)
    assign_materials(mesh, faces, materials)
    mesh.validate()
    obj = bpy.data.objects.new(entry["name"], mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def export_obj(path):
    bpy.ops.wm.obj_export(
        filepath=path, export_materials=True, export_colors=True, export_uv=True,
        export_normals=False, path_mode="STRIP",
    )


def main():
    scene_path, blend_path, obj_path = arguments()
    with open(scene_path, encoding="utf8") as file:
        scene = json.load(file)
    empty_scene()
    materials = make_materials(scene, os.path.dirname(os.path.abspath(scene_path)))
    for entry in scene["objects"]:
        make_object(entry, materials)
    bpy.context.preferences.filepaths.save_version = 0  # no .blend1 backups
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(blend_path), relative_remap=True)
    bpy.ops.file.make_paths_relative()
    bpy.ops.wm.save_mainfile()
    export_obj(os.path.abspath(obj_path))


main()
