/* ============================================================================
   FOREST RPG WEDDING — DEBUG.js
   ----------------------------------------------------------------------------
   CARA PAKAI:
   1. Buka Theme Editor -> tab JavaScript.
   2. TEMPEL ISI FILE INI **DI PALING ATAS**, SEBELUM isi index.js.
      (jadi urutannya:  [isi DEBUG.js]  lalu  [isi index.js])
   3. Simpan -> buka preview.
   4. Akan muncul PANEL HITAM di layar berisi hasil diagnosa.
   5. Screenshot panel itu / tekan tombol "SALIN" lalu kirim hasilnya ke saya.

   Panel ini menangkap error yang biasanya DITELAN host
   (ThemeWrapper membungkus JS tema dalam try/catch + console.error).
   ============================================================================ */
(function () {
  'use strict';

  var LOG = [];
  var t0 = Date.now();

  function log(tag, msg) {
    var line = '[' + String(Date.now() - t0).padStart(5, ' ') + 'ms] ' + tag + ' ' + msg;
    LOG.push(line);
    render();
    try { console.log('FRPG-DEBUG ' + line); } catch (e) {}
  }

  // ---------- panel ----------
  var box, pre;
  function render() {
    if (!box) return;
    pre.textContent = LOG.join('\n');
  }
  function buildPanel() {
    if (document.getElementById('frpg-debug-box')) return;
    box = document.createElement('div');
    box.id = 'frpg-debug-box';
    box.style.cssText = [
      'position:fixed', 'left:8px', 'right:8px', 'bottom:8px', 'max-height:52vh',
      'z-index:2147483647', 'background:#0b0f0a', 'color:#9dff9d',
      'border:2px solid #6ad06a', 'font:11px/1.45 monospace',
      'padding:8px', 'overflow:auto', 'white-space:pre-wrap', 'border-radius:4px'
    ].join(';');
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;position:sticky;top:0;background:#0b0f0a;padding-bottom:4px';
    bar.innerHTML = '<b style="color:#e8c15a;flex:1">FRPG DEBUG</b>';
    var copy = document.createElement('button');
    copy.textContent = 'SALIN';
    copy.style.cssText = 'font:11px monospace;background:#2c3a22;color:#e8f0d8;border:1px solid #6ad06a;padding:3px 8px;cursor:pointer';
    copy.onclick = function () {
      var t = LOG.join('\n');
      try {
        if (navigator.clipboard) navigator.clipboard.writeText(t);
        else { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
        copy.textContent = 'TERSALIN';
      } catch (e) { copy.textContent = 'GAGAL'; }
    };
    var hide = document.createElement('button');
    hide.textContent = 'TUTUP';
    hide.style.cssText = copy.style.cssText;
    hide.onclick = function () { box.style.display = 'none'; };
    bar.appendChild(copy); bar.appendChild(hide);
    pre = document.createElement('div');
    box.appendChild(bar); box.appendChild(pre);
    (document.body || document.documentElement).appendChild(box);
    render();
  }
  buildPanel();
  if (!document.body) {
    var iv = setInterval(function () { if (document.body) { clearInterval(iv); buildPanel(); } }, 30);
  }

  // ---------- 1. tangkap error global ----------
  window.addEventListener('error', function (e) {
    log('!! JS-ERROR', (e.message || '?') + ' @ ' + (e.filename || '?') + ':' + (e.lineno || '?'));
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    log('!! PROMISE', String((e.reason && e.reason.message) || e.reason));
  });

  // Host menelan error tema lewat console.error -> bajak supaya terlihat
  var origErr = console.error;
  console.error = function () {
    try {
      var s = Array.prototype.map.call(arguments, function (a) {
        if (a && a.stack) return String(a.message) + '\n    ' + String(a.stack).split('\n').slice(0, 4).join('\n    ');
        return String(a);
      }).join(' ');
      if (s.indexOf('Theme JS error') >= 0) log('!! HOST-CATCH', s);
      else log('   console.error', s.slice(0, 220));
    } catch (e) {}
    return origErr.apply(console, arguments);
  };

  log('OK', 'debug panel aktif');

  // ---------- 2. lingkungan ----------
  log('ENV', 'readyState=' + document.readyState +
       ' | UA=' + (navigator.userAgent.match(/(Chrome|Firefox|Safari|Edg)\/[\d.]+/) || ['?'])[0]);
  log('ENV', 'Phaser=' + (window.Phaser ? ('ADA v' + window.Phaser.VERSION) : 'BELUM ADA') +
       ' | UIkit=' + (window.UIkit ? 'ADA' : '-') +
       ' | bootstrap=' + (window.bootstrap ? 'ADA' : '-'));
  log('ENV', 'localStorage=' + (function () {
    try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return 'OK'; }
    catch (e) { return 'DIBLOKIR (' + e.name + ')'; }
  })());
  log('ENV', 'canvas2d=' + (function () {
    try { return document.createElement('canvas').getContext('2d') ? 'OK' : 'NULL'; }
    catch (e) { return 'THROW: ' + e.message; }
  })());

  // ---------- 3. cek DOM tema ----------
  setTimeout(function () {
    function has(id) { return document.getElementById(id) ? 'ADA' : '**HILANG**'; }
    log('DOM', '#inv-source=' + has('inv-source') +
         ' | section=' + document.querySelectorAll('#inv-source > section[data-info]').length);
    log('DOM', '#frpg-stage=' + has('frpg-stage') +
         ' | #frpg-cover=' + has('frpg-cover') +
         ' | #frpg-start-btn=' + has('frpg-start-btn'));
    log('DOM', 'indikator kepingan=' +
         document.querySelectorAll('#frpg-pieces .frpg-piece-ico').length +
         ' (0 = wireUI TIDAK jalan)');

    var st = document.getElementById('frpg-stage');
    if (st) {
      var r = st.getBoundingClientRect();
      log('DOM', '#frpg-stage size=' + Math.round(r.width) + 'x' + Math.round(r.height) +
           (r.width < 8 || r.height < 8 ? '  ** UKURAN 0 -> game tak akan boot **' : ''));
    }

    // ---------- 4. apakah tombol tertutup elemen lain? ----------
    var btn = document.getElementById('frpg-start-btn');
    if (btn) {
      var b = btn.getBoundingClientRect();
      var cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      var top = document.elementFromPoint(cx, cy);
      var isSelf = top === btn || (top && btn.contains(top));
      log('HIT', 'START rect=' + Math.round(b.width) + 'x' + Math.round(b.height) +
           ' @' + Math.round(cx) + ',' + Math.round(cy));
      log('HIT', 'elemen di titik itu = ' +
           (top ? '<' + top.tagName.toLowerCase() +
                  (top.id ? '#' + top.id : '') +
                  (top.className && typeof top.className === 'string' ? '.' + top.className.trim().split(/\s+/).join('.') : '') + '>'
               : 'null'));
      log('HIT', isSelf ? 'OK -> tombol BISA diklik'
                        : '** TOMBOL TERTUTUP ELEMEN LAIN -> INI PENYEBABNYA **');

      var cs = getComputedStyle(btn);
      log('CSS', 'START pointer-events=' + cs.pointerEvents +
           ' display=' + cs.display + ' visibility=' + cs.visibility +
           ' opacity=' + cs.opacity + ' z-index=' + cs.zIndex);

      // telusuri ancestor yang mematikan pointer / menyembunyikan
      var p = btn.parentElement, depth = 0;
      while (p && depth++ < 12) {
        var c = getComputedStyle(p);
        if (c.pointerEvents === 'none' || c.display === 'none' ||
            c.visibility === 'hidden' || parseFloat(c.opacity) === 0) {
          log('CSS', '** ancestor bermasalah: <' + p.tagName.toLowerCase() +
               (p.id ? '#' + p.id : '') + '> pointer-events=' + c.pointerEvents +
               ' display=' + c.display + ' visibility=' + c.visibility + ' opacity=' + c.opacity);
        }
        p = p.parentElement;
      }
    } else {
      log('HIT', '** #frpg-start-btn TIDAK ADA di DOM **');
    }

    // ---------- 5. apakah listener benar-benar terpasang? ----------
    var probe = document.getElementById('frpg-cheat-btn');
    if (probe) {
      var fired = false;
      var mark = function () { fired = true; };
      probe.addEventListener('click', mark, true);
      probe.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      probe.removeEventListener('click', mark, true);
      log('EVT', 'dispatch klik ke ★ -> event ' + (fired ? 'SAMPAI' : 'TIDAK SAMPAI') +
           ' | ikon ' + (probe.classList.contains('is-on') ? 'MENYALA (handler tema JALAN)'
                                                           : 'tidak menyala (handler tema TIDAK terpasang)'));
      probe.classList.remove('is-on');   // kembalikan
    }

    log('---', 'DIAGNOSA SELESAI — tekan SALIN lalu kirim hasil ini');
  }, 1200);

  // ---------- 6. pantau Phaser ----------
  var tries = 0;
  var iv2 = setInterval(function () {
    tries++;
    if (window.Phaser && window.Phaser.VERSION) {
      log('PHASER', 'termuat v' + window.Phaser.VERSION + ' setelah ' + (tries * 500) + 'ms');
      clearInterval(iv2);
    } else if (tries > 24) {
      log('PHASER', '** TIDAK TERMUAT setelah 12 detik (CDN diblokir?) **');
      clearInterval(iv2);
    }
  }, 500);

})();
