const pLimit = require('p-limit');

// Limit Proccessing images
const limitProccess = pLimit(10);

// Limit Proccessing render (Blender)
const limitRender = pLimit(2);


for (var a = 0; a < 100; a++) {
    (function (a) {
        limitRender(() => {
            console.log('start ', a);
            return new Promise(resolve => {
                console.log('inside ', a);
                setTimeout(() => {
                    console.log('resolve ', a);
                    resolve();
                }, 2000)
            })
        })
    })(a)
}
