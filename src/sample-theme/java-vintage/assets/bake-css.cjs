/* Bakar data URI dari inline-assets.json ke dalam index.css.
 *
 * index.css memakai placeholder __MURAL_COVER__ dst. Script ini menggantinya
 * dengan data URI, DAN bisa dijalankan berulang: kalau placeholder sudah
 * tergantikan, ia mengenali blok data URI lama lalu menimpanya.
 *
 * Jalankan: node src/sample-theme/java-vintage/assets/bake-css.cjs
 */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const CSS = path.join(DIR, '..', 'index.css');
const ASSETS = JSON.parse(fs.readFileSync(path.join(DIR, 'inline-assets.json'), 'utf8'));

// placeholder -> key di inline-assets.json
const MAP = {
    __MURAL_COVER__: 'mural_cover',
    __MURAL_SIDE__: 'mural_side',
    __ORN_ARCH__: 'orn_arch',
    __ORN_DAMASK__: 'orn_damask',
    __ORN_FRAME__: 'orn_frame',
    __ORN_GOLD_OVAL__: 'orn_gold_oval',
    __ORN_GOLD_RECT__: 'orn_gold_rect',
};

// Nama variabel CSS yang memegang tiap aset — dipakai untuk menimpa nilai
// lama saat script dijalankan ulang.
const VAR_OF = {
    __MURAL_COVER__: '--jv-mural-cover',
    __MURAL_SIDE__: '--jv-mural-side',
    __ORN_ARCH__: '--jv-orn-arch',
    __ORN_DAMASK__: '--jv-orn-damask',
    __ORN_FRAME__: '--jv-orn-frame',
    __ORN_GOLD_OVAL__: '--jv-orn-oval',
    __ORN_GOLD_RECT__: '--jv-orn-rect',
};

let css = fs.readFileSync(CSS, 'utf8');

for (const [ph, key] of Object.entries(MAP)) {
    const uri = ASSETS[key];
    if (!uri) throw new Error('Aset tidak ada di inline-assets.json: ' + key);

    if (css.includes(ph)) {
        css = css.split(ph).join(uri);
        continue;
    }

    // Sudah pernah dibakar: timpa nilai variabelnya.
    const cssVar = VAR_OF[ph];
    const re = new RegExp('(' + cssVar + '\\s*:\\s*url\\(\')[^\']*(\'\\))');
    if (!re.test(css)) throw new Error('Tidak menemukan placeholder maupun nilai lama untuk ' + key);
    css = css.replace(re, '$1' + uri + '$2');
}

fs.writeFileSync(CSS, css);
console.log('index.css:', Math.round(css.length / 1024) + 'KB');
