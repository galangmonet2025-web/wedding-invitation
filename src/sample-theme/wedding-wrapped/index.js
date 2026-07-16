/* =========================================================
   WEDDING WRAPPED — index.js
   ---------------------------------------------------------
   Kontrak host yang dipatuhi:
   - JS ini di-eksekusi ULANG saat mount & saat isOpened false->true.
     -> WAJIB idempoten + panggil cleanup sendiri di baris awal.
   - Host RE-INJECT HTML (dataContext berubah: foto base64 progresif, dll)
     TANPA menjalankan ulang JS ini.
     -> semua listener HARUS document-delegated.
     -> index slide disimpan di window.__ww agar tidak reset ke slide 1.
     -> DOM di-observe untuk re-apply state setelah re-inject.
   - Host menulis document.body.style.overflow='auto' saat open dan +1000ms.
     -> pager pakai overflow:hidden di .ww-root sendiri, bukan body.
   - Tema TIDAK BOLEH memutar backsound tenant. #bg-music = mirror event saja.
   - Host menulis #tm-countdown-* tiap detik. Tema tidak menyentuhnya.
   ========================================================= */
(function () {
  'use strict';

  /* ---------- cleanup instance sebelumnya ---------- */
  if (window.__wwCleanup) {
    try { window.__wwCleanup(); } catch (e) { /* noop */ }
  }

  var disposers = [];
  function onCleanup(fn) { disposers.push(fn); }
  window.__wwCleanup = function () {
    disposers.forEach(function (d) { try { d(); } catch (e) { /* noop */ } });
    disposers = [];
  };

  /* ---------- state global (survive re-inject HTML) ---------- */
  // CATATAN: index disimpan di window, BUKAN di DOM/closure, karena host
  // mengganti seluruh innerHTML tanpa menjalankan ulang JS ini.
  var S = window.__ww || (window.__ww = {
    idx: 0, lastSlide: null, navOpen: false, lastWishCount: -1, lastSegCount: -1
  });

  /* ---------- util ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function fmt(n) {
    // 2190 -> "2.190" (format Indonesia)
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  /* =========================================================
     PARSER TANGGAL INDONESIA
     timeline_kisah[].tanggal itu STRING BEBAS yang diketik mempelai.
     Contoh nyata yang harus ditangani:
       "Januari 2020", "Jan 2020", "01/2020", "2020", "12 Januari 2020",
       "12-01-2020", "2020-01-12", "Januari 2020 - Maret 2020"
     Kalau gagal parse -> return null, dan slide "hari bersama" disembunyikan
     (BUKAN menampilkan NaN).
     ========================================================= */
  var BULAN = {
    jan: 0, januari: 0, january: 0,
    feb: 1, februari: 1, february: 1, pebruari: 1,
    mar: 2, maret: 2, march: 2,
    apr: 3, april: 3,
    mei: 4, may: 4,
    jun: 5, juni: 5, june: 5,
    jul: 6, juli: 6, july: 6,
    agu: 7, agt: 7, agustus: 7, aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    okt: 9, oktober: 9, oct: 9, october: 9,
    nov: 10, november: 10, nopember: 10,
    des: 11, desember: 11, dec: 11, december: 11
  };

  function parseTanggalID(raw) {
    if (!raw) return null;
    var s = String(raw).trim().toLowerCase();
    if (!s) return null;

    // buang rentang: "januari 2020 - maret 2020" -> ambil bagian pertama
    s = s.split(/\s+(?:-|–|—|s\/d|sampai|hingga)\s+/)[0].trim();

    var y, m, d, mm;

    // 1) ISO: 2020-01-12 / 2020/01/12
    mm = s.match(/^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?$/);
    if (mm) {
      y = +mm[1]; m = +mm[2] - 1; d = mm[3] ? +mm[3] : 1;
      return valid(y, m, d);
    }

    // 2) dd-mm-yyyy / dd/mm/yyyy
    mm = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (mm) {
      d = +mm[1]; m = +mm[2] - 1; y = +mm[3];
      return valid(y, m, d);
    }

    // 3) mm/yyyy  (01/2020)
    mm = s.match(/^(\d{1,2})[-/](\d{4})$/);
    if (mm) {
      m = +mm[1] - 1; y = +mm[2];
      return valid(y, m, 1);
    }

    // 4) "12 januari 2020" / "januari 2020" / "jan 2020"
    var namaBulan = null, kunci;
    for (kunci in BULAN) {
      if (!Object.prototype.hasOwnProperty.call(BULAN, kunci)) continue;
      // batas kata supaya "mar" tidak cocok dengan "maret" secara keliru
      if (new RegExp('(^|[^a-z])' + kunci + '([^a-z]|$)').test(s)) {
        if (!namaBulan || kunci.length > namaBulan.length) namaBulan = kunci;
      }
    }
    if (namaBulan) {
      m = BULAN[namaBulan];
      var thn = s.match(/(\d{4})/);
      var tgl = s.match(/(^|[^\d])(\d{1,2})(?![\d])/);
      y = thn ? +thn[1] : null;
      d = tgl ? +tgl[2] : 1;
      if (y) return valid(y, m, d);
    }

    // 5) "2020" saja
    mm = s.match(/^(\d{4})$/);
    if (mm) return valid(+mm[1], 0, 1);

    return null;

    function valid(yy, mmn, dd) {
      if (!yy || yy < 1900 || yy > 2200) return null;
      if (mmn < 0 || mmn > 11) return null;
      if (!dd || dd < 1 || dd > 31) dd = 1;
      var dt = new Date(yy, mmn, dd);
      return isNaN(dt.getTime()) ? null : dt;
    }
  }

  // wedding_date sudah diformat id-ID ("Sabtu, 12 Desember 2026") -> parser sama bisa pakai
  function tanggalNikah() {
    var el = $('.ww-slide-day .ww-event-row:last-child strong');
    var teks = el ? el.textContent : '';
    var dt = parseTanggalID(teks);
    if (dt) return dt;
    // fallback: turunkan dari countdown host (hari tersisa)
    var hariEl = $('#tm-countdown-days');
    var sisa = hariEl ? parseInt(hariEl.textContent, 10) : NaN;
    if (!isNaN(sisa) && sisa >= 0) {
      var t = new Date();
      t.setDate(t.getDate() + sisa);
      return t;
    }
    return null;
  }

  /* =========================================================
     HITUNG STATISTIK dari data yang SUDAH ada (nol backend)
     ========================================================= */
  function hitungStats() {
    var out = { days: null, story: 0, photos: 0, wishes: 0, since: null, until: null };

    // jumlah momen timeline
    out.story = $$('.ww-top-item').length;

    // jumlah foto galeri (track digandakan 2x untuk marquee -> bagi 2)
    var foto = $$('#ww-photo-track .ww-photo').length;
    out.photos = foto > 0 ? Math.round(foto / 2) : 0;

    // jumlah ucapan
    out.wishes = $$('#ww-wish-list [data-wish-item]').length;

    // hari bersama: entri timeline PERTAMA -> hari nikah
    var itemPertama = $('.ww-top-item .ww-top-meta');
    var mulai = itemPertama ? parseTanggalID(itemPertama.textContent) : null;
    var nikah = tanggalNikah();

    if (mulai && nikah && nikah > mulai) {
      out.days = Math.round((nikah - mulai) / 86400000);
      out.since = mulai;
      out.until = nikah;
    }
    return out;
  }

  /* =========================================================
     SLIDE: bangun daftar slide yang HIDUP
     Slide dengan data-stat dibuang kalau datanya kosong (fallback adaptif).
     ========================================================= */
  function slideHidup(stats) {
    return $$('.ww-slide').filter(function (el) {
      var butuh = el.getAttribute('data-stat');
      if (!butuh) return true;
      if (butuh === 'days') return stats.days !== null && stats.days > 0;
      if (butuh === 'story') return stats.story > 0;
      if (butuh === 'photos') return stats.photos > 0;
      if (butuh === 'wishes') return true; // selalu tampil: ada CTA tulis ucapan
      return true;
    });
  }

  /* ---------- count-up ---------- */
  function countUp(el, target, dur) {
    if (!el) return;
    var mulai = 0, t0 = null, durasi = dur || 1100;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || target <= 0) { el.textContent = fmt(target); return; }

    var raf;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / durasi);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = fmt(mulai + (target - mulai) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    onCleanup(function () { if (raf) cancelAnimationFrame(raf); });
  }

  /* =========================================================
     RENDER
     ========================================================= */
  function render() {
    var stats = hitungStats();
    var slides = slideHidup(stats);
    if (!slides.length) return;

    if (S.idx >= slides.length) S.idx = slides.length - 1;
    if (S.idx < 0) S.idx = 0;

    // sembunyikan slide mati
    $$('.ww-slide').forEach(function (el) {
      if (slides.indexOf(el) === -1) el.style.display = 'none';
    });

    // aktifkan slide sekarang
    slides.forEach(function (el, i) {
      var aktif = i === S.idx;
      el.classList.toggle('is-active', aktif);
      if (!aktif) el.style.removeProperty('display');
      if (aktif) el.scrollTop = 0;
    });

    // count-up hanya dimainkan saat slide BARU dimasuki. Kalau slide-nya sama
    // (mis. host re-inject HTML), angka langsung dipasang final tanpa animasi
    // ulang supaya tidak "loncat balik ke 0" di depan mata tamu.
    var slideAktif = slides[S.idx];
    var namaAktif = slideAktif ? slideAktif.getAttribute('data-slide') : '';
    var pindah = S.lastSlide !== namaAktif;
    S.lastSlide = namaAktif;

    isiAngka(stats, slideAktif, pindah);
    gambarProgress(slides.length);
    gambarNav(slides);
    isiKartu(stats);

    // catat kondisi terakhir supaya MutationObserver tahu kapan HARUS render
    // ulang (ucapan baru / re-inject) dan kapan tidak (perubahan dari kita sendiri).
    S.lastWishCount = stats.wishes;
    S.lastSegCount = slides.length;
  }

  function angka(el, target, animasi) {
    if (!el) return;
    if (animasi) countUp(el, target);
    else el.textContent = fmt(target);
  }

  function isiAngka(stats, aktif, pindah) {
    if (!aktif) return;
    var slide = aktif.getAttribute('data-slide');

    if (slide === 'days' && stats.days !== null) {
      angka($('#ww-days-num'), stats.days, pindah);

      var sub = $('#ww-days-sub');
      if (sub && stats.since) {
        var thn = (stats.days / 365.25);
        var bulanan = Math.round(stats.days / 29.53); // purnama
        sub.textContent = 'Sejak ' + bulanIndo(stats.since) + ' — sekitar ' +
          (thn >= 1 ? thn.toFixed(1).replace('.', ',') + ' tahun, ' : '') +
          fmt(bulanan) + ' kali bulan purnama.';
      }
    }

    if (slide === 'photos') {
      angka($('#ww-photos-num'), stats.photos, pindah);
    }

    if (slide === 'wishes') {
      // ucapan bisa BERTAMBAH runtime (host prependWish menyisipkan node baru
      // tanpa menjalankan ulang JS ini) -> angka selalu dihitung ulang dari DOM.
      angka($('#ww-wishes-num'), stats.wishes, pindah);
    }
  }

  function bulanIndo(dt) {
    var nm = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
              'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return nm[dt.getMonth()] + ' ' + dt.getFullYear();
  }

  function gambarProgress(total) {
    var bar = $('#ww-progress');
    if (!bar) return;
    if (bar.children.length !== total) {
      bar.innerHTML = '';
      for (var i = 0; i < total; i++) {
        var seg = document.createElement('span');
        seg.className = 'ww-seg';
        seg.innerHTML = '<b class="ww-seg-fill"></b>';
        bar.appendChild(seg);
      }
    }
    $$('.ww-seg', bar).forEach(function (seg, i) {
      seg.classList.toggle('is-done', i < S.idx);
      seg.classList.toggle('is-current', i === S.idx);
    });
  }

  function gambarNav(slides) {
    var list = $('#ww-nav-list');
    if (!list) return;
    list.innerHTML = '';
    slides.forEach(function (el, i) {
      var label = el.getAttribute('data-menu-label') || ('Slide ' + (i + 1));
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.setAttribute('data-nav-idx', String(i));
      if (i === S.idx) b.className = 'is-current';
      li.appendChild(b);
      list.appendChild(li);
    });
  }

  function isiKartu(stats) {
    var ul = $('#ww-card-stats');
    if (!ul) return;
    var baris = [];
    if (stats.days !== null) baris.push(['Hari bersama', fmt(stats.days)]);
    if (stats.story > 0)    baris.push(['Momen penting', fmt(stats.story)]);
    if (stats.photos > 0)   baris.push(['Foto terabadikan', fmt(stats.photos)]);
    baris.push(['Doa yang masuk', fmt(stats.wishes)]);

    var hari = $('#tm-countdown-days');
    if (hari) {
      var sisa = parseInt(hari.textContent, 10);
      if (!isNaN(sisa) && sisa > 0) baris.push(['Hari lagi', fmt(sisa)]);
    }

    ul.innerHTML = baris.map(function (r) {
      return '<li><span class="ww-k">' + r[0] + '</span><span class="ww-v">' + r[1] + '</span></li>';
    }).join('');

    var yr = $('#ww-card-year');
    if (yr) {
      var n = stats.until || tanggalNikah();
      yr.textContent = n ? String(n.getFullYear()) : '';
    }
  }

  /* =========================================================
     NAVIGASI
     ========================================================= */
  function pergi(delta) {
    var slides = slideHidup(hitungStats());
    var next = S.idx + delta;
    if (next < 0 || next >= slides.length) return;
    S.idx = next;
    render();
  }

  function keSlide(i) { S.idx = i; render(); }

  function keNama(nama) {
    var slides = slideHidup(hitungStats());
    for (var i = 0; i < slides.length; i++) {
      if (slides[i].getAttribute('data-slide') === nama) { keSlide(i); return; }
    }
  }

  function bukaNav(buka) {
    var nav = $('#ww-nav');
    if (!nav) return;
    S.navOpen = !!buka;
    nav.hidden = !buka;
  }

  /* =========================================================
     LISTENER — SEMUA document-delegated agar selamat dari re-inject
     ========================================================= */
  function onDoc(tipe, fn, opts) {
    document.addEventListener(tipe, fn, opts);
    onCleanup(function () { document.removeEventListener(tipe, fn, opts); });
  }

  onDoc('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    // jangan bajak tombol milik host
    if (t.closest('#btn-open-invitation') || t.closest('#btn-toggle-music') ||
        t.closest('#btn-show-qr') || t.closest('#btn-submit-kehadiran') ||
        t.closest('#btn-submit-ucapan')) return;

    if (t.closest('#ww-tap-next')) { pergi(1); return; }
    if (t.closest('#ww-tap-prev')) { pergi(-1); return; }

    if (t.closest('#ww-btn-nav')) { bukaNav(!S.navOpen); return; }
    if (t.closest('#ww-nav-close')) { bukaNav(false); return; }

    var navBtn = t.closest('[data-nav-idx]');
    if (navBtn) { bukaNav(false); keSlide(parseInt(navBtn.getAttribute('data-nav-idx'), 10)); return; }

    // klik latar nav = tutup
    if (t.id === 'ww-nav') { bukaNav(false); return; }

    var goto = t.closest('[data-goto]');
    if (goto) { keNama(goto.getAttribute('data-goto')); return; }

    var copy = t.closest('[data-copy-target]');
    if (copy) {
      var val = copy.getAttribute('data-copy-target') || '';
      salin(val, copy);
      return;
    }
  });

  // keyboard: panah kiri/kanan
  onDoc('keydown', function (e) {
    if (e.key === 'ArrowRight') pergi(1);
    else if (e.key === 'ArrowLeft') pergi(-1);
    else if (e.key === 'Escape' && S.navOpen) bukaNav(false);
  });

  // swipe vertikal/horizontal
  var tx = 0, ty = 0, tActive = false;
  onDoc('touchstart', function (e) {
    if (!e.touches || !e.touches.length) return;
    // jangan ganggu scroll di area yang memang bisa di-scroll
    if (e.target.closest && e.target.closest('.ww-wish-preview, .ww-nav-list, textarea')) { tActive = false; return; }
    tx = e.touches[0].clientX; ty = e.touches[0].clientY; tActive = true;
  }, { passive: true });

  onDoc('touchend', function (e) {
    if (!tActive || !e.changedTouches || !e.changedTouches.length) return;
    tActive = false;
    var dx = e.changedTouches[0].clientX - tx;
    var dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx)) { pergi(dy < 0 ? 1 : -1); return; }
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) { pergi(dx < 0 ? 1 : -1); }
  }, { passive: true });

  function salin(teks, btn) {
    var label = btn ? btn.textContent : '';
    function ok() {
      if (!btn) return;
      btn.textContent = 'Tersalin!';
      var t = setTimeout(function () { btn.textContent = label; }, 1600);
      onCleanup(function () { clearTimeout(t); });
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(teks).then(ok).catch(function () { fallback(); });
    } else { fallback(); }

    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = teks;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); ok(); } catch (err) { /* noop */ }
      document.body.removeChild(ta);
    }
  }

  /* =========================================================
     RSVP: host menulis #rsvp-guests saat #rsvp-status di-input.
     Handler host memakai event 'input'. <select> memancarkannya,
     jadi cukup pastikan nilai awal konsisten saja.
     ========================================================= */
  onDoc('change', function (e) {
    var t = e.target;
    if (!t || t.id !== 'rsvp-status') return;
    var g = document.getElementById('rsvp-guests');
    if (!g) return;
    if (t.value === 'declined') { g.value = '0'; g.disabled = true; }
    else { g.disabled = false; if (g.value === '0') g.value = '1'; }
  });

  /* =========================================================
     RE-INJECT GUARD
     Host mengganti innerHTML container tanpa menjalankan ulang JS ini.
     MutationObserver mendeteksi node pager baru -> render ulang state.
     ========================================================= */
  var raf = null;

  // "sidik jari" DOM: berubah kalau host re-inject HTML (slide aktif hilang)
  // ATAU kalau host menyisipkan ucapan baru lewat prependWish.
  function sidik() {
    var stage = document.getElementById('ww-stage');
    if (!stage) return '';
    return [
      stage.getAttribute('data-ww-idx'),
      $('.ww-slide.is-active') ? '1' : '0',
      $$('#ww-wish-list [data-wish-item]').length,
      $$('.ww-seg').length
    ].join('|');
  }

  var mo = new MutationObserver(function () {
    var stage = document.getElementById('ww-stage');
    if (!stage) return;

    var s = sidik();
    var harap = [String(S.idx), '1', S.lastWishCount, S.lastSegCount].join('|');
    if (s === harap) return; // tidak ada yang berubah -> jangan render ulang

    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () {
      var st = document.getElementById('ww-stage');
      if (!st) return;
      st.setAttribute('data-ww-idx', String(S.idx));
      render();
    });
  });
  mo.observe(document.body, { childList: true, subtree: true });
  onCleanup(function () {
    mo.disconnect();
    if (raf) cancelAnimationFrame(raf);
  });

  /* =========================================================
     BOOT
     ========================================================= */
  function boot() {
    var stage = document.getElementById('ww-stage');
    if (!stage) return false;
    stage.setAttribute('data-ww-idx', String(S.idx));
    render();
    return true;
  }

  // JANGAN bergantung pada DOMContentLoaded: host menyuntik tema lewat
  // dangerouslySetInnerHTML SETELAH dokumen selesai dimuat, jadi event itu
  // sudah lewat dan tidak akan menyala lagi -> pager akan kosong selamanya.
  // Coba boot langsung; kalau DOM tema belum ada, MutationObserver di atas
  // yang akan menangkapnya begitu node-nya muncul.
  boot();

  // jaring pengaman: host menyapu ulang DOM di ~400ms & ~1200ms (auto-fill RSVP)
  // dan foto base64 masuk progresif. Render ulang agar state pager tetap benar.
  [60, 450, 1250].forEach(function (ms) {
    var t = setTimeout(boot, ms);
    onCleanup(function () { clearTimeout(t); });
  });
})();
