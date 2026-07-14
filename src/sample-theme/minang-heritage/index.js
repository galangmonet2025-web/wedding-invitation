/* =========================================================================
   MINANG HERITAGE — theme JS
   Warm Minangkabau palette (cream / gold / burgundy) with Rumah Gadang &
   songket ornaments. Structure/host-wiring cloned from the "timeless" theme.

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
    if (typeof window.__minangCleanup === 'function') {
        try { window.__minangCleanup(); } catch (e) { /* noop */ }
    }
    var cleanupFns = [];
    window.__minangCleanup = function () {
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
    // Countdown — reads the REAL wedding date from the DB (#mg-wed-date).
    // Self-contained + guards against stacked intervals on re-execution.
    // =====================================================================
    (function startCountdown() {
        if (window.__mgCountdownTimer) {
            clearInterval(window.__mgCountdownTimer);
            window.__mgCountdownTimer = null;
        }

        function resolveDay() {
            var holder = document.getElementById('wedding-calendar')
                || document.getElementById('mg-wed-date');
            var raw = holder ? (holder.getAttribute('data-wedding-date') || '').trim() : '';
            var m = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (m) return new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0);
            if (raw) { var d = new Date(raw); if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0); }
            return null;
        }

        function receptionEnd(day) {
            var holder = document.getElementById('mg-jam-resepsi');
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
                setStatus('Hari yang kami nantikan telah tiba 🤍');
                clearInterval(window.__mgCountdownTimer); window.__mgCountdownTimer = null;
            } else {
                setStatus('Acara kami telah selesai. Terima kasih atas doa & restunya 🙏');
                clearInterval(window.__mgCountdownTimer); window.__mgCountdownTimer = null;
            }
        }
        tick();
        window.__mgCountdownTimer = setInterval(tick, 1000);
        cleanupFns.push(function () {
            if (window.__mgCountdownTimer) { clearInterval(window.__mgCountdownTimer); window.__mgCountdownTimer = null; }
        });
    })();

    // =====================================================================
    // Scroll reveal (IntersectionObserver → .is-visible)
    // =====================================================================
    (function scrollReveal() {
        var scope = document.querySelector('.mock-app-screen');
        if (!scope || !('IntersectionObserver' in window)) {
            // Fallback: reveal everything so nothing stays blank.
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
    // The host owns the actual Audio; we never call play()/pause() here.
    // =====================================================================
    (function musicMirror() {
        var audio = document.getElementById('bg-music');
        var btn = document.getElementById('btn-toggle-music');
        if (!audio) return;

        function sync() {
            var play = document.getElementById('play-icon');
            var pause = document.getElementById('pause-icon');
            if (!play || !pause) return;
            if (audio.paused) {
                play.style.display = 'block';
                pause.style.display = 'none';
                if (btn) btn.classList.remove('music-playing');
            } else {
                play.style.display = 'none';
                pause.style.display = 'block';
                if (btn) btn.classList.add('music-playing');
            }
        }
        audio.addEventListener('play', sync);
        audio.addEventListener('pause', sync);
        audio.addEventListener('playing', sync);
        sync();
        cleanupFns.push(function () {
            audio.removeEventListener('play', sync);
            audio.removeEventListener('pause', sync);
            audio.removeEventListener('playing', sync);
        });
    })();

    // =====================================================================
    // Menu + QR modals + scroll-up — DOCUMENT-DELEGATED so a single set of
    // listeners survives host HTML re-injection. We attach ONE delegated
    // click handler on document and reference elements live at click time.
    // =====================================================================
    (function navAndModals() {
        var menu = document.getElementById('menu-modal');
        var qr = document.getElementById('qr-modal');

        function openMenu() { if (menu) menu.classList.add('is-open'); }
        function closeMenu() { if (menu) menu.classList.remove('is-open'); }
        function closeQr() { if (qr) qr.classList.remove('is-open'); }
        // Note: opening the QR is host-driven (host intercepts #btn-show-qr).
        // We only provide the container + a close affordance.

        function onClick(e) {
            var t = e.target.closest ? e.target.closest('[data-scroll], #btn-show-menu, #btn-close-menu, #btn-close-qr, #btn-scroll-up') : null;
            if (!t) return;

            if (t.id === 'btn-show-menu') { openMenu(); return; }
            if (t.id === 'btn-close-menu') { closeMenu(); return; }
            if (t.id === 'btn-close-qr') { closeQr(); return; }

            if (t.id === 'btn-scroll-up') {
                var scope = document.querySelector('.mock-app-screen');
                if (scope) scope.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            var target = t.getAttribute('data-scroll');
            if (target) {
                closeMenu();
                var sec = document.getElementById(target);
                if (sec) setTimeout(function () { sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120);
            }
        }
        document.addEventListener('click', onClick);
        cleanupFns.push(function () { document.removeEventListener('click', onClick); });

        // Close menu/qr overlays when clicking the dimmed backdrop.
        function onBackdrop(e) {
            if (e.target === menu) closeMenu();
            if (e.target === qr) closeQr();
        }
        document.addEventListener('click', onBackdrop);
        cleanupFns.push(function () { document.removeEventListener('click', onBackdrop); });
    })();

    // =====================================================================
    // Scroll-up button visibility (scoped to the phone screen scroller)
    // =====================================================================
    (function scrollUpVisibility() {
        var scope = document.querySelector('.mock-app-screen');
        var btn = document.getElementById('btn-scroll-up');
        if (!scope || !btn) return;
        function onScroll() { btn.style.display = scope.scrollTop > 500 ? 'flex' : 'none'; }
        scope.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        cleanupFns.push(function () { scope.removeEventListener('scroll', onScroll); });
    })();

    // =====================================================================
    // Share-happiness story carousel (adapted from netflix).
    // Horizontal snap; the centered slide becomes .is-active. Re-queries its
    // own nodes each run (host swaps HTML on re-inject) and registers cleanup
    // so scroll/click listeners never stack.
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

        // Center the first slide and mark it active.
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
    // Cover "open invitation" reveal.
    // IMPORTANT: registered OUTSIDE cleanupFns intentionally. The host
    // re-executes this script when isOpened flips; if the open animation lived
    // in cleanupFns it would be torn down before it could run on the live
    // invitation (see memory: theme-intro-reexec-bug). We also react to the
    // host adding `.reveal-content` on re-injection so the cover hides even
    // when the host — not our button — triggered the open.
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

        // If host already marked it opened (re-injection after open), reflect it.
        if (screen && screen.classList.contains('reveal-content') && fab) {
            fab.style.display = 'block';
        }
    })();

})();
