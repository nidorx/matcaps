const child_process = require('child_process');

// blender -b scene.blend --python scene-texture.py -F PNG -s 1 -e 1 -j 1 -t 0 -a

child_process.execSync(`"blender" -b scene.blend -o //render_output.png -P scene-texture.py -F PNG -a -s 1 -e 1 -j 1 -t 0 -E CYCLES`, {
    stdio: [0, 1, 2],
    env: {
        texture: '1024/B3904B_877E71_DCCCAC_AAC3D6_5D4B27_6C645B.png '
    }
});
