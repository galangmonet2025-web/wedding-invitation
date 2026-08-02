/* =========================================================================
   GOOGLE MAPS — theme JS
   Host contract (ThemeWrapper): this script is REMOVED and RE-EXECUTED every
   time its inputs change. So it must:
     - register a global cleanup hook and run it on entry (no stacked
       listeners / observers / RAF loops),
     - keep menu/QR nav DOCUMENT-DELEGATED so it survives host HTML
       re-injection (host swaps innerHTML on RSVP/wish submit),
     - NEVER call audio.play() — the host owns the real player; we only
       mirror the play/pause icon and let the host intercept #btn-toggle-music.
   ========================================================================= */
(function () {
    'use strict';

    // ---- Run previous instance's cleanup, then start a fresh registry -------
    if (typeof window.__gmapCleanup === 'function') {
        try { window.__gmapCleanup(); } catch (e) { /* noop */ }
    }
    var cleanupFns = [];
    window.__gmapCleanup = function () {
        cleanupFns.forEach(function (fn) { try { fn(); } catch (e) { /* noop */ } });
        cleanupFns = [];
    };

    // =====================================================================
    // Copy-to-clipboard (used by inline onclick in the gift section)
    // =====================================================================
    window.copyToClipboard = function (elementId, btn) {
        var el = document.getElementById(elementId);
        if (!el) return;
        var text = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
            ? el.value : (el.innerText || el.textContent);
        var original = btn.innerHTML;

        function done() {
            if (typeof UIkit !== 'undefined') {
                UIkit.notification({
                    message: '<span uk-icon="icon: check"></span> Berhasil disalin!',
                    status: 'success', pos: 'top-center', timeout: 2000
                });
            } else {
                btn.innerHTML = '<span uk-icon="check"></span> Tersalin';
                setTimeout(function () { btn.innerHTML = original; }, 2000);
            }
        }
        function fallback() {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.focus(); ta.select();
            try { document.execCommand('copy'); done(); } catch (e) { /* noop */ }
            document.body.removeChild(ta);
        }
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(done).catch(fallback);
        } else {
            fallback();
        }
    };

    // =====================================================================
    // Countdown — reads the REAL wedding date from the DB (#tm-wed-date).
    // =====================================================================
    (function startCountdown() {
        if (window.__gmapCountdownTimer) {
            clearInterval(window.__gmapCountdownTimer);
            window.__gmapCountdownTimer = null;
        }

        function resolveDay() {
            var holder = document.getElementById('wedding-calendar')
                || document.getElementById('tm-wed-date');
            var raw = holder ? (holder.getAttribute('data-wedding-date') || '').trim() : '';
            var m = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (m) return new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0);
            if (raw) { var d = new Date(raw); if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0); }
            return null;
        }

        function receptionEnd(day) {
            var holder = document.getElementById('tm-jam-resepsi');
            var txt = holder ? (holder.textContent || '') : '';
            var times = txt.match(/(\d{1,2}):(\d{2})/g) || [];
            var endH = 23, endM = 59;
            if (times.length >= 2) { var p = times[times.length - 1].split(':'); endH = +p[0]; endM = +p[1]; }
            else if (times.length === 1) { var q = times[0].split(':'); endH = +q[0] + 3; endM = +q[1]; }
            var end = new Date(day.getTime());
            end.setHours(Math.min(23, endH), endM, 0, 0);
            return end;
        }

        var day = resolveDay();

        function setStatus(msg) {
            var el = document.getElementById('countdown-status');
            var box = document.getElementById('countdown');
            if (el) { el.textContent = msg; el.style.display = 'block'; }
            if (box) box.style.display = 'none';
        }

        if (!day || isNaN(day.getTime())) return;
        var recEnd = receptionEnd(day);

        function set(id, v) { var e = document.getElementById(id); if (e) e.textContent = String(v).padStart(2, '0'); }

        function tick() {
            var dist = day.getTime() - Date.now();
            if (dist > 0) {
                set('days', Math.floor(dist / 864e5));
                set('hours', Math.floor((dist % 864e5) / 36e5));
                set('minutes', Math.floor((dist % 36e5) / 6e4));
                set('seconds', Math.floor((dist % 6e4) / 1000));
            } else if (Date.now() <= recEnd.getTime()) {
                setStatus('Anda telah tiba — acara sedang berlangsung 📍');
                clearInterval(window.__gmapCountdownTimer); window.__gmapCountdownTimer = null;
            } else {
                setStatus('You have arrived! Terima kasih atas doa & restunya 🙏');
                clearInterval(window.__gmapCountdownTimer); window.__gmapCountdownTimer = null;
            }
        }
        tick();
        window.__gmapCountdownTimer = setInterval(tick, 1000);
        cleanupFns.push(function () {
            if (window.__gmapCountdownTimer) { clearInterval(window.__gmapCountdownTimer); window.__gmapCountdownTimer = null; }
        });
    })();

    // =====================================================================
    // Scroll reveal (IntersectionObserver → .is-visible)
    // =====================================================================
    (function scrollReveal() {
        var scope = document.querySelector('.mock-app-screen');
        if (!scope || !('IntersectionObserver' in window)) {
            document.querySelectorAll('.reveal-item').forEach(function (el) { el.classList.add('is-visible'); });
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) {
                    en.target.classList.add('is-visible');
                    io.unobserve(en.target);
                }
            });
        }, { root: scope, threshold: 0.12 });

        document.querySelectorAll('.reveal-item:not(.is-visible)').forEach(function (el) { io.observe(el); });
        cleanupFns.push(function () { io.disconnect(); });
    })();

    // =====================================================================
    // Music icon mirroring — reflect #bg-music state ONLY.
    // =====================================================================
    (function musicMirror() {
        var audio = document.getElementById('bg-music');
        var btn = document.getElementById('btn-toggle-music');
        // Cukup salah satu ada. Dulu di-return kalau #bg-music tidak ada, padahal
        // pada backsound YouTube elemen itu bisa saja tidak dipasang host —
        // akibatnya seluruh cermin status musik mati total.
        if (!audio && !btn) return;

        var fab = document.getElementById('theme-fab-container');

        // SUMBER KEBENARAN = kelas `music-playing` pada #btn-toggle-music, yang
        // ditulis host (ThemeWrapper) untuk SEMUA sumber musik.
        // JANGAN pakai `!audio.paused`: kalau backsound tenant berupa YouTube,
        // host memutarnya lewat player YouTube dan <audio id="bg-music"> tidak
        // pernah benar-benar play — audio.paused selamanya true, sehingga
        // .is-playing tak pernah menyala (equalizer diam & tombol tak berubah).
        // Host memang mengirim event 'play'/'pause' buatan ke #bg-music, tapi itu
        // hanya event; properti .paused-nya tidak ikut berubah.
        function isPlayingNow() {
            if (btn && btn.classList.contains('music-playing')) return true;
            return !!audio && !audio.paused;   // cadangan untuk backsound non-YouTube
        }
        function sync() {
            var playing = isPlayingNow();
            // Ikon play/pause juga diurus host, tapi tetap disetel di sini supaya
            // benar pada mode pratinjau/editor yang tidak menjalankan host.
            var play = document.getElementById('play-icon');
            var pause = document.getElementById('pause-icon');
            if (play && pause) {
                play.style.display = playing ? 'none' : 'block';
                pause.style.display = playing ? 'block' : 'none';
            }
            if (fab) fab.classList.toggle('is-playing', playing);
        }

        if (audio) {
            audio.addEventListener('play', sync);
            audio.addEventListener('pause', sync);
            audio.addEventListener('playing', sync);
        }

        // Host mengubah kelas `music-playing` langsung lewat classList (bukan
        // event), jadi perubahannya hanya bisa ditangkap dengan MutationObserver.
        var btnObserver = null;
        if (btn && typeof MutationObserver === 'function') {
            btnObserver = new MutationObserver(sync);
            btnObserver.observe(btn, { attributes: true, attributeFilter: ['class'] });
        }

        sync();
        cleanupFns.push(function () {
            if (audio) {
                audio.removeEventListener('play', sync);
                audio.removeEventListener('pause', sync);
                audio.removeEventListener('playing', sync);
            }
            if (btnObserver) btnObserver.disconnect();
        });
    })();

    // =====================================================================
    // Menu + QR modals — DOCUMENT-DELEGATED (survive HTML re-injection).
    // =====================================================================
    (function navAndModals() {
        var menu = document.getElementById('menu-modal');
        var qr = document.getElementById('qr-modal');

        function openMenu() { if (menu) menu.classList.add('is-open'); }
        function closeMenu() { if (menu) menu.classList.remove('is-open'); }
        function closeQr() { if (qr) qr.classList.remove('is-open'); }

        function onClick(e) {
            var t = e.target.closest ? e.target.closest('[data-scroll], #btn-show-menu, #btn-close-menu, #btn-close-qr') : null;
            if (!t) return;

            if (t.id === 'btn-show-menu') { openMenu(); return; }
            if (t.id === 'btn-close-menu') { closeMenu(); return; }
            if (t.id === 'btn-close-qr') { closeQr(); return; }

            var target = t.getAttribute('data-scroll');
            if (target) {
                closeMenu();
                var sec = document.getElementById(target);
                if (sec) setTimeout(function () { sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120);
            }
        }
        document.addEventListener('click', onClick);
        cleanupFns.push(function () { document.removeEventListener('click', onClick); });

        function onBackdrop(e) {
            if (e.target === menu) closeMenu();
            if (e.target === qr) closeQr();
        }
        document.addEventListener('click', onBackdrop);
        cleanupFns.push(function () { document.removeEventListener('click', onBackdrop); });
    })();

    // =====================================================================
    // Nav-bar PREV / NEXT — jump destination by destination (section by section).
    // =====================================================================
    (function navbarNav() {
        var scope = document.querySelector('.mock-app-screen');
        var prev = document.getElementById('pb-prev');
        var next = document.getElementById('pb-next');
        if (!scope || (!prev && !next)) return;

        // SEMUA <section> ikut diurutkan, bukan cuma yang ber-id/ber-label:
        // hero (.section-hero) dan penutup (.section-closing) tidak punya
        // keduanya, sehingga dulu terlewat — "prev" dari Mempelai tidak bisa
        // balik ke hero dan "next" dari Gift tidak bisa sampai ke penutup.
        // Yang dibuang cuma cover (itu gerbang, bukan bagian alur baca).
        var sections = Array.prototype.slice.call(
            scope.querySelectorAll('section')
        ).filter(function (el) {
            return el.id !== 'theme-cover' && el.offsetParent !== null;
        });
        if (!sections.length) return;

        function scrollTo(el) {
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        // Posisi diukur lewat getBoundingClientRect() — relatif VIEWPORT, jadi
        // selalu benar tanpa perlu tahu elemen mana yang sebenarnya men-scroll.
        // Versi lama membandingkan el.offsetTop dengan scope.scrollTop, padahal
        // .mock-app-screen tidak pernah scroll (yang scroll = window), sehingga
        // scrollTop selalu 0 dan currentIndex() selalu mengembalikan section yang
        // sama → tombol next/prev terasa "nyangkut" di beberapa section saja.
        function currentIndex() {
            var best = 0, bestDist = Infinity;
            sections.forEach(function (el, i) {
                // Toleransi 2px supaya section yang pas menempel di atas layar
                // tidak kalah oleh pembulatan sub-pixel.
                var d = Math.abs(el.getBoundingClientRect().top);
                if (d < bestDist - 2) { bestDist = d; best = i; }
            });
            return best;
        }
        // scrollIntoView({behavior:'smooth'}) berjalan ASINKRON. Kalau tombol
        // ditekan cepat berturut-turut, currentIndex() membaca posisi yang masih
        // di tengah animasi sehingga hasilnya section yang sama → klik ke-2 dst
        // terasa tidak berfungsi. Selama animasi berlangsung indeks dikunci dan
        // dihitung dari target terakhir, bukan dari posisi scroll saat itu.
        var pendingIdx = -1, pendingTimer = 0;
        function go(delta) {
            var from = pendingIdx >= 0 ? pendingIdx : currentIndex();
            var to = Math.max(0, Math.min(sections.length - 1, from + delta));
            pendingIdx = to;
            clearTimeout(pendingTimer);
            // Lepas kunci setelah animasi smooth selesai (~700ms cukup aman).
            pendingTimer = setTimeout(function () { pendingIdx = -1; }, 700);
            scrollTo(sections[to]);
        }
        function onPrev() { go(-1); }
        function onNext() { go(1); }

        if (prev) prev.addEventListener('click', onPrev);
        if (next) next.addEventListener('click', onNext);
        cleanupFns.push(function () {
            clearTimeout(pendingTimer);
            if (prev) prev.removeEventListener('click', onPrev);
            if (next) next.removeEventListener('click', onNext);
        });
    })();

    // =====================================================================
    // Nav-bar now-playing — read the YouTube backsound's channel + video
    // title from the host-mounted hidden iframe and show them (marquee if long).
    // Falls back to the static template text when the backsound isn't YouTube.
    // We only READ track metadata; the host owns real playback.
    // =====================================================================
    (function ytNowPlaying() {
        var channelEl = document.getElementById('pb-np-channel');
        var titleEl = document.getElementById('pb-np-title');
        if (!titleEl) return;

        function marqueeInner() { return titleEl.querySelector('.np-marquee-inner'); }

        function measure() {
            var inner = marqueeInner();
            if (!inner) return;
            titleEl.classList.remove('is-marquee');
            titleEl.style.removeProperty('--np-scroll');
            titleEl.style.removeProperty('--np-scroll-dur');
            var overflow = inner.scrollWidth - titleEl.clientWidth;
            if (overflow > 6) {
                // Geser PERSIS sebanyak teks yang keluar layar (dulu ditambah -24px
                // untuk memberi ruang lompatan balik; sekarang animasinya bolak-balik
                // jadi tambahan itu justru bikin teks kelewat mundur dan menyisakan
                // ruang kosong di ujung).
                titleEl.style.setProperty('--np-scroll', (-overflow - 4) + 'px');
                // Satu siklus = SEKALI jalan (maju saja), karena `alternate` membuat
                // arah baliknya jadi siklus tersendiri. Durasinya dinaikkan sedikit
                // dari versi lama supaya kecepatan bacanya tetap enak.
                var dur = Math.min(16, Math.max(4.5, overflow * 0.045));
                titleEl.style.setProperty('--np-scroll-dur', dur.toFixed(1) + 's');
                titleEl.classList.add('is-marquee');
            }
        }
        function setTitle(text) {
            var inner = marqueeInner();
            if (!inner || !text || inner.textContent === text) return;
            inner.textContent = text;
            window.requestAnimationFrame(measure);
        }
        function setChannel(text) {
            if (channelEl && text && channelEl.textContent !== text) channelEl.textContent = text;
        }

        var rzT;
        function onResize() { clearTimeout(rzT); rzT = setTimeout(measure, 200); }
        window.addEventListener('resize', onResize);
        cleanupFns.push(function () { clearTimeout(rzT); window.removeEventListener('resize', onResize); });
        window.requestAnimationFrame(measure);

        // --- talk to the host's hidden YouTube backsound iframe ---
        function findFrame() { return document.querySelector('iframe[title="YouTube Background Music"]'); }
        var iframe = null;

        function subscribe() {
            try {
                iframe.contentWindow.postMessage(
                    JSON.stringify({ event: 'listening', id: 'gmap-np' }), '*');
            } catch (e) { /* noop */ }
        }
        function onMessage(e) {
            if (typeof e.data !== 'string' || e.origin.indexOf('youtube') === -1) return;
            var msg;
            try { msg = JSON.parse(e.data); } catch (_) { return; }
            if (!msg || msg.event !== 'infoDelivery' || !msg.info) return;
            var vd = msg.info.videoData;
            if (vd && vd.title) setTitle(vd.title);
            if (vd && vd.author) setChannel(vd.author);
        }
        window.addEventListener('message', onMessage);
        cleanupFns.push(function () { window.removeEventListener('message', onMessage); });

        function start(frame) {
            iframe = frame;
            subscribe();
            [300, 800, 1600, 3000].forEach(function (d) {
                var t = setTimeout(subscribe, d);
                cleanupFns.push(function () { clearTimeout(t); });
            });
            var poll = setInterval(subscribe, 3000);
            cleanupFns.push(function () { clearInterval(poll); });
        }

        var f = findFrame();
        if (f) { start(f); return; }
        var mo = new MutationObserver(function () {
            var frame = findFrame();
            if (frame) { mo.disconnect(); start(frame); }
        });
        mo.observe(document.body, { childList: true, subtree: true });
        cleanupFns.push(function () { mo.disconnect(); });
        var moStop = setTimeout(function () { mo.disconnect(); }, 20000);
        cleanupFns.push(function () { clearTimeout(moStop); });
    })();

    // =====================================================================
    // Share-happiness story carousel (horizontal snap).
    // =====================================================================
    (function storyCarousel() {
        var carousel = document.getElementById('story-carousel');
        if (!carousel) return;

        var slides = Array.prototype.slice.call(carousel.querySelectorAll('.story-slide'));
        var dots = Array.prototype.slice.call(document.querySelectorAll('#story-dots .story-dot-nav'));
        if (!slides.length) return;

        function activeIndex() {
            var mid = carousel.scrollLeft + carousel.clientWidth / 2;
            var best = 0, bestDist = Infinity;
            slides.forEach(function (s, i) {
                var c = s.offsetLeft + s.offsetWidth / 2;
                var d = Math.abs(c - mid);
                if (d < bestDist) { bestDist = d; best = i; }
            });
            return best;
        }

        function syncActive() {
            var idx = activeIndex();
            slides.forEach(function (s, i) { s.classList.toggle('is-active', i === idx); });
            dots.forEach(function (d, i) { d.classList.toggle('is-active', i === idx); });
        }

        var scrollRaf = false;
        function onScroll() {
            if (!scrollRaf) {
                window.requestAnimationFrame(function () { syncActive(); scrollRaf = false; });
                scrollRaf = true;
            }
        }
        carousel.addEventListener('scroll', onScroll, { passive: true });

        var dotHandlers = [];
        dots.forEach(function (dot, i) {
            function onDot() {
                var s = slides[i];
                if (s) {
                    carousel.scrollTo({
                        left: s.offsetLeft - (carousel.clientWidth - s.offsetWidth) / 2,
                        behavior: 'smooth'
                    });
                }
            }
            dot.addEventListener('click', onDot);
            dotHandlers.push([dot, onDot]);
        });

        if (slides[0]) {
            carousel.scrollLeft = slides[0].offsetLeft - (carousel.clientWidth - slides[0].offsetWidth) / 2;
        }
        syncActive();

        cleanupFns.push(function () {
            carousel.removeEventListener('scroll', onScroll);
            dotHandlers.forEach(function (h) { h[0].removeEventListener('click', h[1]); });
        });
    })();

    // =====================================================================
    // Cover "open invitation" reveal — registered OUTSIDE cleanupFns on
    // purpose (see memory: theme-intro-reexec-bug).
    // =====================================================================
    (function coverReveal() {
        var screen = document.querySelector('.mock-app-screen');
        var fab = document.getElementById('theme-fab-container');
        var btnOpen = document.getElementById('btn-open-invitation');

        function reveal() {
            if (screen) screen.classList.add('reveal-content');
            if (fab) fab.style.display = 'block';
        }
        if (btnOpen) btnOpen.addEventListener('click', reveal);

        if (screen && screen.classList.contains('reveal-content') && fab) {
            fab.style.display = 'block';
        }
    })();

})();
