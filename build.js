const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const rimraf = require("rimraf");

const child_process = require('child_process');
const spawn = require('child_process').spawn;

const Vibrant = require('node-vibrant');

const Jimp = require('Jimp');
const JimpCustom = require('@jimp/custom');
const JimpCircle = require('@jimp/plugin-circle');

const pLimit = require('p-limit');

// Limit Proccessing images
const limitProccess = pLimit(10);

// Limit Proccessing render (Blender)
const limitRender = pLimit(2);

const JimpC = JimpCustom({plugins: [JimpCircle]}, Jimp);

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
var REG_FILE_NAME_COLORS = /^([A-F0-9]{6})_([A-F0-9]{6})_([A-F0-9]{6})_([A-F0-9]{6})_([A-F0-9]{6})_([A-F0-9]{6}).*/;

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

    // this.LOG.info('Teste de color asdf');
    // this.LOG.warn('Teste de color asdf');
    // this.LOG.error('Teste de color asdf');
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
};

/**
 * Initialize file proccess
 *
 * @returns {Promise<any>}
 */
File.prototype.process = function () {
    return new Promise((resolve, reject) => {

        // Get this file extension
        const ext = path.extname(this.name);
        switch (ext.toLowerCase()) {
            case '.jpg':
            case '.bmp':
            case '.tif':
            case '.tiff':
                const original = path.join('1024', this.name);
                let renamed = path.join('1024', path.basename(original, ext) + '.png');
                let inc = 1;
                while (true) {
                    if (fs.existsSync(renamed)) {
                        renamed = path.join('1024', path.basename(original, ext) + '-' + (inc++) + '.png');
                    } else {
                        break;
                    }
                }

                if (['.jpg', '.bmp'].indexOf(ext) >= 0) {
                    JimpC.read(original)
                        .then((image) => {
                            return image.writeAsync(renamed);
                        })
                        .then(() => {
                            // Remove original
                            fs.unlinkSync(original);
                            this.name = path.basename(renamed);

                            return this.validateDimension();
                        })
                        .then(resolve)
                        .catch(reject);
                } else {
                    // Use imagemagick, considere export from ZBrush (96bits C50 tif)
                    child_process.execSync(`"magick" "${original}" -quality 100 -profile ./sRGB2014.icc "${renamed}"`, {stdio: [0, 1, 2]});

                    // Remove original
                    fs.unlinkSync(original);
                    this.name = path.basename(renamed);

                    this.validateDimension()
                        .then(resolve)
                        .catch(reject);
                }

                break;
            case '.png':
                return this.validateDimension()
                    .then(resolve)
                    .catch(reject);
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
    return JimpC.read(filepath)
        .then((image) => {
            var width = image.bitmap.width;
            var height = image.bitmap.height;

            if (width === 1024 && height === 1024) {
                // Ok
                return this.proccessPalette();
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

            return image
                .resize(1024, 1024)
                .writeAsync(filepath)
                .then(() => {
                    return this.proccessPalette();
                });
        });
};

/**
 * Faz o processamento da paleta de cores do arquivo
 *
 * @returns {Promise<any>}
 */
File.prototype.proccessPalette = function () {
    return new Promise((resolve, reject) => {
        if (!this.palette) {
            var parts = this.name.match(REG_FILE_NAME_COLORS);
            if (parts) {
                this.palette = {
                    Vibrant: parts[1],
                    Muted: parts[2],
                    LightVibrant: parts[3],
                    LightMuted: parts[4],
                    DarkVibrant: parts[5],
                    DarkMuted: parts[6]
                };

                return this.createPaletteCube()
                    .then(resolve)
                    .catch(reject);
            }

            // Gera a paleta a partir da imagem original, e renomeia o arquivo atual

            const original = path.join('1024', this.name);
            const circular = path.join('.tmp', path.basename(original, '.png') + '.png');
            return JimpC.read(original)
                .then((image) => {
                    // Create circular iamge
                    return image.circle().writeAsync(circular);
                })
                .then(value => {
                    // Get palette
                    return Vibrant.from(circular).getPalette();
                })
                .then(palette => {


                    // Get name from palette
                    // Ex. C65646_B36458_EC8C83_841D14_6A1B17_753B3C
                    var name = [
                        palette.Vibrant.getHex(),
                        palette.Muted.getHex(),
                        palette.LightVibrant.getHex(),
                        palette.LightMuted.getHex(),
                        palette.DarkVibrant.getHex(),
                        palette.DarkMuted.getHex()
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

                    this.name = name;
                })
                .then(value => {
                    // Check agai, by name now
                    return this.proccessPalette();
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
 * A = Vibrant
 * B = LightVibrant
 * C = DarkVibrant
 * D = LightMuted
 * E = DarkMuted
 * F = Muted
 *
 * +----------------+--------+
 * |                |        |
 * |                |   B    |
 * |                |        |
 * |      A         +--------+
 * |                |        |
 * |                |    C   |
 * |                |        |
 * +--------+----------------+
 * |        |       |        |
 * |   D    |   E   |   F    |
 * |        |       |        |
 * +--------+-------+--------+
 */
File.prototype.createPaletteCube = function () {
    return new Promise((resolve, reject) => {
        // palette
        const paletteFile = path.join('palette', this.name);
        fs.exists(paletteFile, (exists) => {
            if (exists) {
                return this.render()
                    .then(resolve)
                    .catch(reject);
            }

            const colors = {
                A: JimpC.cssColorToHex(this.palette.Vibrant),
                B: JimpC.cssColorToHex(this.palette.LightVibrant),
                C: JimpC.cssColorToHex(this.palette.DarkVibrant),
                D: JimpC.cssColorToHex(this.palette.LightMuted),
                E: JimpC.cssColorToHex(this.palette.DarkMuted),
                F: JimpC.cssColorToHex(this.palette.Muted)
            };

            new JimpC(CUBE_MAX, CUBE_MAX, (err, image) => {
                if (err) {
                    return reject(e);
                }

                let hexColor;
                for (var x = 0; x < CUBE_MAX; x++) {
                    for (var y = 0; y < CUBE_MAX; y++) {
                        if (x < CUB_BIG && y < CUB_BIG) {
                            hexColor = colors.A;
                        } else if (x >= CUB_BIG && y < CUBE_SMALL) {
                            hexColor = colors.B;
                        } else if (x >= CUB_BIG && y < CUB_BIG) {
                            hexColor = colors.C;
                        } else if (x < CUBE_SMALL && y >= CUB_BIG) {
                            hexColor = colors.D;
                        } else if (x < CUB_BIG && y >= CUB_BIG) {
                            hexColor = colors.E;
                        } else {
                            hexColor = colors.F;
                        }
                        image.setPixelColor(hexColor, x, y);
                    }
                }

                image.writeAsync(paletteFile)
                    .then(() => {
                        return this.render();
                    })
                    .then(resolve)
                    .catch(reject);
            });
        });
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
                '-o', `//${outputdir}/`,
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
                this.LOG.info(`child process exited with code ${code}`);
                if (code !== 0) {
                    return reject(`Blender process exited with code ${code}`);
                }

                fs.renameSync(path.join(outputdir, '0001.jpg'), path.join('preview', basename + '.jpg'));

                rimraf.sync(outputdir);

                resolve();
            });
        });
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

