/* Kompres aset ornamen tema java-vintage lalu bakar jadi data URI.
 *
 * Kenapa: host hanya menyimpan index.html/index.css/index.js ke DB (Sheets) —
 * folder assets/ TIDAK ikut ter-inject. Jadi gambar ornamen harus hidup di
 * dalam CSS sebagai data URI. Ukuran total dijaga kecil karena chunk js/css
 * yang terlalu besar bermasalah di Sheets.
 *
 * Jalankan: node src/sample-theme/java-vintage/assets/build-assets.cjs
 * Output  : assets/inline-assets.json  ({ nama: "data:image/webp;base64,..." })
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIR = __dirname;

// width: lebar target (px). quality: kualitas webp.
const PLAN = [
    // Mural utama — latar cover & panel kiri desktop. Selalu tampil dengan
    // overlay gelap 50% di atasnya, jadi kualitas sedang sudah cukup.
    { file: 'Artboard-1_11zon-3-1.webp', key: 'mural_cover', width: 430, quality: 44 },
    { file: 'Artboard-3_11zon-3.webp', key: 'mural_side', width: 430, quality: 44 },
    // Ornamen transparan — perlu alpha, jadi tetap webp dengan alpha.
    // orn_arch tampil samar di belakang countdown → boleh agresif.
    { file: 'Date-1.webp', key: 'orn_arch', width: 340, quality: 40, alpha: true },
    // Damask = pola yang berulang horizontal. Kita potong SATU motif saja
    // lalu CSS yang mengulang (background-repeat: repeat-x) — jauh lebih
    // hemat daripada menyimpan seluruh strip.
    { file: 'ornmen.webp', key: 'orn_damask', width: 120, quality: 58, alpha: true, tile: true, tileWidth: 180 },
    { file: 'ththt.webp', key: 'orn_frame', width: 340, quality: 46, alpha: true },
    // Layer-0d-2 = bingkai ukir PERSEGI; sdef = bingkai ukir OVAL.
    // (Nama berkas aslinya tidak menunjukkan bentuknya — sudah diperiksa.)
    { file: 'Layer-0d-2.webp', key: 'orn_gold_rect', width: 260, quality: 52, alpha: true },
    { file: 'sdef.webp', key: 'orn_gold_oval', width: 260, quality: 52, alpha: true },
];

(async () => {
    const out = {};
    let total = 0;

    for (const item of PLAN) {
        const src = path.join(DIR, item.file);
        if (!fs.existsSync(src)) {
            console.warn('SKIP (tidak ada):', item.file);
            continue;
        }
        let pipe = sharp(src);

        // Untuk pola berulang: potong TEPAT satu periode motif, diambil dari
        // tengah strip. Periode 180px diukur lewat autokorelasi profil kolom
        // pada ornmen.webp asli (1080px = 6 motif) — kalau meleset sedikit
        // saja, sambungan background-repeat akan terlihat sebagai garis.
        if (item.tile) {
            const meta = await sharp(src).metadata();
            const tileW = item.tileWidth;
            pipe = pipe.extract({
                left: Math.round((meta.width - tileW) / 2 / tileW) * tileW,
                top: 0,
                width: tileW,
                height: meta.height,
            });
        }

        const buf = await pipe
            .resize({ width: item.width, withoutEnlargement: true })
            .webp({ quality: item.quality, alphaQuality: item.alpha ? 80 : 100, effort: 6 })
            .toBuffer();

        out[item.key] = 'data:image/webp;base64,' + buf.toString('base64');
        total += out[item.key].length;
        console.log(
            item.key.padEnd(14),
            String(Math.round(fs.statSync(src).size / 1024) + 'KB').padStart(8),
            '->',
            String(Math.round(buf.length / 1024) + 'KB').padStart(7)
        );
    }

    fs.writeFileSync(path.join(DIR, 'inline-assets.json'), JSON.stringify(out, null, 0));
    console.log('\nTOTAL data-URI:', Math.round(total / 1024) + 'KB');
})();
