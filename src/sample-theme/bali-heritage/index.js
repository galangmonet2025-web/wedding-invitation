/* =========================================================================
   BALI HERITAGE — theme JS
   Balinese palette (ivory / gold / plum-mauve) with the Meru (pura) tower,
   orchid botanicals & gold damask bands. Structure/host-wiring cloned from
   the "minang-heritage" theme (itself cloned from "timeless").

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
    if (typeof window.__baliCleanup === 'function') {
        try { window.__baliCleanup(); } catch (e) { /* noop */ }
    }
    var cleanupFns = [];
    window.__baliCleanup = function () {
        cleanupFns.forEach(function (fn) { try { fn(); } catch (e) { /* noop */ } });
        cleanupFns = [];
    };
    // =====================================================================
    // Card-style copy toast (matches the QR dialog). Reused by the Salin
    // buttons instead of the default UIkit notification. Idempotent + self
    // cleaning; survives host JS re-injection (it only touches document.body).
    // =====================================================================
    function showHeritageToast(text) {
        var host = document.querySelector('.mock-app-screen') || document.body;
        var prev = document.getElementById('heritage-copy-toast');
        if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
        var t = document.createElement('div');
        t.id = 'heritage-copy-toast';
        t.className = 'heritage-toast';
        t.innerHTML = '<span class="heritage-toast-check">'
            + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" '
            + 'stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
            + '</span><span></span>';
        t.lastChild.textContent = text;
        (host === document.body ? document.body : host).appendChild(t);
        // force reflow so the enter transition runs
        void t.offsetWidth;
        t.classList.add('is-shown');
        clearTimeout(showHeritageToast._h);
        showHeritageToast._h = setTimeout(function () {
            t.classList.remove('is-shown');
            setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 320);
        }, 1900);
    }


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
            showHeritageToast('Berhasil disalin!');
            btn.innerHTML = '<span uk-icon="check"></span> Tersalin';
            setTimeout(function () { btn.innerHTML = original; }, 2000);
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
    // Countdown — reads the REAL wedding date from the DB (#bl-wed-date).
    // Self-contained + guards against stacked intervals on re-execution.
    // =====================================================================
    (function startCountdown() {
        if (window.__blCountdownTimer) {
            clearInterval(window.__blCountdownTimer);
            window.__blCountdownTimer = null;
        }

        function resolveDay() {
            var holder = document.getElementById('wedding-calendar')
                || document.getElementById('bl-wed-date');
            var raw = holder ? (holder.getAttribute('data-wedding-date') || '').trim() : '';
            var m = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (m) return new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0);
            if (raw) { var d = new Date(raw); if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0); }
            return null;
        }

        function receptionEnd(day) {
            var holder = document.getElementById('bl-jam-resepsi');
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
                clearInterval(window.__blCountdownTimer); window.__blCountdownTimer = null;
            } else {
                setStatus('Acara kami telah selesai. Terima kasih atas doa & restunya 🙏');
                clearInterval(window.__blCountdownTimer); window.__blCountdownTimer = null;
            }
        }
        tick();
        window.__blCountdownTimer = setInterval(tick, 1000);
        cleanupFns.push(function () {
            if (window.__blCountdownTimer) { clearInterval(window.__blCountdownTimer); window.__blCountdownTimer = null; }
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
    // MUSIC ICON — SENGAJA TIDAK ADA MIRROR DI SINI. Jangan tambahkan lagi.
    //
    // Host (ThemeWrapper) yang memegang state musik dan SUDAH menulis ikon
    // sendiri saat isPlaying berubah: #play-icon/#pause-icon display + class
    // .music-playing pada #btn-toggle-music.
    //
    // Tema versi lama (warisan "timeless") memasang listener 'play'/'pause'
    // pada <audio id="bg-music"> lalu membaca `audio.paused` untuk menentukan
    // ikon. Itu SALAH dan bikin ikon seolah tidak berfungsi:
    //   - Host TIDAK memutar <audio> milik tema — host punya player sendiri,
    //     jadi `audio.paused` SELALU true.
    //   - Host tetap MENGIRIM event 'play'/'pause' ke #bg-music, sehingga
    //     handler tema ikut jalan, membaca paused===true, lalu MENIMPA ikon
    //     yang barusan di-set host kembali ke "play".
    // Hasilnya: musik benar-benar berbunyi (fungsi OK) tapi ikon nyangkut di
    // "play" (visual salah). Membiarkan host sebagai satu-satunya penulis ikon
    // menghilangkan konflik ini.
    // =====================================================================

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
    // Couple hashtag on the opening screen — built from the two nicknames,
    // e.g. "Anita" + "Olga" → "#OLGAnITAtogether"-style tag. Runs every
    // execution; safe/idempotent. Falls back to the raw "#GroomBride" text
    // already in the HTML if names are missing.
    // =====================================================================
    (function buildHashtag() {
        var el = document.getElementById('opening-hashtag');
        if (!el) return;
        var groom = (el.getAttribute('data-groom') || '').replace(/[^A-Za-z0-9]/g, '');
        var bride = (el.getAttribute('data-bride') || '').replace(/[^A-Za-z0-9]/g, '');
        if (!groom && !bride) return;
        el.textContent = '#' + groom + bride + 'together';
    })();

    // =====================================================================
    // Opening video screen + cover "open invitation" reveal.
    // IMPORTANT: registered OUTSIDE cleanupFns intentionally. The host
    // re-executes this script when isOpened flips; if the open animation lived
    // in cleanupFns it would be torn down before it could run on the live
    // invitation (see memory: theme-intro-reexec-bug). We also react to the
    // host adding `.reveal-content` on re-injection so the flow reflects the
    // opened state even when the host — not our button — triggered the open.
    // =====================================================================
    (function coverReveal() {
        var screen = document.querySelector('.mock-app-screen');
        var fab = document.getElementById('theme-fab-container');
        var btnOpen = document.getElementById('btn-open-invitation');
        var opening = document.getElementById('theme-opening');
        var openingVideo = document.getElementById('opening-video');
        var openingCard = document.getElementById('opening-card');

        // Reveal the couple text + scroll hint (called when the video is near
        // its end, on ended, or immediately if the video can't play). Idempotent.
        function revealOpeningText() {
            if (openingCard) openingCard.classList.add('is-shown');
            if (opening) opening.classList.add('opening-revealed');
        }

        // How early (seconds before the end) the text should start appearing.
        var TEXT_LEAD = 1.6;

        // Play the opening video ONCE (muted → allowed to autoplay; never plays
        // audio, so the host's music player is untouched). Text is shown as the
        // clip approaches its end. If the video is already finished (e.g. host
        // re-injected after it played), show the text right away and don't
        // restart it.
        function playOpeningVideo() {
            if (!openingVideo) { revealOpeningText(); return; }
            openingVideo.muted = true;
            try { openingVideo.playbackRate = 1.5; } catch (e) { /* noop */ }

            // Already played through → keep it on the last frame, show text.
            if (openingVideo.ended) { revealOpeningText(); return; }

            // Reveal text a little before the end.
            openingVideo.ontimeupdate = function () {
                var dur = openingVideo.duration;
                if (isFinite(dur) && dur > 0 && dur - openingVideo.currentTime <= TEXT_LEAD) {
                    revealOpeningText();
                }
            };
            openingVideo.onended = function () { revealOpeningText(); };

            var p = openingVideo.play();
            if (p && typeof p.catch === 'function') {
                // Autoplay blocked / no source → don't hide the copy, show text.
                p.catch(function () { revealOpeningText(); });
            }
            // Safety net: if the video stalls or has no valid duration, reveal
            // the text after a bounded wait so the screen never stays textless.
            setTimeout(function () {
                if (opening && !opening.classList.contains('opening-revealed')) {
                    if (!openingVideo.duration || openingVideo.readyState < 2) revealOpeningText();
                }
            }, 9000);
        }

        function reveal() {
            if (screen) screen.classList.add('reveal-content');
            if (fab) fab.style.display = 'block';
            // Pin the scroller to the top so the VIDEO (first section in the flow:
            // Cover → Video → Hero → …) is what the guest sees first.
            if (screen) screen.scrollTop = 0;
            // Start the opening video immediately on open — it is the first thing on
            // screen, plays through once at 1.5×, and the last frame + text stay put
            // once it ends.
            playOpeningVideo();
        }
        if (btnOpen) btnOpen.addEventListener('click', reveal);

        // If host already marked it opened (re-injection after open), reflect it:
        // restore the FAB and resume/complete the opening video.
        if (screen && screen.classList.contains('reveal-content')) {
            if (fab) fab.style.display = 'block';
            playOpeningVideo();
        }
    })();

})();
