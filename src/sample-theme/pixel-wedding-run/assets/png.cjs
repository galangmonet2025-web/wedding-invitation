/* PNG baca/tulis minimal (RGBA8) — cukup untuk menyusun sprite sheet.
   Mendukung color type 6 (RGBA) & 2 (RGB) & 3 (palette) & 0 (grey), bit depth 8. */
const fs = require('fs'), zlib = require('zlib');

function crcTable() {
  const t = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
}
const TB = crcTable();
function crc(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = TB[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

function paeth(a, b, c) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }

/* -> {w,h,data:Buffer RGBA} */
function readPNG(path) {
  const b = fs.readFileSync(path);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error('bukan PNG: ' + path);
  let p = 8, w = 0, h = 0, depth = 8, ctype = 6, idat = [], plte = null, trns = null;
  while (p < b.length) {
    const len = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8), d = b.slice(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; ctype = d[9]; }
    else if (type === 'PLTE') plte = d;
    else if (type === 'tRNS') trns = d;
    else if (type === 'IDAT') idat.push(d);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8) throw new Error('bit depth ' + depth + ' tidak didukung: ' + path);
  const ch = ctype === 6 ? 4 : ctype === 2 ? 3 : ctype === 4 ? 2 : 1;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch, out = Buffer.alloc(w * h * ch);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[q++]; const line = raw.slice(q, q + stride); q += stride;
    const prev = y > 0 ? out.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    const cur = out.slice(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const A = i >= ch ? cur[i - ch] : 0, B = prev[i], C = i >= ch ? prev[i - ch] : 0;
      let v = line[i];
      if (f === 1) v += A; else if (f === 2) v += B; else if (f === 3) v += (A + B) >> 1; else if (f === 4) v += paeth(A, B, C);
      cur[i] = v & 255;
    }
  }
  /* normalisasi ke RGBA */
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0, n = w * h; i < n; i++) {
    let r, g, bl, a = 255;
    if (ctype === 6) { r = out[i * 4]; g = out[i * 4 + 1]; bl = out[i * 4 + 2]; a = out[i * 4 + 3]; }
    else if (ctype === 2) { r = out[i * 3]; g = out[i * 3 + 1]; bl = out[i * 3 + 2]; }
    else if (ctype === 3) { const ix = out[i]; r = plte[ix * 3]; g = plte[ix * 3 + 1]; bl = plte[ix * 3 + 2]; if (trns && ix < trns.length) a = trns[ix]; }
    else if (ctype === 0) { r = g = bl = out[i]; }
    else { r = g = bl = out[i * 2]; a = out[i * 2 + 1]; }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = bl; rgba[i * 4 + 3] = a;
  }
  return { w, h, data: rgba };
}

function writePNG(path, w, h, rgba) {
  const stride = w * 4, raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const chunk = (t, d) => {
    const l = Buffer.alloc(4); l.writeUInt32BE(d.length, 0);
    const td = Buffer.concat([Buffer.from(t, 'ascii'), d]);
    const cb = Buffer.alloc(4); cb.writeUInt32BE(crc(td), 0);
    return Buffer.concat([l, td, cb]);
  };
  const ih = Buffer.alloc(13);
  ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  fs.writeFileSync(path, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ih),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]));
}

/* Salin persegi src -> dst.
   `dstW`/`dstH` opsional: kalau diisi, potongan diperbesar/diperkecil ke
   ukuran itu dengan nearest-neighbour (piksel tetap tajam, tanpa blur).
   Dipakai untuk merakit tiang batu langsung pada ukuran dunia akhir. */
function blit(src, sx, sy, sw, sh, dst, dw, dx, dy, dstW, dstH) {
  const tw = dstW || sw, th = dstH || sh;
  for (let y = 0; y < th; y++) {
    const syy = sy + Math.floor(y * sh / th);
    if (syy < 0 || syy >= src.h) continue;
    for (let x = 0; x < tw; x++) {
      const sxx = sx + Math.floor(x * sw / tw);
      if (sxx < 0 || sxx >= src.w) continue;
      const s = (syy * src.w + sxx) * 4, d = ((dy + y) * dw + dx + x) * 4;
      if (d < 0 || d + 3 >= dst.length) continue;
      dst[d] = src.data[s]; dst[d + 1] = src.data[s + 1];
      dst[d + 2] = src.data[s + 2]; dst[d + 3] = src.data[s + 3];
    }
  }
}

/* kotak non-transparan (buat memangkas ruang kosong) */
function bbox(src, sx, sy, sw, sh) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const a = src.data[((sy + y) * src.w + sx + x) * 4 + 3];
    if (a > 8) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

module.exports = { readPNG, writePNG, blit, bbox };
