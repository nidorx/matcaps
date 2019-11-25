'''
texture image path are relative to the blend file directory. run from command line like this:

texture=img/2012720989_c.jpg blender -b bmps.blend --python texture_change.py -F PNG -s 1 -e 1 -j 1 -t 0 -a
'''
import os

image_file = os.getenv('texture')
if not image_file:
    image_file="1024/B3904B_877E71_DCCCAC_AAC3D6_5D4B27_6C645B.png"

PIC_obj="SolidModel"
PIC_material="Material"

import bpy
from bpy_extras.image_utils import load_image


bpy.ops.object.select_all(action = 'DESELECT')


bpy.data.objects[PIC_obj].select_set(state=True)
bpy.context.view_layer.objects.active = bpy.data.objects[PIC_obj]
#bpy.context.scene.objects.active = bpy.data.objects[PIC_obj]

image_abs = bpy.path.abspath("//%s" % image_file)

image_name = os.path.split(image_file)[1]
bImg = bpy.data.images.get(image_name)
if not bImg:
    bImg = load_image(image_abs)
name_compat = bpy.path.display_name_from_filepath(bImg.filepath)

material_tree = bpy.data.materials.get(PIC_material).node_tree
links = material_tree.links

texture = bpy.data.textures.get(name_compat)
if not texture:
    texture = material_tree.nodes.new('ShaderNodeTexImage')
texture.image = bImg
texture.show_texture = True
texture.name = name_compat

emit = material_tree.nodes['Emission']
links.new(texture.outputs[0], emit.inputs[0])
