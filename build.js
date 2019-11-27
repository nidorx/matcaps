const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const rimraf = require("rimraf");
var sizeOf = require('image-size');

const JSZip = require('jszip');

const child_process = require('child_process');
const spawn = require('child_process').spawn;
const execSync = require('child_process').execSync;

const ColorThief = require('colorthief');

const pLimit = require('p-limit');

// Limit Proccessing images
const limitProccess = pLimit(10);

// Limit Proccessing render (Blender)
const limitRender = pLimit(2);


// Temp dir, clear and recreate
rimraf.sync('./.tmp');
fs.mkdirSync('./.tmp');

var LOG_IDX = 0;
const WARNING = chalk.keyword('orange');
var COLORS = [
    chalk.green,
    chalk.yellow,
    chalk.blue,
    chalk.magenta,
    chalk.cyan,
    chalk.white,
    chalk.blackBright,
    chalk.greenBright,
    chalk.yellowBright,
    chalk.blueBright,
    chalk.magentaBright,
    chalk.cyanBright,
    chalk.whiteBright
];

/**
 * ALGORITMO
 *
 * 1 - Converter arquivos .jpg, .bmp, .tiff para .png
 * 4 - Remover arquivos com extensão não aceita
 * 2 - Remover arquivos com dimensão menor que 1024x1024
 * 3 - Redimensionar arquivos com dimensão maior que 1024x1024 para esse valor
 * 5 - Para cada arquivo:
 *  a) Gerar definição de cor (usar circulo temporario ou extrair a partir do nome do arquivo se esse já foi processado)
 *  b) Verificar se todos os fluxos foram processados (Redimensionar, Gerar Paleta, etc)
 *      1 - Gerar paleta de cores
 *      2 - Redimensionar para 512,256,128 e 64
 *      3 - Renderizar cena de testes em 512 e 128px
 * 6 - Gerar documentação de todos os materiais
 *
 * @TODO: Verificar se possui zmt associado (mesmo nome)
 */

// All files
const FILES = [];

// Palette cube sizes
const CUBE_SMALL = 40;
const CUB_BIG = CUBE_SMALL * 2;
const CUBE_MAX = CUBE_SMALL * 3;


// File name regex
var REG_FILE_NAME_COLORS = /^([A-F0-9]{6})_([A-F0-9]{6})_([A-F0-9]{6})_([A-F0-9]{6}).*/;

/**
 * Work with one file (all references)
 *
 * @param name
 * @constructor
 */
function File(name) {

    this.name = name;
    var idx = LOG_IDX++;
    var color = COLORS[idx % COLORS.length];
    var prefix = '[' + (('0000' + idx).split('').reverse().slice(0, 4).reverse().join('')) + '] ';

    this.LOG = {
        info: function () {
            var parts = arguments;
            parts[0] = color(prefix + parts[0]);
            console.log.apply(undefined, parts);
        }.bind(this),
        warn: function () {
            var parts = arguments;
            parts[0] = WARNING(prefix + parts[0]);
            console.warn.apply(undefined, parts);
        }.bind(this),
        error: function () {
            var parts = arguments;
            parts[0] = chalk.bold.red(prefix + parts[0]);
            console.warn.apply(undefined, parts);
        }.bind(this)
    };
}

/**
 * Remove this file from disk (All references)
 */
File.prototype.delete = function () {
    // Unlink all references
    ['1024', '512', '256', '128', '64'].forEach(function (dir) {
        var fpath = path.join(dir, this.name);
        if (fs.existsSync(fpath)) {
            fs.unlinkSync(fpath);
        }
    }.bind(this));

    // Remove from list
    var idx = FILES.indexOf(this);
    if (idx >= 0) {
        FILES.splice(idx, 1);
    }

    const resolve = function () {
        return Promise.resolve();
    }.bind(this);

    // Ignore all next execution
    this.processExtension
        = this.validateDimension
        = this.extractPalette
        = this.savePalettePreview
        = this.render
        = this.resize
        = this.zip
        = resolve;

    return resolve();

};

/**
 * Initialize file proccess
 *
 * @returns {Promise<any>}
 */
File.prototype.process = function () {
    return this.processExtension()
        .then(value => {
            return this.validateDimension();
        })
        .then(value => {
            return this.extractPalette();
        })
        .then(value => {
            return this.savePalettePreview();
        })
        .then(value => {
            return this.render();
        })
        .then(value => {
            return this.resize();
        })
        .then(value => {
            return this.zip();
        });
};

/**
 * Initialize file proccess
 *
 * @returns {Promise<any>}
 */
File.prototype.processExtension = function () {
    return new Promise((resolve, reject) => {

        // Get this file extension
        const ext = path.extname(this.name);
        switch (ext.toLowerCase()) {
            case '.png':
                resolve();
                break;
            case '.jpg':
            case '.jpeg':
            case '.bmp':
            case '.tga':
            case '.tif':
            case '.tiff':
                const original = path.join('1024', this.name);
                let basename = path.basename(this.name, ext);
                const originalZMT = path.join('zmt', basename + '.zmt');
                const originalZMTu = path.join('zmt', basename + '.ZMT');
                let renamed = path.join('1024', basename + '.png');

                let inc = 1;
                while (true) {
                    if (fs.existsSync(renamed)) {
                        renamed = path.join('1024', basename + '-' + (inc++) + '.png');
                    } else {
                        break;
                    }
                }

                execSync(`"magick" "${original}" -profile ./sRGB2014.icc -colorspace RGB -strip "PNG24:${renamed}"`, {stdio: [0, 1, 2]});

                // Remove original
                fs.unlinkSync(original);
                this.name = path.basename(renamed);

                if (fs.existsSync(originalZMT)) {
                    let renamedZMT = path.join('zmt', path.basename(renamed, '.png') + '.zmt');
                    fs.renameSync(originalZMT, renamedZMT);
                } else if (fs.existsSync(originalZMTu)) {
                    let renamedZMT = path.join('zmt', path.basename(renamed, '.png') + '.zmt');
                    fs.renameSync(originalZMTu, renamedZMT);
                }

                resolve();

                break;
            default:
                // Remove invalid extension
                this.delete();
                resolve();
        }
    });
};

/**
 * Remover arquivos com dimensão menor que 1024x1024
 * Redimensionar arquivos com dimensão maior que 1024x1024 para esse valor
 */
File.prototype.validateDimension = function () {
    let filepath = path.join('1024', this.name);

    var dimensions = sizeOf(filepath);

    var width = dimensions.width;
    var height = dimensions.height;

    if (width === 1024 && height === 1024) {
        // Ok
        return Promise.resolve();
    }

    if (width < 1024 || height < 1024) {
        // Remover arquivos com dimensão menor que 1024x1024
        this.LOG.warn(`Removing "${filepath}": invalid resolution ${width}x${height}`);
        return this.delete();
    }

    if (width !== height) {
        // Remove imagens que não são quadradas
        this.LOG.warn(`Removing "${filepath}": invalid resolution ${width}x${height}`);
        return this.delete();
    }

    execSync(`"magick" "${original}" -resize 1024x1024 -strip "${renamed}"`, {stdio: [0, 1, 2]});
};

function rgbToHex(rgb) {
    var hex = Number(rgb).toString(16);
    if (hex.length < 2) {
        hex = "0" + hex;
    }
    return hex;
}

/**
 * Faz o processamento da paleta de cores do arquivo
 *
 * @returns {Promise<any>}
 */
File.prototype.extractPalette = function () {
    return new Promise((resolve, reject) => {
        if (!this.palette) {
            var parts = this.name.match(REG_FILE_NAME_COLORS);
            if (parts) {
                this.palette = {
                    A: parts[1],
                    B: parts[2],
                    C: parts[3],
                    D: parts[4]
                };

                return resolve();
            }

            // Gera a paleta a partir da imagem original, e renomeia o arquivo atual

            const original = path.join('1024', this.name);
            let basename = path.basename(this.name, '.png');
            const originalZMT = path.join('zmt', basename + '.zmt');
            const originalZMTu = path.join('zmt', basename + '.ZMT');
            const circular = path.join('.tmp', path.basename(original, '.png') + '.png');

            var colorA = {};

            // magick convert input.png \( -size 1024x1024 xc:none -fill white -draw "circle 512,512 512,0" \) -compose copy_opacity -composite output.png


            // Create circular file to parse palette
            execSync(`"magick" convert "${original}" ( -size 1024x1024 xc:none -fill white -draw "circle 512,512 512,0" ) -compose copy_opacity -composite "${circular}"`, {stdio: [0, 1, 2]});

            return ColorThief.getColor(circular)
                .then(rgb => {
                    colorA = `${rgb.map(rgbToHex).join('')}`;
                    return ColorThief.getPalette(circular, 5);
                })
                .then(rgb => {


                    // Get name from palette
                    // Ex. C65646_B36458_EC8C83_841D14
                    var name = [
                        colorA,
                        `${rgb[0].map(rgbToHex).join('')}`,
                        `${rgb[1].map(rgbToHex).join('')}`,
                        `${rgb[2].map(rgbToHex).join('')}`,
                    ].join('_').replace(/[#]/g, '').toUpperCase();


                    let renamed = path.join('1024', name + '.png');
                    let inc = 1;
                    while (true) {
                        if (fs.existsSync(renamed)) {
                            renamed = path.join('1024', name + '-' + (inc++) + '.png');
                        } else {
                            break;
                        }
                    }

                    // Rename file on disk
                    fs.renameSync(original, renamed);

                    // Delete temp file
                    fs.unlinkSync(circular);

                    this.name = name + '.png';

                    if (fs.existsSync(originalZMT)) {
                        let renamedZMT = path.join('zmt', path.basename(renamed, '.png') + '.zmt');
                        fs.renameSync(originalZMT, renamedZMT);
                    } else if (fs.existsSync(originalZMTu)) {
                        let renamedZMT = path.join('zmt', path.basename(renamed, '.png') + '.zmt');
                        fs.renameSync(originalZMTu, renamedZMT);
                    }
                })
                .then(value => {
                    // Check agai, by name now
                    return this.extractPalette();
                })
                .then(resolve)
                .catch(reject);
        } else {
            resolve();
        }
    })
};

/**
 * Cria uma paleta com as cores prominentes do matcap (https://github.com/akfish/node-vibrant/)
 *
 * A = Main
 * B = Palette
 * C = Palette
 * D = Palette
 *
 * +----------------+--------+
 * |                |        |
 * |                |        |
 * |                |    B   |
 * |      A         |        |
 * |                |        |
 * |                +--------+
 * |                |        |
 * +-----------+----+        |
 * |           |             |
 * |     C     |        D    |
 * |           |             |
 * +-----------+-------------+
 */
File.prototype.savePalettePreview = function () {
    return new Promise((resolve, reject) => {
        // palette
        const paletteFile = path.join('palette', this.name);
        fs.exists(paletteFile, (exists) => {
                if (exists) {
                    return resolve();
                }

                const colors = {
                    A: this.palette.A,
                    B: this.palette.C,
                    C: this.palette.E,
                    D: this.palette.D
                };

                // magick convert -size 140x140 xc:"rgb(255, 0, 0)" -fill White  -draw "rectangle 5,5 10,10" square.png

                execSync([
                    `"magick" convert -size 120x120`,
                    `xc:"#${colors.D}"`,
                    `-fill "#${colors.B}" -draw "rectangle 80, 0, 120, 60"`,
                    `-fill "#${colors.C}" -draw "rectangle 0, 80, 60, 120"`,
                    `-fill "#${colors.A}" -draw "rectangle 0, 0, 80, 80"`,
                    `"${paletteFile}"`
                ].join(' '), {stdio: [0, 1, 2]});

                resolve();
            }
        );
    });
};

/**
 * Use Blender to render preview
 */
File.prototype.render = function () {
    // Limit number of render
    return limitRender(() => {
            return new Promise((resolve, reject) => {
                let basename = path.basename(this.name, '.png');
                const rendered = path.join('preview', basename + '.jpg');
                if (fs.existsSync(rendered)) {
                    return resolve();
                }

                const outputdir = path.join('.tmp', basename);
                fs.mkdirSync(outputdir);

                const blender = spawn('blender', [
                    '-b', 'scene.blend',
                    '-o',
                    `//${outputdir}/`,
                    '-P', 'scene-texture.py',
                    '-F', 'JPEG',
                    '-a',
                    '-s', '1',
                    '-e', '1',
                    '-j', '1',
                    '-t', '0',
                    '-E', 'CYCLES',
                ], {
                    stdio: 'pipe',
                    env: {
                        texture: `1024/${this.name}`
                    }
                });

                var stdout = '';
                var stderr = '';

                blender.stdout.on('data', (data) => {
                    stdout += data.toString();

                    var parts = stdout.split('\n');

                    stdout = parts.pop();

                    parts.forEach(value => {
                        this.LOG.info(value);
                    });
                });

                blender.stderr.on('data', (data) => {
                    stderr += data.toString();

                    var parts = stderr.split('\n');

                    stderr = parts.pop();

                    parts.forEach(value => {
                        this.LOG.error(value);
                    });
                });

                blender.on('close', (code) => {
                    if (code !== 0) {
                        return reject(`Blender process exited with code ${code}`);
                    }

                    fs.renameSync(path.join(outputdir, '0001.jpg'), path.join('preview', basename + '.jpg'));

                    rimraf.sync(outputdir);

                    resolve();
                });
            });
        }
    );
};

/**
 * Create resized versions (512, 256, 128, 64)
 */
File.prototype.resize = function () {
    const original = path.join('1024', this.name);
    ['64', '128', '256', '512'].forEach(size => {
        const resized = path.join(size, this.name);
        if (!fs.existsSync(resized)) {
            execSync(`"magick" "${original}" -resize ${size}x${size} -strip "${resized}"`, {stdio: [0, 1, 2]});
        }
    });

    return Promise.resolve();
};


/**
 * Create a zip file with all resources of this texture
 *
 * @returns {Promise<any>}
 */
File.prototype.zip = function () {
    return new Promise((resolve, reject) => {
        let basename = path.basename(this.name, '.png');
        const zippath = path.join('zip', basename + '.zip');
        if (fs.existsSync(zippath)) {
            return resolve();
        }

        var zip = new JSZip();

        [
            {folder: '64', ext: '.png'},
            {folder: '128', ext: '.png'},
            {folder: '256', ext: '.png'},
            {folder: '512', ext: '.png'},
            {folder: '1024', ext: '.png'},
            {folder: 'palette', ext: '.png'},
            {folder: 'preview', ext: '.jpg'},
            {folder: 'zmt', ext: '.zmt'},
        ].forEach(item => {
            let folder = item.folder;
            let ext = item.ext;
            let filename = basename + ext;

            const filepath = path.join(folder, filename);
            if (fs.existsSync(filepath)) {
                var zfolder = zip.folder(folder);
                zfolder.file(filename, fs.createReadStream(filepath));
            }
        });

        // Save zip content
        zip.generateNodeStream({type: 'nodebuffer', streamFiles: true})
            .pipe(fs.createWriteStream(zippath))
            .on('error', reject)
            .on('finish', resolve);
    });
};

// Read all files
fs.readdirSync('1024').forEach(file => {
    FILES.push(new File(file));
});

// Proccess
Promise
    .all(FILES.map(file => {
        // Limit number of files to proccess
        return limitProccess(() => {
            return file.process()
        })
    }))
    .then(value => {
        console.log('Ok!')
    })
    .catch(reason => {
        console.error(reason);
    });

