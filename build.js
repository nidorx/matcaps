const fs = require('fs');
const path = require('path');
const JimpO = require('Jimp');
const circle = require('@jimp/plugin-circle');
const configure = require('@jimp/custom');
const child_process = require('child_process');
const Vibrant = require('node-vibrant');

const Jimp = configure({plugins: [circle]}, JimpO);

// Temp dir
if (!fs.existsSync('./.tmp')) {
    fs.mkdirSync('./.tmp');
}

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
 *      2 - Redimensionar para 512,256,128,64
 *      3 - Renderizar cena de testes em 512 e 128px
 * 6 - Gerar documentação de todos os materiais
 *
 * @TODO: Verificar se possui zmt associado (mesmo nome)
 */

/**
 * Dimensões do cubo menor
 *
 * @type {number}
 */
const CUBE_SMALL = 40;
const CUB_BIG = CUBE_SMALL * 2;
const CUBE_MAX = CUBE_SMALL * 3;

const FILES = [];

var REG_FILE_NAME_COLORS = /^([A-F0-9]{6})_([A-F0-9]{6})_([A-F0-9]{6})_([A-F0-9]{6})_([A-F0-9]{6})_([A-F0-9]{6}).*/;

/**
 * Work with one file (all references)
 *
 * @param name
 * @constructor
 */
function File(name) {
    this.name = name;

    /**
     * Remove this file from disk (All references)
     */
    this.delete = function () {
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
     * Get this file extension
     *
     * @returns {string}
     */
    this.extension = function () {
        return path.extname(this.name);
    };


    this.validate = function () {
        return new Promise((resolve, reject) => {
            const ext = this.extension();
            switch (ext.toLowerCase()) {
                case '.jpg':
                case '.bmp':
                case '.tif':
                case '.tiff':
                    // @TODO: tif
                    // case '.tif':
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

                    console.log(`Converting "${original}" to "${renamed}"`);

                    if (['.jpg', '.bmp'].indexOf(ext) >= 0) {
                        Jimp.read(original)
                            .then((image) => {
                                return image.writeAsync(renamed);
                            })
                            .then(() => {
                                // Remove original
                                fs.unlinkSync(original);
                                console.log(`Success converted "${original}" to "${renamed}"`);
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
                        console.log(`Success converted "${original}" to "${renamed}"`);
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

    this.compact = function () {

    };

    /**
     * Remover arquivos com dimensão menor que 1024x1024
     * Redimensionar arquivos com dimensão maior que 1024x1024 para esse valor
     */
    this.validateDimension = function () {
        let filepath = path.join('1024', this.name);
        return Jimp.read(filepath)
            .then((image) => {
                var width = image.bitmap.width;
                var height = image.bitmap.height;

                if (width === 1024 && height === 1024) {
                    // Ok
                    return this.proccessPalette();
                }

                if (width < 1024 || height < 1024) {
                    // Remover arquivos com dimensão menor que 1024x1024
                    console.warn(`Removing "${filepath}": invalid resolution ${width}x${height}`);
                    return this.delete();
                }

                if (width !== height) {
                    // Remove imagens que não são quadradas
                    console.warn(`Removing "${filepath}": invalid resolution ${width}x${height}`);
                    return this.delete();
                }

                console.info(`Resizing "${filepath}" from ${width}x${height} to 1024x1024"`);

                return image
                    .resize(1024, 1024)
                    .writeAsync(filepath)
                    .then(() => {
                        console.info(`Success resized "${filepath}"`);
                        return this.proccessPalette();
                    });
            });
    };

    /**
     * Faz o processamento da paleta de cores do arquivo
     *
     * @returns {Promise<any>}
     */
    this.proccessPalette = function () {
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
                return Jimp.read(original)
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

                        console.info(`Renaming "${original}" to "${renamed}"`);

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
    this.createPaletteCube = function () {
        return new Promise((resolve, reject) => {
            // palette
            const paletteFile = path.join('palette', this.name + '.png');
            fs.exists(paletteFile, (exists) => {
                if (exists) {
                    return resolve();
                }

                const colors = {
                    A: Jimp.cssColorToHex(this.palette.Vibrant),
                    B: Jimp.cssColorToHex(this.palette.LightVibrant),
                    C: Jimp.cssColorToHex(this.palette.DarkVibrant),
                    D: Jimp.cssColorToHex(this.palette.LightMuted),
                    E: Jimp.cssColorToHex(this.palette.DarkMuted),
                    F: Jimp.cssColorToHex(this.palette.Muted)
                };

                new Jimp(CUBE_MAX, CUBE_MAX, function (err, image) {
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
                        .then(resolve)
                        .catch(reject);
                });
            });
        });
    }
}

// Read all files
fs.readdirSync('1024')
    .forEach(file => {
        FILES.push(new File(file));
    });


Promise.all(FILES.map(file => file.validate()))
    .then(value => {

    })
    .catch(reason => {
        console.error(reason);
    });

