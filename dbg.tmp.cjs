const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('src/sample-theme/rpg-quest-wedding/index.html', 'utf8');

// cari url() di sumber HTML
const urls = html.match(/url\([^)]*\)/g) || [];
console.log('=== url() di sumber ===');
urls.forEach(u => console.log('  ', u.length > 90 ? u.slice(0, 90) + '...' : u));

// cari yang berpotensi kosong
console.log('\n=== url() kosong potensial ===');
const idx = html.indexOf('url("")');
console.log('literal url("") di sumber?', idx);

// cek CSS juga
const css = fs.readFileSync('src/sample-theme/rpg-quest-wedding/index.css', 'utf8');
const cssEmpty = css.match(/url\(\s*["']?\s*["']?\s*\)/g) || [];
console.log('url("") di CSS:', cssEmpty.length);
