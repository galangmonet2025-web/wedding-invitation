/* ==========================================================================
   DOODLE MONOCHROME — theme JS (runs as an IIFE inside the host, see
   ThemeWrapper: injected into <script id="theme-custom-js"> and RE-EXECUTED
   whenever jsBase or isOpened changes). Every run MUST first tear down the
   previous run's listeners/loaders via the global cleanup hook, or they stack.

   Responsibilities:
     1. (tidak ada lagi pemuat pustaka — pola generatif dibuang dari desain;
        lihat catatan di bagian 1 di bawah).
     2. Wire "Salin" (copy) buttons for gift accounts.
     3. Mirror the host-owned music icon (NEVER play audio — the host owns the
        Audio element and only plays when isPlaying && isOpened).

   Contract notes (see memory: theme-host-contract):
     - Do NOT call audio.play(); only reflect state / click #btn-toggle-music.
     - Host IDs are kept verbatim in index.html; do not rename them.
     - Listeners are document-delegated so they survive host HTML re-injection.
   ========================================================================== */
(function () {
    'use strict';

    // ---- 0. Cleanup previous run --------------------------------------------
    if (typeof window.__doodleCleanup === 'function') {
        try { window.__doodleCleanup(); } catch (e) { /* ignore */ }
    }
    var cleanupFns = [];
    window.__doodleCleanup = function () {
        cleanupFns.forEach(function (fn) { try { fn(); } catch (e) { } });
        cleanupFns = [];
    };

    // ---- 1. Muat css-doodle dari CDN ----------------------------------------
    // <script src> di dalam dangerouslySetInnerHTML TIDAK dieksekusi, jadi kita
    // sisipkan elemen <script> asli ke <head> (pendekatan yang sama dipakai host
    // untuk Phaser). Sekali Custom Element 'css-doodle' terdaftar, semua elemen
    // <css-doodle> yang ada (atau ditambahkan kemudian) otomatis ter-render.
    //
    // Pola di tema ini hanyalah GARIS RAMBUT samar (lihat blok "POLA LATAR" di
    // index.css). Kalau CDN gagal dimuat, elemen dibiarkan kosong dan undangan
    // tetap tampil sempurna — pola memang hanya lapisan tambahan, bukan syarat
    // keterbacaan.
    var DOODLE_ID = 'dm-css-doodle-lib';
    var DOODLE_SRC = 'https://cdn.jsdelivr.net/npm/css-doodle@0.51.0/css-doodle.min.js';

    function refreshDoodles() {
        try {
            document.querySelectorAll('css-doodle').forEach(function (n) {
                if (typeof n.update === 'function') {
                    try { n.update(); } catch (e) { }
                }
            });
        } catch (e) { }
    }

    function whenDoodleReady() {
        if (window.customElements && window.customElements.whenDefined) {
            window.customElements.whenDefined('css-doodle').then(refreshDoodles);
        }
    }

    if (window.customElements && window.customElements.get('css-doodle')) {
        whenDoodleReady();
    } else if (!document.getElementById(DOODLE_ID)) {
        var s = document.createElement('script');
        s.id = DOODLE_ID;
        s.src = DOODLE_SRC;
        s.async = true;
        s.onload = whenDoodleReady;
        s.onerror = function () {
            console.warn('[doodle-monochrome] css-doodle gagal dimuat; pola latar dilewati.');
        };
        document.head.appendChild(s);
        // Script & Custom Element sengaja TIDAK dibuang saat cleanup: Custom
        // Element tak bisa di-undefine, dan membiarkannya ter-cache menghindari
        // fetch ulang pada re-run berikutnya.
    } else {
        whenDoodleReady();
    }

    // ---- 2. Copy-to-clipboard for gift accounts -----------------------------
    // Document-delegated so it survives host HTML re-injection.
    function onCopyClick(e) {
        var btn = e.target.closest && e.target.closest('.dm-copy');
        if (!btn) return;
        var id = btn.getAttribute('data-copy');
        var el = id && document.getElementById(id);
        if (!el) return;
        var text = (el.textContent || '').trim();
        var done = function () {
            var old = btn.textContent;
            btn.textContent = 'Tersalin ✓';
            setTimeout(function () { btn.textContent = old; }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(function () { legacyCopy(text); done(); });
        } else {
            legacyCopy(text);
            done();
        }
    }
    function legacyCopy(text) {
        try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        } catch (e) { }
    }
    document.addEventListener('click', onCopyClick, true);
    cleanupFns.push(function () { document.removeEventListener('click', onCopyClick, true); });

    // ---- 3. Countdown fallback ---------------------------------------------
    // The host runs its own countdown into #tm-countdown-* IDs (see
    // ThemeWrapper SYSTEM COUNTDOWN HELPER) when it has weddingDate. We also
    // provide a self-contained countdown from the embedded ISO date so the
    // preview (Theme Editor, no host date) isn't frozen. Host writes win because
    // it runs on the same elements; harmless overlap.
    var dateEl = document.getElementById('dm-wed-date');
    var iso = dateEl && dateEl.getAttribute('data-wedding-date');
    if (iso && iso.indexOf('{{') === -1) {
        var target = new Date(iso).getTime();
        if (!isNaN(target)) {
            var pad = function (n) { return String(n).padStart(2, '0'); };
            var tick = function () {
                var diff = Math.max(0, target - Date.now());
                var d = Math.floor(diff / 86400000);
                var h = Math.floor((diff % 86400000) / 3600000);
                var m = Math.floor((diff % 3600000) / 60000);
                var sec = Math.floor((diff % 60000) / 1000);
                var set = function (id, v) { var e = document.getElementById(id); if (e) e.textContent = pad(v); };
                set('tm-countdown-days', d);
                set('tm-countdown-hours', h);
                set('tm-countdown-minutes', m);
                set('tm-countdown-seconds', sec);
            };
            tick();
            var cdTimer = setInterval(tick, 1000);
            cleanupFns.push(function () { clearInterval(cdTimer); });
        }
    }

    // ---- 4. Scroll-reveal animations ----------------------------------------
    // Add .is-visible to .reveal-item elements as they scroll into view. The
    // host re-adds .is-visible after an HTML re-inject (ThemeWrapper), so this
    // only needs to handle the initial scroll-in. We (re)scan on each run and
    // observe any not-yet-visible items. IntersectionObserver root=null uses the
    // viewport, which works for both the mobile (window) and desktop
    // (phone-container) scrollers because the items still cross the viewport.
    var io = null;
    if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    io.unobserve(entry.target);
                }
            });
        }, { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

        var scanReveal = function () {
            // Di mode PAGER semua halaman menumpuk di kotak viewport yang sama,
            // jadi getBoundingClientRect() melaporkan SEMUA item "terlihat" dan
            // seluruh animasi reveal habis sekaligus saat load. Reveal per-halaman
            // ditangani goToPage(); di sini cukup halaman yang sedang aktif.
            var scope = document.querySelector('#main-content.dm-pager')
                ? document.querySelectorAll('.dm-section.is-current .reveal-item:not(.is-visible), #theme-cover .reveal-item:not(.is-visible)')
                : document.querySelectorAll('.reveal-item:not(.is-visible)');
            var items = scope;
            items.forEach(function (el) {
                // Items already in view on load (e.g. cover/hero) should show
                // immediately rather than wait for a scroll event.
                var r = el.getBoundingClientRect();
                if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
                    el.classList.add('is-visible');
                } else {
                    io.observe(el);
                }
            });
        };
        scanReveal();
        // Re-scan shortly after in case layout/images settle late.
        var scanT = setTimeout(scanReveal, 400);
        cleanupFns.push(function () { clearTimeout(scanT); io.disconnect(); });
    } else {
        // No IO support: just show everything.
        document.querySelectorAll('.reveal-item').forEach(function (el) { el.classList.add('is-visible'); });
    }

    // ---- 4b. PAGER: satu section = satu halaman ------------------------------
    // Navigasi: (a) ketuk area KOSONG halaman, (b) tombol ‹ ›, (c) titik indikator,
    // (d) panah kiri/kanan keyboard, (e) link menu (#couples dst) tetap bekerja.
    //
    // Kontrak host: HTML di-inject ulang oleh ThemeWrapper (mis. setelah kirim
    // ucapan) TANPA menjalankan ulang JS ini. Jadi semua listener DIDELEGASIKAN ke
    // document, state halaman disimpan di window.__dmPager, dan sebuah
    // MutationObserver memasang ulang kelas + nav bar saat DOM diganti.
    var PAGER_STATE = window.__dmPager || (window.__dmPager = { index: 0 });

    function pagerPages() {
        var deck = document.getElementById('main-content');
        if (!deck) return [];
        // Hanya anak langsung: nav bar & hint bukan halaman.
        return Array.prototype.filter.call(deck.children, function (el) {
            return el.classList && el.classList.contains('dm-section');
        });
    }

    // Halaman yang isinya lebih tinggi dari kotaknya dirata-atas agar tak terpotong.
    function markTall(page) {
        if (!page) return;
        page.classList.toggle('is-tall', page.scrollHeight > page.clientHeight + 4);
    }

    // Nomor urut section (angka romawi) untuk .dm-index. Dihitung dari urutan
    // halaman yang BENAR-BENAR ada — beberapa section bisa hilang karena
    // {{#if}}/{{#unless}} saat binding, jadi nomornya tak boleh di-hardcode.
    var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    function renderIndices() {
        var n = 0;
        pagerPages().forEach(function (p) {
            var slot = p.querySelector('.dm-index');
            if (!slot) return;              // cover/hero/closing tak bernomor
            slot.textContent = ROMAN[n] || String(n + 1);
            n++;
        });
    }

    function renderDots(total) {
        renderIndices();
        var wrap = document.getElementById('dm-dots');
        if (!wrap || wrap.children.length === total) return;
        wrap.innerHTML = '';
        for (var i = 0; i < total; i++) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'dm-dot';
            b.setAttribute('data-page', String(i));
            b.setAttribute('role', 'tab');
            // Label pakai data-menu-label kalau ada supaya screen reader jelas.
            var p = pagerPages()[i];
            var label = (p && p.getAttribute('data-menu-label')) || ('Halaman ' + (i + 1));
            b.setAttribute('aria-label', label);
            wrap.appendChild(b);
        }
    }

    function goToPage(n, opts) {
        var pages = pagerPages();
        if (!pages.length) return;
        // Jepit ke rentang yang sah — tak ada wrap-around supaya tombol
        // disabled di ujung tetap konsisten dengan perilaku ketuk.
        var i = Math.max(0, Math.min(pages.length - 1, n));
        PAGER_STATE.index = i;

        pages.forEach(function (p, k) {
            p.classList.toggle('is-current', k === i);
            p.setAttribute('aria-hidden', k === i ? 'false' : 'true');
        });

        var cur = pages[i];
        if (cur) {
            cur.scrollTop = 0;
            markTall(cur);
            // Item reveal di halaman ini mungkin belum pernah "terlihat".
            cur.querySelectorAll('.reveal-item:not(.is-visible)').forEach(function (el) {
                el.classList.add('is-visible');
            });
        }

        // Indikator
        renderDots(pages.length);
        var now = document.getElementById('dm-page-now');
        var tot = document.getElementById('dm-page-total');
        if (now) now.textContent = String(i + 1);
        if (tot) tot.textContent = String(pages.length);
        document.querySelectorAll('#dm-dots .dm-dot').forEach(function (d, k) {
            d.classList.toggle('is-current', k === i);
            d.setAttribute('aria-selected', k === i ? 'true' : 'false');
        });
        var prev = document.getElementById('dm-prev');
        var next = document.getElementById('dm-next');
        if (prev) prev.disabled = (i === 0);
        if (next) next.disabled = (i === pages.length - 1);

        // Tandai ujung dek supaya zona ketuk yang tak berguna tidak berkedip.
        var deckEl = document.getElementById('main-content');
        if (deckEl) {
            deckEl.classList.toggle('at-first', i === 0);
            deckEl.classList.toggle('at-last', i === pages.length - 1);
        }

        // Petunjuk ketuk hanya di halaman pertama, dan hanya sekali.
        var hint = document.getElementById('dm-tap-hint');
        if (hint) {
            var show = (i === 0 && !PAGER_STATE.hinted);
            hint.classList.toggle('is-on', show);
            if (show) {
                PAGER_STATE.hinted = true;
                var ht = setTimeout(function () { hint.classList.remove('is-on'); }, 4200);
                cleanupFns.push(function () { clearTimeout(ht); });
            }
        }
        if (!opts || !opts.silent) {
            try { window.dispatchEvent(new CustomEvent('dm:page', { detail: { index: i } })); } catch (e) { }
        }
    }

    // Dua lapis penanda zona ketuk (kiri = prev, kanan = next). Dibuat dari JS,
    // bukan HTML, supaya host tak menghapusnya saat re-inject dan supaya markup
    // tema tetap bersih. Elemen ini pointer-events:none — murni visual; yang
    // menangani ketukan tetap onDeckTap lewat koordinat X.
    function ensureTapZones(deck) {
        if (deck.querySelector('.dm-zone-left')) return;
        ['left', 'right'].forEach(function (side) {
            var z = document.createElement('div');
            z.className = 'dm-zone dm-zone-' + side;
            z.setAttribute('aria-hidden', 'true');
            z.innerHTML = '<span class="dm-zone-arrow">' + (side === 'left' ? '‹' : '›') + '</span>';
            deck.appendChild(z);
        });
    }

    /* ======================================================================
       MINI-GAME "T-REX" — meniru dino offline Google Chrome, dipasang di atas
       indikator navigasi (di dalam #dm-nav). Semuanya monokrom (tinta di atas
       kertas) supaya menyatu dengan tema.

       KONTRAK / ATURAN (jangan dilanggar):
         - DESKTOP-ONLY: butuh keyboard / klik sengaja. Di mobile navigasi pakai
           zona ketuk, jadi game disembunyikan via CSS (@media pointer:coarse).
         - HARUS BEKU saat dialog/menu terbuka ATAU undangan belum dibuka
           (memory: game-theme-pause-on-dialog). Loop tetap jalan untuk menggambar,
           tapi fisika berhenti.
         - Dibuat dari JS (bukan HTML) + idempoten, supaya selamat dari re-inject
           host — sama pola dengan zona ketuk.
         - RAF & listener-nya didaftarkan ke cleanupFns; entri lama dibersihkan
           lewat window.__dmDinoCleanup agar loop tak menumpuk antar re-run.
         - Tidak menyentuh #btn-* / audio host. Spasi/↑ untuk lompat DIBAJAK hanya
           saat kursor sedang di area game; panah kiri/kanan navigasi tetap utuh.
       ====================================================================== */
    function ensureDino(nav) {
        if (!nav) return;
        // Deteksi shell game yang "mati": saat host me-re-inject dgn menyerialkan
        // innerHTML, markup .dm-dino ikut ter-copy sebagai HTML statis TAPI canvas
        // & loop-nya sudah lepas (detached). Properti __dmLive di-set via JS dan
        // TIDAK ikut terserialisasi, jadi keberadaannya menandai instance hidup.
        var old = nav.querySelector('.dm-dino');
        if (old) {
            if (old.__dmLive) return;      // masih hidup — biarkan
            old.parentNode.removeChild(old);  // shell mati — buang, bangun ulang
        }
        var wrap = document.createElement('div');
        wrap.className = 'dm-dino';
        wrap.__dmLive = true;
        wrap.setAttribute('aria-hidden', 'true');
        // tabindex agar bisa menerima fokus keyboard tanpa mengganggu tab-order form
        wrap.innerHTML =
            '<canvas class="dm-dino-cv" width="600" height="80"></canvas>' +
            '<div class="dm-dino-hud"><span class="dm-dino-score">00000</span>' +
            '<span class="dm-dino-hi">HI 00000</span></div>' +
            '<div class="dm-dino-hint">ketuk untuk main</div>';
        // Sisipkan sebagai anak pertama nav (di ATAS baris indikator).
        nav.insertBefore(wrap, nav.firstChild);
        startDino(wrap);
    }

    function startDino(wrap) {
        // Bersihkan instance dino sebelumnya (re-run/re-mount).
        if (typeof window.__dmDinoCleanup === 'function') {
            try { window.__dmDinoCleanup(); } catch (e) { }
        }
        var dinoFns = [];
        window.__dmDinoCleanup = function () {
            dinoFns.forEach(function (fn) { try { fn(); } catch (e) { } });
            dinoFns = [];
        };
        // Daftarkan juga ke cleanup utama tema.
        cleanupFns.push(function () {
            if (typeof window.__dmDinoCleanup === 'function') { window.__dmDinoCleanup(); }
            window.__dmDinoCleanup = null;
        });

        var cv = wrap.querySelector('.dm-dino-cv');
        var scoreEl = wrap.querySelector('.dm-dino-score');
        var hiEl = wrap.querySelector('.dm-dino-hi');
        var hintEl = wrap.querySelector('.dm-dino-hint');
        if (!cv || !cv.getContext) return;
        var ctx = null;
        try { ctx = cv.getContext('2d'); } catch (e) { ctx = null; }
        // Lingkungan tanpa canvas 2D (mis. context hilang / SSR-harness):
        // cukup tampilkan hint statis, jangan crash. Game hanya "hiasan".
        if (!ctx) { if (hintEl) hintEl.textContent = ''; return; }

        // Warna diambil dari CSS var tema (fallback ke hitam/putih).
        var css = getComputedStyle(document.querySelector('.dm-root') || document.body);
        var INK = (css.getPropertyValue('--dm-ink') || '#14110f').trim() || '#14110f';
        var MUTE = (css.getPropertyValue('--dm-muted') || '#8a8580').trim() || '#8a8580';

        // Ukuran logis (koordinat internal). Kanvas diskalakan ke lebar nyata
        // lewat devicePixelRatio pada resize.
        var W = 600, H = 80;
        var GROUND_Y = 62;           // garis tanah (y)
        var GRAVITY = 2600;          // px/s²
        var JUMP_V = 780;            // kecepatan lompat awal
        var BASE_SPEED = 260;        // px/s scroll rintangan
        var DINO_X = 40, DINO_W = 22, DINO_H = 24;

        var y = 0, vy = 0;           // posisi/kecepatan vertikal dino (di atas tanah)
        var running = false, over = false, started = false;
        var speed = BASE_SPEED, dist = 0;
        var spawnTimer = 0, nextSpawn = 1.1;
        var obstacles = [];          // {x,w,h}
        var clouds = [{ x: 420, y: 16 }, { x: 620, y: 28 }];
        var legPhase = 0;            // animasi kaki
        var hi = 0;
        var last = 0, rafId = 0;
        var seed = 20260720;         // PRNG deterministik (Math.random dihindari)
        var rnd = function () { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

        var pad = function (v) { return String(Math.floor(v)).padStart(5, '0'); };
        var setScore = function () {
            if (scoreEl) scoreEl.textContent = pad(dist / 10);
            if (hiEl) hiEl.textContent = 'HI ' + pad(hi / 10);
        };

        function reset() {
            over = false; y = 0; vy = 0; speed = BASE_SPEED; dist = 0;
            spawnTimer = 0; nextSpawn = 1.1; obstacles = [];
            wrap.classList.remove('is-over');
            setScore();
        }

        function spawn() {
            // Kaktus: lebar & tinggi bervariasi (single / cluster).
            var big = rnd() > 0.6;
            var w = big ? 17 : 11;
            var h = big ? 26 : 20;
            obstacles.push({ x: W + 10, w: w, h: h });
        }

        function jump() {
            if (over) { reset(); running = true; return; }
            if (!started) { started = true; running = true; wrap.classList.add('is-started'); }
            if (y <= 0.5) vy = JUMP_V;
        }

        function die() {
            over = true; running = false;
            if (dist > hi) hi = dist;
            wrap.classList.add('is-over');
        }

        // Beku bila undangan belum dibuka ATAU ada dialog/menu terbuka.
        function frozen() {
            if (!isOpened()) return true;
            if (document.querySelector('.uk-modal.uk-open, #menu-modal.uk-open')) return true;
            // Host lightbox / popup umum.
            if (document.querySelector('.pswp--open, [data-lightbox-open]')) return true;
            return false;
        }

        // --- gambar --------------------------------------------------------
        function drawGround() {
            ctx.strokeStyle = INK;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, GROUND_Y + 0.5);
            ctx.lineTo(W, GROUND_Y + 0.5);
            ctx.stroke();
            // kerikil kecil bergerak mengikuti dunia
            ctx.fillStyle = MUTE;
            var off = (dist * 0.5) % 40;
            for (var gx = -off; gx < W; gx += 40) {
                ctx.fillRect(gx + 8, GROUND_Y + 5, 3, 1);
                ctx.fillRect(gx + 24, GROUND_Y + 8, 2, 1);
            }
        }
        function drawCloud(c) {
            ctx.fillStyle = MUTE;
            ctx.fillRect(c.x, c.y, 14, 4);
            ctx.fillRect(c.x + 3, c.y - 3, 8, 4);
        }
        function drawDino() {
            var dy = GROUND_Y - DINO_H - y;
            ctx.fillStyle = over ? MUTE : INK;
            // badan
            ctx.fillRect(DINO_X, dy, DINO_W - 6, DINO_H - 6);
            // kepala (menonjol ke kanan-atas)
            ctx.fillRect(DINO_X + DINO_W - 12, dy - 6, 12, 10);
            // mata (lubang putih)
            ctx.fillStyle = '#fff';
            ctx.fillRect(DINO_X + DINO_W - 5, dy - 3, 2, 2);
            // ekor
            ctx.fillStyle = over ? MUTE : INK;
            ctx.fillRect(DINO_X - 5, dy + 2, 5, 5);
            // kaki (dua fase saat berlari; menyatu saat lompat)
            var grounded = y <= 0.5;
            if (grounded && running && !over) {
                var swap = Math.floor(legPhase) % 2 === 0;
                ctx.fillRect(DINO_X + 2, dy + DINO_H - 6, 4, 6 - (swap ? 0 : 2));
                ctx.fillRect(DINO_X + 9, dy + DINO_H - 6, 4, 6 - (swap ? 2 : 0));
            } else {
                ctx.fillRect(DINO_X + 2, dy + DINO_H - 6, 4, 6);
                ctx.fillRect(DINO_X + 9, dy + DINO_H - 6, 4, 6);
            }
        }
        function drawCactus(o) {
            ctx.fillStyle = INK;
            var bx = o.x, by = GROUND_Y - o.h;
            ctx.fillRect(bx, by, o.w >= 15 ? 5 : o.w, o.h);   // batang
            // lengan kaktus
            ctx.fillRect(bx - 3, by + o.h * 0.4, 3, 2);
            ctx.fillRect(bx - 3, by + o.h * 0.4 - 5, 2, 6);
            if (o.w >= 15) {
                ctx.fillRect(bx + 5, by + o.h * 0.55, 3, 2);
                ctx.fillRect(bx + 6, by + o.h * 0.55 - 6, 2, 7);
            }
        }

        function loop(t) {
            rafId = requestAnimationFrame(loop);
            if (!last) last = t;
            var dt = (t - last) / 1000; last = t;
            if (dt > 0.05) dt = 0.05;

            var freeze = frozen();
            ctx.clearRect(0, 0, W, H);

            if (running && !over && !freeze) {
                // fisika vertikal
                vy -= GRAVITY * dt;
                y += vy * dt;
                if (y < 0) { y = 0; vy = 0; }

                dist += speed * dt;
                speed = BASE_SPEED + Math.min(240, dist / 40);
                legPhase += dt * 12;
                setScore();

                spawnTimer += dt;
                if (spawnTimer >= nextSpawn) {
                    spawnTimer = 0;
                    nextSpawn = 0.9 + rnd() * 1.1;
                    spawn();
                }
                for (var i = 0; i < obstacles.length; i++) {
                    var o = obstacles[i];
                    o.x -= speed * dt;
                    // AABB: dino [DINO_X, DINO_X+bodyW] vs kaktus, hanya kalau dino cukup rendah
                    var hit = o.x < DINO_X + (DINO_W - 6) && o.x + o.w > DINO_X && y < o.h - 3;
                    if (hit) die();
                }
                if (obstacles.length && obstacles[0].x + obstacles[0].w < -12) obstacles.shift();

                // awan bergerak lambat
                for (var c = 0; c < clouds.length; c++) {
                    clouds[c].x -= speed * 0.18 * dt * 10 * 0.1;
                    clouds[c].x -= 8 * dt;
                    if (clouds[c].x < -20) { clouds[c].x = W + rnd() * 60; clouds[c].y = 10 + rnd() * 26; }
                }
            }

            // render (selalu, termasuk saat beku/over — supaya tak berkedip kosong)
            for (var k = 0; k < clouds.length; k++) drawCloud(clouds[k]);
            drawGround();
            for (var m = 0; m < obstacles.length; m++) drawCactus(obstacles[m]);
            drawDino();

            if (freeze) wrap.classList.add('is-frozen');
            else wrap.classList.remove('is-frozen');
        }

        // --- input ---------------------------------------------------------
        // KETUK/SENTUH strip game = LOMPAT (desktop & mobile). Karena strip ada di
        // dalam #dm-nav, onDeckTap sudah mengabaikannya (guard '#dm-nav'), jadi
        // ketukan di sini TIDAK memicu navigasi halaman — tak perlu stopPropagation.
        // 'hover' dipakai untuk membatasi bajakan tombol keyboard (spasi/↑) supaya
        // hanya aktif saat kursor di area game; di mobile 'hover' tak relevan.
        var hover = false;
        var onEnter = function () { hover = true; };
        var onLeave = function () { hover = false; };
        wrap.addEventListener('mouseenter', onEnter);
        wrap.addEventListener('mouseleave', onLeave);
        dinoFns.push(function () { wrap.removeEventListener('mouseenter', onEnter); wrap.removeEventListener('mouseleave', onLeave); });

        var visible = function () { return getComputedStyle(wrap).display !== 'none'; };

        // Lompat dari sentuhan/klik. touchstart dipakai agar respons INSTAN di
        // mobile (tanpa jeda ~300ms sebelum 'click') dan agar bisa preventDefault
        // untuk menahan scroll/zoom saat bermain. Flag menahan 'click' sintetis
        // yang menyusul touchstart supaya tidak lompat dobel.
        var touchedAt = 0;
        var onTouchStart = function (e) {
            touchedAt = e.timeStamp || 1;
            if (frozen()) return;
            e.preventDefault();            // strip pakai touch-action:none (lihat CSS)
            jump();
        };
        var onWrapClick = function (e) {
            // Abaikan 'click' yang lahir dari touchstart barusan (hindari lompat 2x).
            if (touchedAt && (!e.timeStamp || e.timeStamp - touchedAt < 700)) { touchedAt = 0; return; }
            if (!frozen()) jump();
        };
        wrap.addEventListener('touchstart', onTouchStart, { passive: false });
        wrap.addEventListener('click', onWrapClick);
        dinoFns.push(function () {
            wrap.removeEventListener('touchstart', onTouchStart);
            wrap.removeEventListener('click', onWrapClick);
        });

        var onDinoKey = function (e) {
            var isJump = e.code === 'Space' || e.code === 'ArrowUp' || e.key === ' ' || e.key === 'ArrowUp';
            if (!isJump) return;
            if (!visible()) return;
            // Hanya bajak SPASI/↑ saat pemain sedang di area game — supaya scroll
            // halaman & aksesibilitas di tempat lain tak terganggu.
            if (!hover) return;
            var tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea') return;
            if (frozen()) return;
            e.preventDefault();
            jump();
        };
        window.addEventListener('keydown', onDinoKey);
        dinoFns.push(function () { window.removeEventListener('keydown', onDinoKey); });

        // Skala kanvas ke UKURAN TAMPIL NYATA (retina-crisp). Tinggi CSS bisa
        // berbeda antar breakpoint (mis. 80px desktop, 68px mobile), jadi sumbu-Y
        // dipetakan dari tinggi CSS aktual — bukan dari konstanta H — supaya dino
        // & kaktus tetap proporsional di semua ukuran. Sumbu-X mengikuti lebar
        // nyata; dunia jadi sedikit lebih rapat di layar sempit (wajar).
        function fit() {
            var rectW = cv.clientWidth || W;
            var rectH = cv.clientHeight || H;
            var dpr = Math.min(2, window.devicePixelRatio || 1);
            cv.width = Math.max(1, Math.round(rectW * dpr));
            cv.height = Math.max(1, Math.round(rectH * dpr));
            ctx.setTransform((cv.width / W), 0, 0, (cv.height / H), 0, 0);
        }
        fit();
        var onFit = function () { fit(); };
        window.addEventListener('resize', onFit);
        dinoFns.push(function () { window.removeEventListener('resize', onFit); });

        setScore();
        rafId = requestAnimationFrame(loop);
        dinoFns.push(function () { cancelAnimationFrame(rafId); });
    }

    // Pasang mode pager + posisi halaman saat ini (dipanggil ulang setelah re-inject).
    function mountPager() {
        var deck = document.getElementById('main-content');
        if (!deck) return;
        deck.classList.add('dm-pager');
        ensureTapZones(deck);
        var nav = document.getElementById('dm-nav');
        // Nav hanya relevan setelah undangan dibuka: host menaruh .is-opened /
        // menampilkan #main-content. Kalau cover masih ada dan belum dibuka,
        // biarkan tersembunyi; kita nyalakan saat cover hilang (lihat observer).
        if (nav) {
            nav.classList.toggle('is-on', isOpened());
            ensureDino(nav);        // pasang mini-game T-Rex di atas indikator
        }
        goToPage(PAGER_STATE.index || 0, { silent: true });
    }

    // Undangan dianggap "terbuka" bila cover sudah tak terlihat.
    function isOpened() {
        var cover = document.getElementById('theme-cover');
        if (!cover) return true;
        var cs = window.getComputedStyle(cover);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return true;
        // Host biasanya menandai root saat dibuka.
        return !!document.querySelector('.is-opened, .invitation-opened');
    }

    // (a) KETUK DUA ZONA — layar dibelah vertikal di tengah:
    //       ketuk paruh KIRI  → halaman SEBELUMNYA
    //       ketuk paruh KANAN → halaman BERIKUTNYA
    //     Arahnya ditentukan dari koordinat X ketukan relatif terhadap lebar
    //     dek, bukan dari elemen yang diketuk.
    //
    //     Elemen interaktif tetap dikecualikan: tombol RSVP, input ucapan, link
    //     menu, item galeri, dan daftar yang bisa digulir harus menerima
    //     ketukannya sendiri, bukan berpindah halaman.
    var INTERACTIVE = 'a,button,input,textarea,select,label,summary,video,audio,iframe,' +
        '.dm-wishes-list,.dm-gallery-item,.dm-acc,.dm-menu-dialog';

    function onDeckTap(e) {
        var deck = document.getElementById('main-content');
        if (!deck || !deck.classList.contains('dm-pager')) return;
        if (!isOpened()) return;
        // Abaikan ketukan di nav bar / hint / modal.
        if (e.target.closest('#dm-nav, .dm-tap-hint, .uk-modal, #menu-modal')) return;
        var page = e.target.closest('.dm-section');
        if (!page || !page.classList.contains('is-current')) return;
        // Ketukan pada elemen interaktif → jangan pindah halaman.
        if (e.target.closest(INTERACTIVE)) return;
        // Kalau ada teks yang sedang diseleksi, itu bukan "ketuk kosong".
        var sel = window.getSelection && window.getSelection();
        if (sel && String(sel).length > 0) return;

        // Titik ketuk: pointer/mouse punya clientX; keyboard-Enter tidak (0/undefined)
        // — untuk kasus itu perlakukan sebagai "next" seperti perilaku lama.
        var rect = deck.getBoundingClientRect();
        var x = (typeof e.clientX === 'number' && e.clientX > 0) ? e.clientX : null;
        if (x === null) { goToPage(PAGER_STATE.index + 1); return; }

        var isLeft = (x - rect.left) < (rect.width / 2);
        goToPage(PAGER_STATE.index + (isLeft ? -1 : 1));
        flashTapZone(isLeft);
    }

    // Umpan balik visual singkat supaya pengguna paham layar terbagi dua.
    function flashTapZone(isLeft) {
        var deck = document.getElementById('main-content');
        if (!deck) return;
        var el = deck.querySelector(isLeft ? '.dm-zone-left' : '.dm-zone-right');
        if (!el) return;
        el.classList.remove('is-flash');
        // paksa reflow agar animasi bisa diputar ulang beruntun
        void el.offsetWidth;
        el.classList.add('is-flash');
    }

    // (b/c) Tombol prev/next + titik indikator.
    function onNavClick(e) {
        var dot = e.target.closest('#dm-dots .dm-dot');
        if (dot) {
            e.preventDefault();
            goToPage(parseInt(dot.getAttribute('data-page'), 10) || 0);
            return;
        }
        if (e.target.closest('#dm-next')) { e.preventDefault(); goToPage(PAGER_STATE.index + 1); return; }
        if (e.target.closest('#dm-prev')) { e.preventDefault(); goToPage(PAGER_STATE.index - 1); return; }
    }

    // (e) Link menu (#couples, #schedule, …) harus melompat ke HALAMAN-nya,
    // bukan meng-anchor-scroll (tak ada scroll dokumen lagi di mode pager).
    function onMenuJump(e) {
        var a = e.target.closest('a[href^="#"]');
        if (!a) return;
        var id = a.getAttribute('href').slice(1);
        if (!id) return;
        var target = document.getElementById(id);
        if (!target) return;
        var page = target.closest ? target.closest('.dm-section') : null;
        if (!page) return;
        var idx = pagerPages().indexOf(page);
        if (idx === -1) return;
        e.preventDefault();
        goToPage(idx);
    }

    // (d) Panah keyboard.
    function onKey(e) {
        if (!isOpened()) return;
        var t = e.target;
        // Jangan bajak panah saat user mengetik di form.
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        if (e.key === 'ArrowRight' || e.key === 'PageDown') { goToPage(PAGER_STATE.index + 1); }
        else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { goToPage(PAGER_STATE.index - 1); }
    }

    document.addEventListener('click', onNavClick, true);
    document.addEventListener('click', onMenuJump, true);
    document.addEventListener('click', onDeckTap, false);   // bubble: biar handler lain jalan dulu
    document.addEventListener('keydown', onKey, false);
    cleanupFns.push(function () {
        document.removeEventListener('click', onNavClick, true);
        document.removeEventListener('click', onMenuJump, true);
        document.removeEventListener('click', onDeckTap, false);
        document.removeEventListener('keydown', onKey, false);
    });

    mountPager();

    // Host me-re-inject HTML (mis. setelah kirim ucapan) tanpa menjalankan ulang
    // JS ini → kelas .dm-pager/.is-current hilang dan nav kosong. Observer ini
    // memasangnya kembali. Juga dipakai untuk menyalakan nav saat cover ditutup.
    var reMountT = null;
    var mo = new MutationObserver(function () {
        var deck = document.getElementById('main-content');
        if (!deck) return;
        // Shell dino "mati" (ter-serialisasi tapi tak hidup) juga menandai perlu
        // remount — kalau tidak, host re-inject meninggalkan canvas detached yang
        // masih digambar oleh loop lama sementara yang tampil hanya cangkang HTML.
        var dinoShell = document.querySelector('#dm-nav .dm-dino');
        var dinoDead = !!dinoShell && !dinoShell.__dmLive;
        var needs = !deck.classList.contains('dm-pager') ||
            !deck.querySelector('.dm-section.is-current') ||
            !document.querySelector('#dm-dots .dm-dot') ||
            dinoDead;
        var navOff = (function () {
            var n = document.getElementById('dm-nav');
            return n && isOpened() && !n.classList.contains('is-on');
        })();
        if (!needs && !navOff) return;
        clearTimeout(reMountT);
        reMountT = setTimeout(mountPager, 60);   // debounce: re-inject datang bertubi-tubi
    });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    cleanupFns.push(function () { clearTimeout(reMountT); mo.disconnect(); });

    // Tinggi viewport berubah (rotate / bar browser) → hitung ulang is-tall.
    var onResize = function () { markTall(pagerPages()[PAGER_STATE.index]); };
    window.addEventListener('resize', onResize);
    cleanupFns.push(function () { window.removeEventListener('resize', onResize); });

    // ---- 5. Music icon mirroring (host owns the real audio) -----------------
    // The theme must never call audio.play(); it only reflects the host's
    // isPlaying state visually. The host already toggles the system FAB icon;
    // this keeps any in-theme music affordance in sync if one is added later.
    // We listen for the synthetic play/pause events the host dispatches on
    // #bg-music (see ThemeWrapper music-sync effect).
    var bg = document.getElementById('bg-music');
    if (bg) {
        var reflect = function (playing) {
            var btn = document.getElementById('btn-toggle-music') || document.getElementById('btn-music');
            if (btn) btn.classList.toggle('music-playing', !!playing);
        };
        var onPlay = function () { reflect(true); };
        var onPause = function () { reflect(false); };
        bg.addEventListener('play', onPlay);
        bg.addEventListener('pause', onPause);
        cleanupFns.push(function () {
            bg.removeEventListener('play', onPlay);
            bg.removeEventListener('pause', onPause);
        });
    }
})();
