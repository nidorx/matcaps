const fs = require('fs');
const JSZip = require('jszip');

/**
 * Padronizar a geração dos artefatos da release
 *
 * Cada diretório .zip
 * Extrair os zmt de seus compactados e incluir no zmt.zip
 */
function todo() {
    new Promise((resolve, reject) => {
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

}
