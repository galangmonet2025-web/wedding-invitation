const fs = require('fs');
const https = require('https');

function download(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                fs.writeFileSync(dest, data);
                resolve();
            });
        }).on('error', err => reject(err));
    });
}

async function run() {
    try {
        console.log('Downloading gold-ivy...');
        await download('https://unityinvitation.com/gold-ivy/', 'gold-ivy.html');
        console.log('Downloading platinum-leslie...');
        await download('https://unityinvitation.com/platinum-leslie/', 'platinum-leslie.html');
        console.log('Done');
    } catch (e) {
        console.error(e);
    }
}
run();
