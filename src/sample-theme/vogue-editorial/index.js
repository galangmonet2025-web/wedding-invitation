/* ============================================================================
   VOGUE EDITORIAL — index.js
   ----------------------------------------------------------------------------
   Kontrak host yang dipatuhi (lihat ThemeWrapper.tsx):
   - Skrip ini di-eksekusi ULANG saat `jsBase` berubah ATAU `isOpened` berpindah.
     HTML bisa di-inject ulang TANPA skrip ini jalan lagi (mis. sesudah kirim
     ucapan/RSVP) -> semua listener nav WAJIB document-delegated.
   - Wajib punya hook cleanup global; dipanggil di awal agar tidak menumpuk.
   - Tema TIDAK memutar audio & TIDAK menulis ikon musik (host pemilik tunggal).
   - Tema TIDAK melakukan fetch untuk RSVP/ucapan (host yang mengirim).
   - Reveal wajib pakai kelas `.reveal-item` + `.is-visible` (dikenal host).
   ========================================================================== */
(function () {
    'use strict';

    /* ---- 1. Jalankan cleanup instance sebelumnya, lalu buat registry baru ---- */
    if (typeof window.__vgCleanup === 'function') {
        try { window.__vgCleanup(); } catch (e) { /* noop */ }
    }
    var cleanupFns = [];
    window.__vgCleanup = function () {
        cleanupFns.forEach(function (fn) {
            try { fn(); } catch (e) { /* noop */ }
        });
        cleanupFns = [];
    };

    function scroller() {
        return document.querySelector('.mock-app-screen');
    }

    /* ------------------------------------------------------------------------
       2. BARCODE SAMPUL
       Lebar batang dibangkitkan deterministik dari kode undangan, supaya tiap
       tamu punya "barcode" sendiri tapi stabil (tidak berubah tiap render).
       ---------------------------------------------------------------------- */
    (function buildBarcode() {
        var host = document.getElementById('vg-barcode-bars');
        if (!host || host.childElementCount) return;

        var codeEl = host.parentElement
            ? host.parentElement.querySelector('.vg-barcode__code')
            : null;
        var seedText = (codeEl && codeEl.textContent ? codeEl.textContent : 'undangan').trim();

        var seed = 0;
        for (var i = 0; i < seedText.length; i++) {
            seed = (seed * 31 + seedText.charCodeAt(i)) % 100000;
        }

        var frag = document.createDocumentFragment();
        for (var b = 0; b < 34; b++) {
            seed = (seed * 1103515245 + 12345) % 2147483648;
            var bar = document.createElement('i');
            // lebar 1–3px, sebagian batang dibuat lebih pendek seperti barcode asli
            bar.style.width = (1 + (seed % 3)) + 'px';
            if (seed % 7 === 0) bar.style.height = '72%';
            frag.appendChild(bar);
        }
        host.appendChild(frag);
    })();

    /* ------------------------------------------------------------------------
       3. REVEAL ON SCROLL
       root = .mock-app-screen (kolom undangan yang men-scroll di desktop).
       Fallback: kalau IO tidak ada, tampilkan semuanya.
       ---------------------------------------------------------------------- */
    (function scrollReveal() {
        var scope = scroller();
        var items = document.querySelectorAll('.reveal-item:not(.is-visible)');
        if (!items.length) return;

        if (!('IntersectionObserver' in window)) {
            Array.prototype.forEach.call(items, function (el) {
                el.classList.add('is-visible');
            });
            return;
        }

        // Kalau kolom undangan tidak men-scroll sendiri (mobile), pakai viewport.
        var root = (scope && scope.scrollHeight > scope.clientHeight + 5) ? scope : null;

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) {
                    en.target.classList.add('is-visible');
                    io.unobserve(en.target);
                }
            });
        }, { root: root, threshold: 0.12 });

        Array.prototype.forEach.call(items, function (el) { io.observe(el); });
        cleanupFns.push(function () { io.disconnect(); });
    })();

    /* ------------------------------------------------------------------------
       4. NAVIGASI + MODAL — DOCUMENT-DELEGATED
       Wajib delegated: host meng-inject ulang HTML sesudah RSVP/ucapan dikirim,
       sehingga listener langsung akan lepas dan nav mati.
       Catatan: memakai data-scroll, BUKAN href="#id", karena host menelan
       semua anchor hash untuk melindungi HashRouter.
       ---------------------------------------------------------------------- */
    (function navigation() {
        function openModal(id) {
            var m = document.getElementById(id);
            if (m) m.classList.add('is-open');
        }
        function closeModal(id) {
            var m = document.getElementById(id);
            if (m) m.classList.remove('is-open');
        }

        function onClick(e) {
            var t = e.target && e.target.closest
                ? e.target.closest('[data-scroll], [data-copy], #btn-show-menu, #btn-close-menu, #btn-close-qr, #btn-scroll-up, .vg-modal, .vg-gallery__item, #vg-lightbox, #vg-lightbox-close')
                : null;
            if (!t) return;

            // -- tutup modal saat klik area gelap --
            if (t.classList && t.classList.contains('vg-modal')) {
                if (e.target === t) t.classList.remove('is-open');
                return;
            }

            // -- lightbox internal (fallback bila host tidak menangani) --
            if (t.id === 'vg-lightbox' || t.id === 'vg-lightbox-close') {
                closeModal('vg-lightbox');
                return;
            }

            if (t.id === 'btn-show-menu') { openModal('menu-modal'); return; }
            if (t.id === 'btn-close-menu') { closeModal('menu-modal'); return; }
            if (t.id === 'btn-close-qr') { closeModal('qr-modal'); return; }

            if (t.id === 'btn-scroll-up') {
                var sc = scroller();
                if (sc) sc.scrollTo({ top: 0, behavior: 'smooth' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            // -- salin nomor rekening / alamat --
            var copyId = t.getAttribute && t.getAttribute('data-copy');
            if (copyId) {
                var src = document.getElementById(copyId);
                if (!src) return;
                // Kalau sumbernya terdiri dari beberapa baris (mis. alamat: nama
                // lokasi + alamat), `textContent` polos akan MENEMPELKANNYA tanpa
                // pemisah. Ambil per-elemen anak lalu gabung dengan baris baru.
                var parts = src.querySelectorAll('[data-copy-line]');
                var text;
                if (parts.length) {
                    var buf = [];
                    Array.prototype.forEach.call(parts, function (el) {
                        var s = (el.textContent || '').trim();
                        if (s) buf.push(s);
                    });
                    text = buf.join('\n');
                } else {
                    text = (src.textContent || '').replace(/\s+/g, ' ').trim();
                }
                var label = t.textContent;
                var done = function () {
                    t.textContent = 'Tersalin';
                    setTimeout(function () { t.textContent = label; }, 1600);
                };
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(done, function () { });
                } else {
                    var ta = document.createElement('textarea');
                    ta.value = text;
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    try { document.execCommand('copy'); done(); } catch (err) { /* noop */ }
                    document.body.removeChild(ta);
                }
                return;
            }

            // -- navigasi antar-section --
            var targetId = t.getAttribute && t.getAttribute('data-scroll');
            if (targetId) {
                closeModal('menu-modal');
                var sec = document.getElementById(targetId);
                if (sec) {
                    setTimeout(function () {
                        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 120);
                }
            }
        }

        document.addEventListener('click', onClick);
        cleanupFns.push(function () { document.removeEventListener('click', onClick); });

        // Esc menutup modal yang terbuka
        function onKey(e) {
            if (e.key !== 'Escape') return;
            ['menu-modal', 'qr-modal', 'vg-lightbox'].forEach(closeModal);
        }
        document.addEventListener('keydown', onKey);
        cleanupFns.push(function () { document.removeEventListener('keydown', onKey); });
    })();

    /* ------------------------------------------------------------------------
       5. TOMBOL KE ATAS — muncul setelah menggulir
       Di-scope ke .mock-app-screen bila ia yang men-scroll, kalau tidak window.
       ---------------------------------------------------------------------- */
    (function scrollUpVisibility() {
        var btn = document.getElementById('btn-scroll-up');
        if (!btn) return;

        var sc = scroller();
        var useScope = !!(sc && sc.scrollHeight > sc.clientHeight + 5);
        var scope = useScope ? sc : window;

        function onScroll() {
            var top = useScope ? sc.scrollTop : (window.pageYOffset || 0);
            btn.style.display = top > 500 ? 'flex' : 'none';
        }

        scope.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        cleanupFns.push(function () { scope.removeEventListener('scroll', onScroll); });
    })();

    /* ------------------------------------------------------------------------
       6. PARALLAX SIDEBAR DESKTOP (halus, hanya bila layar lebar)
       CATATAN: #layer-bg memakai background-size:contain (foto tampil utuh),
       jadi parallax TIDAK boleh memakai translate — menggeser foto contain
       membuatnya lepas dari tengah dan menyisakan celah di tepi. Dipakai skala
       sangat kecil saja: tetap terpusat, tetap utuh.
       ---------------------------------------------------------------------- */
    (function sidebarParallax() {
        var bg = document.getElementById('layer-bg');
        if (!bg || window.innerWidth < 960) return;

        var raf = 0;
        function onMove(e) {
            if (raf) return;
            raf = requestAnimationFrame(function () {
                raf = 0;
                var dx = Math.abs(e.clientX / window.innerWidth - 0.5);
                var dy = Math.abs(e.clientY / window.innerHeight - 0.5);
                var scale = 1 + (dx + dy) * 0.012; // maksimal ~1.012
                bg.style.transform = 'scale(' + scale.toFixed(4) + ')';
            });
        }
        window.addEventListener('mousemove', onMove, { passive: true });
        cleanupFns.push(function () {
            window.removeEventListener('mousemove', onMove);
            if (raf) cancelAnimationFrame(raf);
        });
    })();

    /* ------------------------------------------------------------------------
       7. STATUS COUNTDOWN
       Angka countdown digerakkan HOST lewat {{countdown_*}} (span
       #tm-countdown-*). Di sini kita HANYA menambahkan pesan status saat hari-H
       terlewat — tanpa menyentuh angka milik host.
       ---------------------------------------------------------------------- */
    (function countdownStatus() {
        var holder = document.getElementById('vg-wed-date');
        var statusEl = document.getElementById('countdown-status');
        if (!holder || !statusEl) return;

        var raw = (holder.getAttribute('data-wedding-date') || '').trim();
        var m = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return;

        var day = new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0);
        // Anggap acara selesai H+1 pukul 00:00
        var endOfDay = new Date(day.getTime() + 864e5);

        if (window.__vgCountdownTimer) {
            clearInterval(window.__vgCountdownTimer);
            window.__vgCountdownTimer = null;
        }

        function tick() {
            var now = Date.now();
            if (now < day.getTime()) return; // biarkan host menampilkan angka

            var grid = document.querySelector('.vg-countdown');
            if (now <= endOfDay.getTime()) {
                statusEl.textContent = 'Hari yang kami nantikan telah tiba';
            } else {
                statusEl.textContent = 'Acara telah selesai — terima kasih atas doa & restunya';
                if (grid) grid.style.display = 'none';
            }
            statusEl.style.display = 'block';

            clearInterval(window.__vgCountdownTimer);
            window.__vgCountdownTimer = null;
        }

        tick();
        window.__vgCountdownTimer = setInterval(tick, 1000);
        cleanupFns.push(function () {
            if (window.__vgCountdownTimer) {
                clearInterval(window.__vgCountdownTimer);
                window.__vgCountdownTimer = null;
            }
        });
    })();

    /* ------------------------------------------------------------------------
       8. LIGHTBOX GALERI (cadangan)
       Host sudah menangani .gallery-item / .lightbox-injection. Ini hanya jalan
       bila host tidak membuka apa pun, dan sengaja TIDAK memblokir event host.
       ---------------------------------------------------------------------- */
    (function galleryFallback() {
        function onClick(e) {
            var item = e.target && e.target.closest ? e.target.closest('.vg-gallery__item') : null;
            if (!item) return;

            var img = item.querySelector('img');
            var box = document.getElementById('vg-lightbox');
            var boxImg = document.getElementById('vg-lightbox-img');
            if (!img || !box || !boxImg) return;

            // Beri host kesempatan lebih dulu; buka cadangan hanya bila tak ada
            // lightbox host yang muncul.
            setTimeout(function () {
                var hostBox = document.querySelector(
                    '.uk-lightbox.uk-open, .uk-modal.uk-open, [class*="lightbox"][class*="open"]'
                );
                if (hostBox) return;
                boxImg.src = img.getAttribute('src') || '';
                box.classList.add('is-open');
            }, 60);
        }

        document.addEventListener('click', onClick);
        cleanupFns.push(function () { document.removeEventListener('click', onClick); });
    })();

    /* ------------------------------------------------------------------------
       9. TAMPILKAN FAB SAAT UNDANGAN DIBUKA
       SENGAJA di luar cleanupFns: host mengeksekusi ulang skrip ini ketika
       isOpened berpindah. Kalau handler ini ikut dibuang, animasi/efek buka
       tidak pernah jalan di undangan live (lihat: theme-intro-reexec-bug).
       Catatan: bila flag_use_system_action_button = true (default), host tetap
       menyembunyikan #theme-fab-container lewat CSS !important — dan itu benar.
       ---------------------------------------------------------------------- */
    var screenEl = scroller();
    var fabEl = document.getElementById('theme-fab-container');

    function revealFab() {
        if (fabEl) fabEl.style.display = 'block';
    }

    var btnOpen = document.getElementById('btn-open-invitation');
    if (btnOpen) btnOpen.addEventListener('click', revealFab);

    // Bila host sudah menandai terbuka (re-inject sesudah dibuka), ikuti.
    if (screenEl && screenEl.classList.contains('reveal-content')) {
        revealFab();
    }
})();
