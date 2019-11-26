'''
Change scene texture

Texture image path are relative to the blend file directory. run from command line like this:

texture=path/to/texture.png blender -b scene.blend -P scene-texture.py -F PNG -a -s 1 -e 1 -j 1 -t 0 -E CYCLES -o //render_output.png

PARAMS:
    -b, --background
    -P, --python
    -F, --render-format
    -a, --render-anim
    -s, --frame-start
    -e, --frame-end
    -j, --frame
    -t, --threads
    -o, --render-output
    -E, --engine

LINKS:
    https://www.blenderguru.com/articles/4-easy-ways-to-speed-up-cycles
    http://www.dalaifelinto.com/?p=746

'''
import os
import sys
import bpy, _cycles
from bpy_extras.image_utils import load_image

# FORCE GPU
# https://blenderartists.org/t/blender-2-8-amazon-aws-ec2-cycles-gpu/1156408/3
avail_devices = _cycles.available_devices('CUDA')
print('Devices: ', avail_devices)

prop = bpy.context.preferences.addons['cycles'].preferences

prop.get_devices(prop.compute_device_type)
prop.compute_device_type = 'CUDA'

for device in prop.devices:
    if device.type == 'CUDA':
        print('device: ', device)
        device.use = True

def run():

    # Object name
    C_OBJECT= "PreviewSolidBase"

    # Material name
    C_MATERIAL= "Material"

    # Texture node name
    C_MATERIAL_NODE= "SolidTexture"

    # Parse image
    img_path = os.getenv('texture')
    if not img_path:
        raise Exception("You need to set environment 'image'")

    img_path_abs = bpy.path.abspath("//%s" % img_path)

    img_name = os.path.split(img_path)[1]
    b_image = bpy.data.images.get(img_name)
    if not b_image:
        b_image = load_image(img_path_abs)
    b_image_name_compat = bpy.path.display_name_from_filepath(b_image.filepath)


    # Deselect all entities
    bpy.ops.object.select_all(action = 'DESELECT')

    # Select object
    bpy.data.objects[C_OBJECT].select_set(state=True)
    bpy.context.view_layer.objects.active = bpy.data.objects[C_OBJECT]
    #bpy.context.scene.objects.active = bpy.data.objects[PIC_obj]

    # Get nodes
    material_tree = bpy.data.materials.get(C_MATERIAL).node_tree

    # Change node texture
    material_tree.nodes[C_MATERIAL_NODE].image = b_image

try:
    run()
except Exception:
    sys.exit(1)
