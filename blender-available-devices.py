'''
Devices test, from http://www.dalaifelinto.com/?p=746

RUN: blender -b -P blender-available-devices.py

'''
import bpy, _cycles
# print(_cycles.available_devices(''))
# bpy.context.user_preferences.system.compute_device = 'BLABLABLA'
# bpy.context.preferences.addons[‘cycles’].preferences.compute_device_type = ‘CUDA’


avail_devices = _cycles.available_devices('CUDA')
print(avail_devices)

prop = bpy.context.preferences.addons['cycles'].preferences

prop.get_devices(prop.compute_device_type)
prop.compute_device_type = 'CUDA'

for device in prop.devices:
    if device.type == 'CUDA':
        print('device: ', device)
        device.use = True
