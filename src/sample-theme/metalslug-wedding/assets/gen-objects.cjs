/* Generate the metalslug-wedding OBJECT atlas as a transparent PNG.
   Draws each object as pixel-art SVG, composited at the exact coords in
   object-frame-map.json. Run with: node gen-objects.js */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS = process.env.MSW_ASSETS || __dirname;
const MAP = JSON.parse(fs.readFileSync(path.join(ASSETS, 'object-frame-map.json'), 'utf8'));

/* ---------- tiny SVG pixel-art helpers (mirror the engine's box/outline shading) ---------- */
function S() { var b = []; return { push: function (s) { b.push(s); }, join: function () { return b.join(''); } }; }
function rect(s, x, y, w, h, fill, op) { s.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${op != null ? ` fill-opacity="${op}"` : ''}/>`); }
function box(s, x, y, w, h, base, hi, sh) {
  rect(s, x, y, w, h, base);
  if (hi) rect(s, x, y, w, Math.max(1, Math.round(h * 0.22)), hi);
  if (sh) rect(s, x, y + h - Math.max(1, Math.round(h * 0.22)), w, Math.max(1, Math.round(h * 0.22)), sh);
}
function outline(s, x, y, w, h, col) { s.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${col || '#10140d'}" stroke-width="2"/>`); }
function circle(s, cx, cy, r, fill, op) { s.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${op != null ? ` fill-opacity="${op}"` : ''}/>`); }
function ellipse(s, cx, cy, rx, ry, fill, op) { s.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${op != null ? ` fill-opacity="${op}"` : ''}/>`); }
function tri(s, x1, y1, x2, y2, x3, y3, fill) { s.push(`<polygon points="${x1},${y1} ${x2},${y2} ${x3},${y3}" fill="${fill}"/>`); }
function line(s, x1, y1, x2, y2, col, w) { s.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w || 2}"/>`); }
function svg(W, H, body) { return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" shape-rendering="crispEdges">${body}</svg>`; }

/* ---------- DRAWERS: scale = cell/baseCell so art fills its (2x) box. Coords are in 2x px. ---------- */
// Each drawer returns an SVG string sized to (w,h). Designed at the listed cell sizes.

function dPow(w, h) { // 48x80 — bearded courier, faces right
  var s = S(); var k = 2; // 2x of the 24x40 procedural
  box(s, 8, 32, 30, 48, '#9a8a5a', '#baaa7a', '#6a5a32');     // ragged body
  box(s, 14, 10, 22, 24, '#f3d2a0', '#ffe6c0', '#d0a878');     // head
  rect(s, 20, 18, 4, 4, '#10140d'); rect(s, 28, 18, 4, 4, '#10140d'); // eyes
  rect(s, 12, 26, 26, 14, '#eeeeee');                          // big white beard
  rect(s, 14, 36, 22, 6, '#dddddd');
  rect(s, 14, 4, 22, 8, '#8a6a3a');                            // hair
  outline(s, 8, 10, 30, 70);
  return svg(w, h, s.join());
}
function dAmplop(w, h, frame) { // 56x40 — envelope w/ heart seal; frame1 = sparkle
  var s = S();
  box(s, 0, 0, 56, 40, '#f3ead2', '#fff8e4', '#d8caa8');
  s.push(`<polyline points="2,2 28,22 54,2" fill="none" stroke="#e23b2e" stroke-width="2"/>`);
  circle(s, 28, 24, 7, '#e23b2e'); circle(s, 24, 22, 4, '#e23b2e'); circle(s, 32, 22, 4, '#e23b2e'); // heart seal
  if (frame === 1) { circle(s, 25, 20, 2.5, '#ffffff', 0.95); rect(s, 44, 6, 3, 3, '#ffffff'); rect(s, 8, 30, 3, 3, '#fff8e4'); } // sparkle
  outline(s, 0, 0, 56, 40, '#b89a48');
  return svg(w, h, s.join());
}
function dCrate(w, h) { // 64x64 weapon crate
  var s = S();
  box(s, 0, 0, 64, 64, '#7a5a2a', '#9a7a4a', '#4a3a18');
  outline(s, 4, 4, 56, 56, '#3a2a14');
  line(s, 4, 4, 60, 60, '#3a2a14', 3); line(s, 60, 4, 4, 60, '#3a2a14', 3);
  rect(s, 24, 24, 16, 16, '#ffd447');                          // star plate
  tri(s, 32, 22, 36, 32, 28, 32, '#fff4b0');
  return svg(w, h, s.join());
}
function dBarrel(w, h, frame) { // 52x72 explosive barrel; frame1 = warning lit
  var s = S();
  box(s, 4, 4, 44, 64, '#7a4a2a', '#9a6a4a', '#4a2a14');
  rect(s, 4, 16, 44, 6, '#3a2414'); rect(s, 4, 48, 44, 6, '#3a2414'); // bands
  var lit = frame === 1;
  rect(s, 18, 28, 16, 16, lit ? '#ffec80' : '#caa83a');        // hazard plate
  tri(s, 26, 30, 32, 42, 20, 42, lit ? '#ff3b30' : '#7a1a14'); // warning triangle
  if (lit) { circle(s, 26, 38, 2.5, '#fff4b0'); }
  outline(s, 4, 4, 44, 64, '#3a2414');
  return svg(w, h, s.join());
}
function dBullet(w, h) { // 24x10 player bullet, faces right
  var s = S();
  rect(s, 0, 0, 24, 10, '#fff4b0'); rect(s, 0, 4, 24, 6, '#ffd447'); rect(s, 0, 2, 6, 6, '#ff8a3d');
  return svg(w, h, s.join());
}
function dEbullet(w, h) { // 18x18 enemy bullet
  var s = S();
  circle(s, 9, 9, 9, '#ff8a3d'); circle(s, 9, 9, 6, '#ff5a4d'); circle(s, 6, 6, 2.4, '#ffffff', 0.85);
  return svg(w, h, s.join());
}
function dRocket(w, h) { // 36x18 rocket, faces right
  var s = S();
  rect(s, 0, 2, 28, 14, '#d0d0d0'); rect(s, 22, 0, 14, 18, '#e23b2e'); rect(s, 0, 6, 8, 6, '#ffd447'); rect(s, 4, 4, 18, 2, '#888888');
  return svg(w, h, s.join());
}
function dNade(w, h) { // 22x24 grenade
  var s = S();
  circle(s, 11, 14, 10, '#3a7d44'); circle(s, 8, 10, 4, '#4a9d54'); rect(s, 8, 0, 6, 6, '#222222');
  return svg(w, h, s.join());
}
function dFlame(w, h, frame) { // 32x32 fire, 3 loop frames
  var s = S();
  var jig = [0, 2, -2][frame], jy = [0, -1, 1][frame];
  circle(s, 16 + jig, 18 + jy, 13, '#ff7b2e', 0.9);
  circle(s, 16 + jig, 20 + jy, 8, '#ffb627', 0.92);
  circle(s, 16 + jig, 22 + jy, 4, '#fff4b0', 0.95);
  tri(s, 16 + jig, 2 + jy, 24, 18, 8, 18, '#ff7b2e');          // licking tongue
  return svg(w, h, s.join());
}
function dSpark(w, h) { var s = S(); circle(s, 7, 7, 7, '#ffffff'); circle(s, 7, 7, 4, '#ffd447'); return svg(w, h, s.join()); }
function dHeart(w, h) { var s = S(); circle(s, 6.5, 8, 6.5, '#4fd6c8'); circle(s, 15.5, 8, 6.5, '#4fd6c8'); tri(s, 1, 10, 21, 10, 11, 22, '#4fd6c8'); return svg(w, h, s.join()); }
function dGround(w, h) { // 128x128 tileable ground (seamless L-R)
  var s = S();
  rect(s, 0, 0, 128, 128, '#3a4a2a');
  rect(s, 0, 0, 128, 16, '#6a8a4a');                           // grass top
  for (var i = 0; i < 128; i += 12) rect(s, i, 0, 6, 10, '#5a7a3a');
  for (var j = 0; j < 16; j++) rect(s, (j * 34) % 120, 32 + (j * 22) % 80, 12, 12, '#2e3a22');
  for (var k = 0; k < 12; k++) rect(s, (k * 46) % 116, 60 + (k * 14) % 56, 8, 8, '#23301c');
  return svg(w, h, s.join());
}
function dPlat(w, h) { // 192x40 platform
  var s = S();
  box(s, 0, 0, 192, 40, '#4a5d3a', '#6a8a4a', '#2e3a25');
  rect(s, 0, 0, 192, 8, '#6a8a4a');
  for (var i = 16; i < 192; i += 32) rect(s, i, 16, 4, 20, '#2e3a25');
  return svg(w, h, s.join());
}
function dSpike(w, h) { // 96x36 spikes
  var s = S();
  rect(s, 0, 24, 96, 12, '#3a2a18');
  for (var i = 0; i < 6; i++) { tri(s, i * 16, 32, i * 16 + 8, 0, i * 16 + 16, 32, '#8a8a92'); }
  for (var j = 0; j < 6; j++) tri(s, j * 16 + 4, 28, j * 16 + 8, 4, j * 16 + 8, 28, '#c0c0c8');
  return svg(w, h, s.join());
}
function dCage(w, h) { // 152x192 cage bars (transparent between)
  var s = S();
  for (var i = 0; i <= 152; i += 26) line(s, i, 0, i, 192, '#c7b37a', 4);
  for (var j = 0; j <= 192; j += 48) line(s, 0, j, 152, j, '#c7b37a', 4);
  outline(s, 0, 0, 152, 192, '#8a7a4a'); s.push(`<rect x="0" y="0" width="152" height="192" fill="none" stroke="#8a7a4a" stroke-width="5"/>`);
  return svg(w, h, s.join());
}
function dCouple(w, h) { // 120x160 caged couple silhouette
  var s = S();
  // groom (left)
  box(s, 12, 56, 32, 96, '#23262e', '#3a3e48', '#14161c');
  rect(s, 22, 60, 12, 48, '#ffffff'); rect(s, 26, 60, 4, 28, '#e23b2e'); // shirt+tie
  box(s, 18, 28, 20, 24, '#f3d2a0', '#ffe6c0', '#d0a878'); rect(s, 18, 24, 20, 10, '#2a2218');
  // bride (right)
  box(s, 68, 60, 36, 92, '#f3ead2', '#fff8e4', '#d8caa8');
  rect(s, 66, 32, 40, 40, '#ffffff'); s.push(`<rect x="66" y="32" width="40" height="40" fill="#ffffff" fill-opacity="0.7"/>`); // veil
  box(s, 76, 28, 20, 24, '#f3d2a0', '#ffe6c0', '#d0a878'); rect(s, 74, 24, 24, 10, '#6a4a2a');
  circle(s, 86, 80, 6, '#ff8ab0'); // bouquet
  return svg(w, h, s.join());
}
function dArch(w, h) { // 240x260 wedding arch
  var s = S();
  rect(s, 16, 40, 24, 220, '#c7b37a'); rect(s, 200, 40, 24, 220, '#c7b37a');     // pillars
  rect(s, 16, 32, 208, 28, '#d7c38a');                                            // top beam
  for (var i = 0; i < 8; i++) circle(s, 28 + i * 26, 44, 10, '#ff8ab0');           // flowers
  for (var j = 0; j < 6; j++) circle(s, 20 + j * 4, 60 + j * 32, 12, '#6a8a4a');    // vines L
  for (var k = 0; k < 6; k++) circle(s, 220 - k * 4, 60 + k * 32, 12, '#6a8a4a');   // vines R
  return svg(w, h, s.join());
}
function dPalm(w, h) { // 140x220 palm tree
  var s = S();
  rect(s, 60, 80, 20, 140, '#5a3a1a'); rect(s, 60, 80, 8, 140, '#6a4a24');
  tri(s, 70, 80, 4, 36, 60, 72, '#2e6a3a'); tri(s, 70, 80, 136, 36, 80, 72, '#2e6a3a');
  tri(s, 70, 76, 28, 4, 64, 68, '#2e6a3a'); tri(s, 70, 76, 112, 4, 76, 68, '#2e6a3a');
  tri(s, 70, 80, 20, 56, 66, 72, '#3a8a4a'); tri(s, 70, 80, 120, 56, 74, 72, '#3a8a4a');
  circle(s, 70, 80, 8, '#ffd447'); circle(s, 80, 84, 6, '#ffd447');                 // coconuts
  return svg(w, h, s.join());
}
function dBush(w, h) { // 108x60 bush
  var s = S();
  circle(s, 28, 40, 28, '#2e5d3a'); circle(s, 60, 32, 32, '#2e5d3a'); circle(s, 88, 42, 24, '#2e5d3a');
  circle(s, 40, 28, 14, '#3a7d4a'); circle(s, 72, 24, 12, '#3a7d4a');
  return svg(w, h, s.join());
}
function dSandbag(w, h) { // 92x60 sandbags
  var s = S();
  for (var r = 0; r < 2; r++) for (var c = 0; c < 3; c++) {
    var x = 4 + c * 30 + (r % 2 ? 14 : 0), y = 4 + r * 26;
    box(s, x, y, 28, 24, '#9a8a5a', '#baaa7a', '#6a5a32'); outline(s, x, y, 28, 24, '#5a4a2a');
  }
  return svg(w, h, s.join());
}
function dFlag(w, h, frame) { // 80x120 flag, 3 wave frames; pole fixed
  var s = S();
  rect(s, 4, 0, 8, 120, '#b7a36a');                            // pole
  // wave: shift the cloth tip points per frame
  var tipY = [24, 14, 34][frame], midX = [60, 70, 52][frame];
  s.push(`<polygon points="12,4 ${midX},${tipY} 12,48" fill="#e23b2e"/>`);
  circle(s, 30, 24, 8, '#ffd447');                             // emblem
  return svg(w, h, s.join());
}

const DRAW = {
  t_pow: dPow, t_amplop: dAmplop, t_crate: dCrate, t_barrel: dBarrel,
  t_bullet: dBullet, t_ebullet: dEbullet, t_rocket: dRocket, t_nade: dNade,
  t_flame: dFlame, t_spark: dSpark, t_heart: dHeart, t_ground: dGround,
  t_plat: dPlat, t_spike: dSpike, t_cage: dCage, t_couple_caged: dCouple,
  t_arch: dArch, t_palm: dPalm, t_bush: dBush, t_sandbag: dSandbag, t_flag: dFlag
};

/* GUIDE BORDER: a 2px hollow rect drawn JUST OUTSIDE each frame's slice rect, so when you
   replace an object manually you can see the exact cell boundary. It sits in the empty margin
   around the cell (frames are laid out with padding/gaps) and does NOT overlap content — and
   since it's outside the [x,y,w,h] the engine slices, it is NEVER picked up by the slicer.
   BORDER_PX = stroke width; BG = the magenta guide color. Set DRAW_BORDER=false to omit. */
const DRAW_BORDER = true;
const BORDER_PX = 2;
const BORDER_COL = '#ff00d8';

(async () => {
  // atlas size = bounding box of all frames + margin (leave room for the outside borders)
  var W = 0, H = 0;
  Object.values(MAP).forEach(o => o.frames.forEach(f => { W = Math.max(W, f.x + f.w); H = Math.max(H, f.y + f.h); }));
  W += 14; H += 14;
  var composites = [];
  for (const [key, o] of Object.entries(MAP)) {
    for (const f of o.frames) {
      const draw = DRAW[key];
      const svgStr = draw(f.w, f.h, f.i);
      const buf = await sharp(Buffer.from(svgStr)).resize(f.w, f.h).png().toBuffer();
      composites.push({ input: buf, left: f.x, top: f.y });
    }
  }
  // overlay all guide borders in ONE transparent SVG layer (drawn OUTSIDE each slice rect)
  if (DRAW_BORDER) {
    var rects = '';
    Object.values(MAP).forEach(o => o.frames.forEach(f => {
      var bx = f.x - BORDER_PX, by = f.y - BORDER_PX, bw = f.w + BORDER_PX * 2, bh = f.h + BORDER_PX * 2;
      // stroke centered on the path; inset by half so the rect's OUTER edge hugs the cell border
      rects += `<rect x="${bx + BORDER_PX / 2}" y="${by + BORDER_PX / 2}" width="${bw - BORDER_PX}" height="${bh - BORDER_PX}" fill="none" stroke="${BORDER_COL}" stroke-width="${BORDER_PX}" shape-rendering="crispEdges"/>`;
    }));
    var borderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${rects}</svg>`;
    composites.push({ input: Buffer.from(borderSvg), left: 0, top: 0 });
  }
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(composites).png().toFile(path.join(ASSETS, 'object-sprite-sheet.png'));
  console.log('wrote object-sprite-sheet.png', W + 'x' + H, '(' + composites.length + ' layers, border=' + DRAW_BORDER + ')');
})();
