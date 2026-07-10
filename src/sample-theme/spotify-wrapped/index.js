/* =========================================================================
   SPOTIFY WRAPPED — wedding theme JS
   Host contract: this script is REMOVED and RE-EXECUTED whenever its inputs
   change, so we register window.__spwrCleanup and call the previous one on
   entry — otherwise the countdown interval + listeners stack up.
   Music is owned by the HOST (InvitationPage). We never call audio.play()
   directly except the one-shot autoplay attempt on open; we only mirror state.
   ========================================================================= */

// ---- Copy to clipboard (used by gift cards) ----
window.copyToClipboard = function (elementId, btn) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ? el.value : (el.innerText || el.textContent);
    const original = btn.innerHTML;

    function ok() {
        if (typeof UIkit !== 'undefined') {
            UIkit.notification({ message: '<span uk-icon="icon: check"></span> Nomor tersalin!', status: 'success', pos: 'top-center', timeout: 1800 });
        } else {
            btn.innerHTML = '✓ Tersalin';
            setTimeout(() => { btn.innerHTML = original; }, 1800);
        }
    }
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(ok).catch(() => fallbackCopy(text, ok));
    } else {
        fallbackCopy(text, ok);
    }
};
function fallbackCopy(text, cb) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand('copy'); cb(); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
}

(function initSpotifyWrapped() {

    // ---- Cleanup previous run, then register a fresh teardown ----
    if (typeof window.__spwrCleanup === 'function') {
        try { window.__spwrCleanup(); } catch (e) { /* noop */ }
    }
    let cleanupFns = [];
    window.__spwrCleanup = function () {
        cleanupFns.forEach(function (f) { try { f(); } catch (e) { /* noop */ } });
        cleanupFns = [];
    };
    function on(target, type, handler, opts) {
        if (!target) return;
        target.addEventListener(type, handler, opts);
        cleanupFns.push(function () { target.removeEventListener(type, handler, opts); });
    }

    const phoneContainer = document.querySelector('.phone-container');
    const appScreen = document.querySelector('.mock-app-screen');

    // ---- Scroll lock until "Putar Undangan" ----
    function lockScroll() {
        if (phoneContainer) { phoneContainer.classList.add('is-locked'); phoneContainer.style.overflowY = 'hidden'; }
        document.body.style.overflow = 'hidden';
    }
    function unlockScroll() {
        if (phoneContainer) { phoneContainer.classList.remove('is-locked'); phoneContainer.style.overflowY = 'auto'; }
        document.body.style.overflow = 'auto';
    }
    lockScroll();

    function getScroller() {
        if (phoneContainer && phoneContainer.scrollHeight > phoneContainer.clientHeight + 5) return phoneContainer;
        return window;
    }
    function getScrollTop(s) {
        return s === window ? (window.scrollY || document.documentElement.scrollTop) : s.scrollTop;
    }

    // ---- 1. Scroll reveal ----
    const revealEls = document.querySelectorAll('.reveal-item');
    const observerRoot = (phoneContainer && phoneContainer.scrollHeight > phoneContainer.clientHeight + 5) ? phoneContainer : null;

    if ('IntersectionObserver' in window && revealEls.length) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(en => {
                if (en.isIntersecting) en.target.classList.add('is-visible');
                else en.target.classList.remove('is-visible');
            });
        }, { root: observerRoot, threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
        revealEls.forEach(el => io.observe(el));
        cleanupFns.push(function () { io.disconnect(); });

        const revealInView = () => {
            const vh = window.innerHeight;
            revealEls.forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.top < vh * 0.95 && r.bottom > 0) el.classList.add('is-visible');
            });
        };
        revealInView();
        window.__spwrRevealInView = revealInView;
    } else {
        revealEls.forEach(el => el.classList.add('is-visible'));
    }

    // ---- 2. Scroll progress + parallax backdrop ----
    const storyBackdrop = document.querySelector('.story-backdrop');
    const progressBar = document.getElementById('scroll-progress');
    const btnScrollUp = document.getElementById('btn-scroll-up');
    let ticking = false;

    function onScroll() {
        const scroller = getScroller();
        const scrollTop = getScrollTop(scroller);
        const vh = window.innerHeight;

        if (storyBackdrop) storyBackdrop.style.transform = `translate3d(0, ${scrollTop * 0.08}px, 0) scale(1.05)`;

        if (progressBar) {
            const sh = scroller === window
                ? document.documentElement.scrollHeight - vh
                : scroller.scrollHeight - scroller.clientHeight;
            const pct = sh > 0 ? (scrollTop / sh) * 100 : 0;
            progressBar.style.width = Math.min(100, Math.max(0, pct)) + '%';
        }
        if (btnScrollUp) btnScrollUp.style.display = scrollTop > vh * 0.6 ? 'flex' : 'none';
        ticking = false;
    }
    function requestScroll() {
        if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
    }
    on(window, 'scroll', requestScroll, { passive: true });
    if (phoneContainer) on(phoneContainer, 'scroll', requestScroll, { passive: true });
    onScroll();

    // ---- Scroll to top ----
    if (btnScrollUp) {
        on(btnScrollUp, 'click', function () {
            const s = getScroller();
            (s === window ? window : s).scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ---- Hero chevron → scroll to the FIRST content section after the hero ----
    const firstContent = document.getElementById('countdown')
        || document.getElementById('couples')
        || document.getElementById('schedule');
    document.querySelectorAll('[data-scroll-next]').forEach(function (btn) {
        on(btn, 'click', function () {
            if (!firstContent) return;
            const s = getScroller();
            if (s === window) firstContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
            else s.scrollTo({ top: firstContent.offsetTop - s.offsetTop, behavior: 'smooth' });
        });
    });

    // ---- Outro card → replay from top ----
    document.querySelectorAll('[data-scroll-top]').forEach(function (el) {
        function goTop() {
            const s = getScroller();
            (s === window ? window : s).scrollTo({ top: 0, behavior: 'smooth' });
        }
        on(el, 'click', goTop);
        on(el, 'keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTop(); } });
    });

    // ---- Player-bar PREV / NEXT → navigate section by section ----
    const SECTION_IDS = ['hero-next', 'couples', 'schedule', 'streaming', 'story', 'rsvp', 'gallery', 'happiness', 'wishes', 'gift'];
    const sections = SECTION_IDS.map(id => document.getElementById(id)).filter(Boolean);

    function scrollToSection(el) {
        if (!el) return;
        const s = getScroller();
        if (s === window) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else s.scrollTo({ top: el.offsetTop - s.offsetTop, behavior: 'smooth' });
    }
    // Index of the section closest to the top of the viewport right now.
    function currentSectionIndex() {
        let best = 0, bestDist = Infinity;
        sections.forEach((el, i) => {
            const d = Math.abs(el.getBoundingClientRect().top);
            if (d < bestDist) { bestDist = d; best = i; }
        });
        return best;
    }
    const pbPrev = document.getElementById('pb-prev');
    const pbNext = document.getElementById('pb-next');
    if (pbPrev) on(pbPrev, 'click', function () {
        const i = currentSectionIndex();
        scrollToSection(sections[Math.max(0, i - 1)]);
    });
    if (pbNext) on(pbNext, 'click', function () {
        const i = currentSectionIndex();
        scrollToSection(sections[Math.min(sections.length - 1, i + 1)]);
    });

    // ---- Story carousel ("Berbagi Kebahagiaan") — dot sync + click nav ----
    const storyCarousel = document.getElementById('story-carousel');
    if (storyCarousel) {
        const slides = Array.from(storyCarousel.querySelectorAll('.story-slide'));
        const dots = Array.from(document.querySelectorAll('#story-dots .story-dot-nav'));

        function activeIdx() {
            const mid = storyCarousel.scrollLeft + storyCarousel.clientWidth / 2;
            let best = 0, bestDist = Infinity;
            slides.forEach((s, i) => {
                const c = s.offsetLeft + s.offsetWidth / 2;
                const d = Math.abs(c - mid);
                if (d < bestDist) { bestDist = d; best = i; }
            });
            return best;
        }
        function syncDots() {
            const idx = activeIdx();
            dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
        }
        let sRaf = false;
        on(storyCarousel, 'scroll', function () {
            if (!sRaf) { window.requestAnimationFrame(() => { syncDots(); sRaf = false; }); sRaf = true; }
        }, { passive: true });
        dots.forEach((dot, i) => on(dot, 'click', function () {
            const s = slides[i];
            if (s) storyCarousel.scrollTo({ left: s.offsetLeft - (storyCarousel.clientWidth - s.offsetWidth) / 2, behavior: 'smooth' });
        }));
        syncDots();
    }

    // ---- 3. Ambient particles ----
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const count = window.innerWidth < 960 ? 12 : 18;
        const rightEdge = window.innerWidth >= 960 ? 480 : window.innerWidth;
        const spawned = [];
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'floating-particle';
            const size = 2 + Math.random() * 4;
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.left = (Math.random() * rightEdge) + 'px';
            p.style.setProperty('--drift', (Math.random() * 80 - 40) + 'px');
            p.style.animationDuration = (11 + Math.random() * 12) + 's';
            p.style.animationDelay = (Math.random() * 12) + 's';
            document.body.appendChild(p);
            spawned.push(p);
        }
        cleanupFns.push(function () { spawned.forEach(p => p.remove()); });
    }

    // ---- 4. Countdown (+ Now-Playing scrubber) with H-day / finished states ----
    // Backend returns wedding_date as "YYYY-MM-DD" (Utilities.formatDate). We
    // count down to it; on the wedding day we check the reception time window:
    //   before end time  → "Acara sedang berlangsung"
    //   after end time    → "Acara sudah selesai, terima kasih…"
    const cal = document.getElementById('wedding-calendar');
    const rawDate = cal ? (cal.getAttribute('data-wedding-date') || '').trim() : '';

    let weddingDay = null; // midnight of the wedding day (local)
    const isoM = rawDate.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoM) weddingDay = new Date(Number(isoM[1]), Number(isoM[2]) - 1, Number(isoM[3]), 0, 0, 0);
    else if (rawDate) { const d = new Date(rawDate); if (!isNaN(d.getTime())) weddingDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0); }

    // Parse the reception END time from "HH:MM - HH:MM" (fallback: end of day).
    function receptionEnd(day) {
        const holder = document.getElementById('ws-jam-resepsi');
        const txt = holder ? (holder.textContent || '') : '';
        const times = txt.match(/(\d{1,2}):(\d{2})/g) || [];
        let endH = 23, endM = 59;
        if (times.length >= 2) { const p = times[times.length - 1].split(':'); endH = +p[0]; endM = +p[1]; }
        else if (times.length === 1) { const p = times[0].split(':'); endH = +p[0] + 3; endM = +p[1]; } // assume ~3h
        const end = new Date(day.getTime());
        end.setHours(Math.min(23, endH), endM, 0, 0);
        return end;
    }

    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    const barFill = document.getElementById('np-bar-fill');
    const elapsedEl = document.getElementById('np-elapsed');
    const kickerEl = document.getElementById('ws-kicker');
    const footEl = document.getElementById('ws-foot');
    const countWrap = document.getElementById('countdown-wrap');
    const statusEl = document.getElementById('ws-status');
    const statusEmoji = document.getElementById('ws-status-emoji');
    const statusText = document.getElementById('ws-status-text');

    function showNumbers() {
        if (countWrap) countWrap.style.display = '';
        if (footEl) footEl.style.display = '';
        if (statusEl) statusEl.style.display = 'none';
    }
    function showStatus(emoji, text, kicker) {
        if (countWrap) countWrap.style.display = 'none';
        if (footEl) footEl.style.display = 'none';
        if (statusEl) statusEl.style.display = 'block';
        if (statusEmoji) statusEmoji.textContent = emoji;
        if (statusText) statusText.innerHTML = text;
        if (kickerEl && kicker != null) kickerEl.textContent = kicker;
    }

    if (weddingDay && !isNaN(weddingDay.getTime())) {
        const recEnd = receptionEnd(weddingDay);
        const startRef = Date.now();
        const totalSpan = Math.max(1, weddingDay.getTime() - startRef);

        function tick() {
            const now = Date.now();
            const dist = weddingDay.getTime() - now;

            if (dist > 0) {
                // Upcoming — show the live countdown.
                showNumbers();
                const d = Math.floor(dist / 864e5);
                const h = Math.floor((dist % 864e5) / 36e5);
                const m = Math.floor((dist % 36e5) / 6e4);
                const s = Math.floor((dist % 6e4) / 1000);
                if (daysEl) daysEl.textContent = String(d).padStart(2, '0');
                if (hoursEl) hoursEl.textContent = String(h).padStart(2, '0');
                if (minutesEl) minutesEl.textContent = String(m).padStart(2, '0');
                if (secondsEl) secondsEl.textContent = String(s).padStart(2, '0');

                // The Now-Playing scrubber (#np-bar-fill/#np-elapsed) is driven by
                // real YouTube playback when a valid backsound YouTube link exists
                // (see module 8). Only fall back to the countdown-proxy bar when
                // YouTube is NOT steering it, so the two never fight over the DOM.
                if (!window.__spwrYtDrivesScrubber) {
                    const done = Math.min(1, Math.max(0, (now - startRef) / totalSpan));
                    if (barFill) barFill.style.width = (done * 100).toFixed(2) + '%';
                    if (elapsedEl) {
                        const mins = Math.floor(done * 233);
                        elapsedEl.textContent = Math.floor(mins / 60) + ':' + String(mins % 60).padStart(2, '0');
                    }
                }
            } else if (now <= recEnd.getTime()) {
                // Wedding day, still within (or before end of) the reception.
                if (barFill && !window.__spwrYtDrivesScrubber) barFill.style.width = '100%';
                showStatus('💚', 'Hari yang kami nantikan telah tiba.<br>Acara sedang berlangsung 🎶', 'Hari bahagia kami');
            } else {
                // After the reception has ended.
                if (barFill && !window.__spwrYtDrivesScrubber) barFill.style.width = '100%';
                showStatus('🙏', 'Acara kami sudah selesai.<br>Terima kasih atas support &amp; doa terbaiknya 💚', 'Sudah menikah');
                clearInterval(countInterval);
            }
        }
        tick();
        var countInterval = setInterval(tick, 1000);
        cleanupFns.push(function () { clearInterval(countInterval); });
    }

    // ---- 5. Wedding-date calendar ----
    const calEl = document.getElementById('wedding-calendar');
    if (calEl && !calEl.dataset.rendered && weddingDay && !isNaN(weddingDay.getTime())) {
        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        const year = weddingDay.getFullYear(), month = weddingDay.getMonth(), wDayNum = weddingDay.getDate();
        const firstDow = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let html = '<div class="cal-title">' + monthNames[month] + ' ' + year + '</div>';
        html += '<div class="cal-grid cal-head">';
        dayNames.forEach(d => html += '<span class="cal-dow">' + d + '</span>');
        html += '</div><div class="cal-grid cal-body">';
        for (let i = 0; i < firstDow; i++) html += '<span class="cal-cell cal-empty"></span>';
        for (let d = 1; d <= daysInMonth; d++) {
            const isW = d === wDayNum;
            html += '<span class="cal-cell' + (isW ? ' cal-active' : '') + '">'
                + (isW ? '<span class="cal-heart"></span>' : '')
                + '<span class="cal-num">' + d + '</span></span>';
        }
        html += '</div>';
        calEl.innerHTML = html;
        calEl.dataset.rendered = 'true';
    }

    // ---- 6. Music UI mirror (host owns real playback) ----
    const btnMusic = document.getElementById('btn-toggle-music');
    const bgMusic = document.getElementById('bg-music');

    // ---- Player-bar "alive" indicator (play-button halo + equalizer freeze) ----
    // A single `.is-playing` class on #theme-fab-container drives the animated
    // bits via CSS (page equalizers, play-button pulse). Both playback sources
    // (local <audio> and the YouTube iframe) funnel their state through this.
    const fabContainer = document.getElementById('theme-fab-container');
    function setPlayerBarPlaying(playing) {
        if (fabContainer) fabContainer.classList.toggle('is-playing', !!playing);
        // Freeze EVERY equalizer on the page (hero cover, sidebar, outro) when
        // music is paused. A body-level class lets CSS reach equalizers that live
        // far from the player bar in the DOM.
        document.body.classList.toggle('spwr-music-paused', !playing);
        // Keep the player-bar video clip in lockstep with the music (it's a
        // separate muted iframe, so it won't pause on its own).
        if (typeof window.__spwrSyncPbVideo === 'function') window.__spwrSyncPbVideo(!!playing);
    }
    // The pause class lives on <body> (outside the theme container), so drop it
    // explicitly on teardown to avoid a stale frozen state after a re-exec.
    cleanupFns.push(function () { document.body.classList.remove('spwr-music-paused'); });

    function updateMusicUI() {
        const playIcon = document.getElementById('play-icon');
        const pauseIcon = document.getElementById('pause-icon');
        if (!bgMusic) return;
        const playing = !bgMusic.paused;
        if (btnMusic) btnMusic.classList.toggle('music-playing', playing);
        if (playIcon) playIcon.style.display = playing ? 'block' : 'none';
        if (pauseIcon) pauseIcon.style.display = playing ? 'none' : 'block';
        // When the local <audio> is the source, mirror its state. (The YouTube
        // path in module 8 calls this helper itself.)
        if (!window.__spwrYtDrivesScrubber) {
            setPlayerBarPlaying(playing);
        }
    }
    if (bgMusic) {
        on(bgMusic, 'play', updateMusicUI);
        on(bgMusic, 'pause', updateMusicUI);
        on(bgMusic, 'playing', updateMusicUI);
        // Sinkronkan ikon dengan state lagu yang sebenarnya sejak awal.
        updateMusicUI();
    }
    if (btnMusic && bgMusic) {
        on(btnMusic, 'click', function () {
            if (bgMusic.paused) bgMusic.play().catch(() => { });
            else bgMusic.pause();
        });
    }

    // ---- 8. Now-Playing YouTube scrubber (real duration + progress) ----
    // If the tenant's backsound is a VALID YouTube link, the host renders a hidden
    // <iframe title="YouTube Background Music"> (enablejsapi=1) INSIDE this same
    // wrapper (ThemeWrapper renders it as a child of the theme container). We can't
    // reach the host's React refs, but we CAN talk to that iframe directly with the
    // YouTube IFrame API postMessage protocol:
    //   • send {"event":"listening"} + getDuration/getCurrentTime commands
    //   • the iframe posts back {"event":"infoDelivery", info:{ currentTime, duration,
    //     playerState }} which we use to drive #np-bar-fill / #np-elapsed / #np-total.
    // The host owns real playback; we ONLY read state here (never play/seek), so the
    // theme still honours the "theme can't drive audio" contract.
    (function initYtScrubber() {
        // Reset per run: the host re-executes this script on input changes, and the
        // tenant may have switched away from a YouTube backsound. Re-decide below.
        window.__spwrYtDrivesScrubber = false;

        function findYtIframe() {
            return document.querySelector('iframe[title="YouTube Background Music"]');
        }

        // No YouTube backsound → leave the countdown-proxy scrubber alone.
        let iframe = findYtIframe();
        if (!iframe) {
            // The host mounts the iframe only after "opened"; watch for it briefly.
            const mo = new MutationObserver(function () {
                const f = findYtIframe();
                if (f) { mo.disconnect(); startYt(f); }
            });
            mo.observe(document.body, { childList: true, subtree: true });
            cleanupFns.push(function () { mo.disconnect(); });
            // Safety: stop watching after 20s if a YouTube iframe never appears.
            const moStop = setTimeout(function () { mo.disconnect(); }, 20000);
            cleanupFns.push(function () { clearTimeout(moStop); });
            return;
        }
        startYt(iframe);

        function fmt(sec) {
            sec = Math.max(0, Math.floor(sec || 0));
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            return m + ':' + String(s).padStart(2, '0');
        }

        function startYt(frame) {
            iframe = frame;
            window.__spwrYtDrivesScrubber = true;

            // Mark that we have real track info so the player-bar strip may show
            // (CSS gates the reveal on this + .is-playing). Only for YouTube.
            const fab = document.getElementById('theme-fab-container');
            if (fab) fab.classList.add('pb-has-info');
            cleanupFns.push(function () { if (fab) fab.classList.remove('pb-has-info'); });

            const barFillEl = document.getElementById('np-bar-fill');
            const elapsedElY = document.getElementById('np-elapsed');
            const totalEl = document.getElementById('np-total');       // hero marquee viewport
            const playIcon = document.getElementById('play-icon');
            const pauseIcon = document.getElementById('pause-icon');
            const btnMusicY = document.getElementById('btn-toggle-music');
            // Floating player-bar info strip (mirrors the hero scrubber).
            const pbFillEl = document.getElementById('pb-np-fill');
            const pbKnobEl = document.getElementById('pb-np-knob');
            const pbTimeEl = document.getElementById('pb-np-time');
            const pbTitleEl = document.getElementById('pb-np-title');   // player-bar marquee
            const pbChannelEl = document.getElementById('pb-np-channel');
            // Closing-section music-source credit (YouTube title + channel).
            const creditBox = document.getElementById('music-credit');
            const creditTitleEl = document.getElementById('music-credit-title');
            const creditChannelEl = document.getElementById('music-credit-channel');
            // Reveal the credit box now that we know the backsound is YouTube.
            if (creditBox) {
                creditBox.hidden = false;
                cleanupFns.push(function () { creditBox.hidden = true; });
            }

            // Every `.np-marquee` element that should scroll its title: hero
            // (#np-total), player-bar strip (#pb-np-title), and closing credit.
            const marquees = [totalEl, pbTitleEl, creditTitleEl].filter(Boolean);

            let duration = 0;
            let current = 0;
            let playing = false;
            let title = '';
            let titleShown = '';   // last title written, to avoid redundant re-measure
            let channel = '';
            let channelShown = '';

            // Write the YouTube channel name into the player-bar strip + closing
            // credit (both optional). Called from render() once we learn it.
            function setChannel(name) {
                if (!name || name === channelShown) return;
                channelShown = name;
                if (pbChannelEl) pbChannelEl.textContent = name;
                if (creditChannelEl) creditChannelEl.textContent = name;
            }

            // Measure ONE title vs its viewport and turn the marquee on/off. If it
            // overflows, scroll the inner track exactly the overflow distance, with
            // a duration proportional to it so long titles aren't frantic.
            function measureOne(el) {
                const inner = el.querySelector('.np-marquee-inner');
                if (!inner) return;
                el.classList.remove('is-marquee');
                el.style.removeProperty('--np-scroll');
                el.style.removeProperty('--np-scroll-dur');
                const overflow = inner.scrollWidth - el.clientWidth;
                if (overflow > 6) {
                    el.style.setProperty('--np-scroll', (-overflow) + 'px');
                    const dur = Math.min(18, Math.max(6, overflow * 0.055));
                    el.style.setProperty('--np-scroll-dur', dur.toFixed(1) + 's');
                    el.classList.add('is-marquee');
                }
            }
            function measureMarquee() { marquees.forEach(measureOne); }
            // Write the track title into EVERY marquee slot, then (re)measure.
            function setTitle(text) {
                if (!text || text === titleShown) return;
                titleShown = text;
                marquees.forEach(function (el) {
                    const inner = el.querySelector('.np-marquee-inner');
                    if (inner) inner.textContent = text;
                });
                requestAnimationFrame(measureMarquee);
            }
            // Re-evaluate on viewport width changes (rotation, desktop↔mobile).
            let rzT;
            on(window, 'resize', function () {
                clearTimeout(rzT);
                rzT = setTimeout(measureMarquee, 200);
            });
            cleanupFns.push(function () { clearTimeout(rzT); });

            function post(func) {
                try {
                    iframe.contentWindow.postMessage(
                        JSON.stringify({ event: 'command', func: func, args: [] }), '*');
                } catch (e) { /* noop */ }
            }
            // Register as a listener so the player pushes infoDelivery updates.
            function subscribe() {
                try {
                    iframe.contentWindow.postMessage(
                        JSON.stringify({ event: 'listening', id: 'spwr-np' }), '*');
                } catch (e) { /* noop */ }
            }

            function render() {
                if (duration > 0) {
                    const pct = Math.min(100, Math.max(0, (current / duration) * 100));
                    if (barFillEl) barFillEl.style.width = pct.toFixed(2) + '%';
                    if (pbFillEl) pbFillEl.style.width = pct.toFixed(2) + '%';
                    if (pbKnobEl) pbKnobEl.style.left = pct.toFixed(2) + '%';
                    // Time REMAINING, counts down as "-M:SS" toward 0 (both places).
                    const remainTxt = '-' + fmt(Math.max(0, duration - current));
                    if (elapsedElY) elapsedElY.textContent = remainTxt;   // hero LEFT
                    if (pbTimeEl) pbTimeEl.textContent = remainTxt;       // player bar
                } else {
                    // No duration yet — show elapsed so it isn't stuck blank.
                    if (elapsedElY) elapsedElY.textContent = fmt(current);
                    if (pbTimeEl) pbTimeEl.textContent = fmt(current);
                }
                // The music TITLE (set once we learn it from YouTube; falls back to
                // the wedding date the template rendered until then). setTitle()
                // fills every marquee (hero #np-total + player-bar #pb-np-title) and
                // turns on the scrolling marquee where the title overflows.
                if (title) setTitle(title);
                if (channel) setChannel(channel);
            }

            function reflectPlayState() {
                if (btnMusicY) btnMusicY.classList.toggle('music-playing', playing);
                if (playIcon) playIcon.style.display = playing ? 'none' : 'block';
                if (pauseIcon) pauseIcon.style.display = playing ? 'block' : 'none';
                // Drive the player-bar equalizer / pulse / label from real YT state.
                setPlayerBarPlaying(playing);
            }

            function onMessage(e) {
                // YT posts from youtube.com / youtube-nocookie.com origins.
                if (typeof e.data !== 'string') return;
                if (e.origin.indexOf('youtube') === -1) return;
                let msg;
                try { msg = JSON.parse(e.data); } catch (_) { return; }
                if (!msg || msg.event !== 'infoDelivery' || !msg.info) return;
                const info = msg.info;
                if (typeof info.duration === 'number' && info.duration > 0) duration = info.duration;
                if (typeof info.currentTime === 'number') current = info.currentTime;
                // YouTube pushes the track's title + channel inside videoData.
                if (info.videoData && info.videoData.title) title = info.videoData.title;
                if (info.videoData && info.videoData.author) channel = info.videoData.author;
                if (typeof info.playerState === 'number') {
                    // 1 = playing, others (0 ended / 2 paused / 3 buffering) = not playing.
                    playing = info.playerState === 1;
                    reflectPlayState();
                }
                render();
            }
            on(window, 'message', onMessage);

            // The iframe may not be ready the instant it mounts; subscribe a few
            // times and then poll current time/duration so the bar advances even if
            // infoDelivery pushes are sparse.
            subscribe();
            const kick = [200, 600, 1200, 2500].map(function (d) {
                return setTimeout(subscribe, d);
            });
            kick.forEach(function (t) { cleanupFns.push(function () { clearTimeout(t); }); });

            const poll = setInterval(function () {
                subscribe();          // keeps the listener alive across YT re-inits
                post('getDuration');
                post('getCurrentTime');
                // Advance the clock optimistically between pushes when playing, so
                // the seconds tick smoothly at 1s cadence.
                if (playing && duration > 0) {
                    current = Math.min(duration, current + 1);
                    render();
                }
            }, 1000);
            cleanupFns.push(function () { clearInterval(poll); });

            // The host auto-plays YouTube on open (see nudgeYouTubeMusic), so start
            // the bar in the "playing" look right away; the first real playerState
            // push from YT will correct it if it's actually paused.
            playing = true;
            reflectPlayState();
            render();

            // Drop the same YouTube clip into the player bar as a MUTED, looping
            // visual background (audio still comes from the host's own player).
            mountPlayerBarVideo(frame);
        }

        // ---- Player-bar YouTube clip background ----
        function extractVideoId(src) {
            if (!src) return '';
            const m = src.match(/\/embed\/([^?&/]+)/);
            return m ? m[1] : '';
        }
        // The background clip is a SEPARATE (muted) iframe, so it doesn't follow the
        // host's pause on its own. We keep a handle to it and mirror the music's
        // play/pause via the YT postMessage API (needs enablejsapi=1 below).
        function pbVideoCmd(func) {
            const bgFrame = window.__spwrPbVideo;
            if (!bgFrame || !bgFrame.contentWindow) return;
            try {
                bgFrame.contentWindow.postMessage(
                    JSON.stringify({ event: 'command', func: func, args: [] }), '*');
            } catch (e) { /* noop */ }
        }
        // Called from setPlayerBarPlaying so the clip pauses/resumes WITH the music.
        window.__spwrSyncPbVideo = function (playing) {
            pbVideoCmd(playing ? 'playVideo' : 'pauseVideo');
        };
        function mountPlayerBarVideo(frame) {
            const holder = document.getElementById('pb-video');
            const bar = holder ? holder.closest('.spwr-playerbar') : null;
            if (!holder || !bar) return;
            const vid = extractVideoId(frame.getAttribute('src') || '');
            if (!vid) return;
            // Already mounted for this video? Don't rebuild.
            if (holder.dataset.vid === vid) { holder.classList.add('is-ready'); return; }
            holder.dataset.vid = vid;
            holder.innerHTML = '';
            const bgFrame = document.createElement('iframe');
            // Muted + autoplay + loop → decorative visual only; controls & focus
            // disabled so it never steals interaction from the buttons on top.
            // enablejsapi=1 lets us pause/resume it in lockstep with the music.
            bgFrame.src = 'https://www.youtube.com/embed/' + vid +
                '?autoplay=1&mute=1&controls=0&loop=1&playlist=' + vid +
                '&enablejsapi=1&modestbranding=1&playsinline=1&disablekb=1&fs=0&rel=0&iv_load_policy=3';
            bgFrame.setAttribute('title', 'Music clip background');
            bgFrame.setAttribute('frameborder', '0');
            bgFrame.setAttribute('tabindex', '-1');
            bgFrame.setAttribute('aria-hidden', 'true');
            bgFrame.allow = 'autoplay; encrypted-media';
            holder.appendChild(bgFrame);
            window.__spwrPbVideo = bgFrame;
            bar.classList.add('pb-has-video');
            // Fade in once the frame has had a moment to start rendering.
            const rdy = setTimeout(function () { holder.classList.add('is-ready'); }, 400);
            // Apply the current play/pause state as soon as the clip is live, so a
            // clip mounted while the music is already paused starts paused too.
            const syncAtStart = setTimeout(function () {
                window.__spwrSyncPbVideo(!document.body.classList.contains('spwr-music-paused'));
            }, 900);
            cleanupFns.push(function () {
                clearTimeout(rdy);
                clearTimeout(syncAtStart);
                // Tear the clip down on re-exec so a stale iframe doesn't linger.
                holder.innerHTML = '';
                holder.removeAttribute('data-vid');
                holder.classList.remove('is-ready');
                bar.classList.remove('pb-has-video');
                window.__spwrPbVideo = null;
            });
        }
    })();

    // ---- Direct YouTube autoplay nudge (desktop autoplay-policy workaround) ----
    // On the invitation the host flips isOpened/isPlaying, then a React effect
    // mounts the YouTube <iframe autoplay=1> / calls .play() — but that runs
    // DETACHED from the open click's user-gesture stack, so DESKTOP Chrome blocks
    // it (mobile is lenient once the page was tapped). We can't reach the host's
    // refs, but the iframe uses enablejsapi=1, so we post `playVideo` straight to
    // it on a short retry ramp starting from the real click. Harmless when the
    // backsound is a plain audio file (no such iframe exists → nudges are no-ops).
    function nudgeYouTubeMusic() {
        function play() {
            const frame = document.querySelector('iframe[title="YouTube Background Music"], iframe[src*="youtube.com/embed"]');
            if (!frame || !frame.contentWindow) return false;
            try {
                frame.contentWindow.postMessage(
                    JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
                return true;
            } catch (e) { return false; }
        }
        play();
        // The iframe may mount a beat after the click; retry on a ramp.
        [150, 400, 800, 1500, 2500].forEach(function (d) {
            const t = setTimeout(play, d);
            cleanupFns.push(function () { clearTimeout(t); });
        });
    }

    // ---- 7. Open invitation (Wrapped intro) ----
    const btnOpen = document.getElementById('btn-open-invitation');
    const floatingUI = document.getElementById('theme-fab-container');
    const intro = document.getElementById('spwr-intro');

    // Playful ascending "sparkle" chime with WebAudio — fires from the click.
    function playSparkle() {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            const ctx = new AC();
            if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
            const t0 = ctx.currentTime;
            const notes = [523.25, 659.25, 783.99, 1046.5]; // C-E-G-C
            notes.forEach((f, i) => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = f;
                const at = t0 + i * 0.12;
                g.gain.setValueAtTime(0.0001, at);
                g.gain.exponentialRampToValueAtTime(0.3, at + 0.02);
                g.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
                osc.connect(g).connect(ctx.destination);
                osc.start(at); osc.stop(at + 0.55);
            });
        } catch (e) { /* noop */ }
    }

    function revealInvitation() {
        unlockScroll();
        if (appScreen) appScreen.classList.add('reveal-content');
        setTimeout(() => { onScroll(); if (window.__spwrRevealInView) window.__spwrRevealInView(); }, 800);
        if (floatingUI) floatingUI.style.display = 'block';
        if (bgMusic) {
            bgMusic.play().catch(() => { /* host will handle autoplay activation */ });
            updateMusicUI();
        }
        // Kick the host's hidden YouTube player directly (desktop autoplay fix).
        nudgeYouTubeMusic();
    }

    const INTRO_HOLD_MS = 2600;   // reveal behind the intro
    const INTRO_FADE_MS = 2900;   // begin fade
    const INTRO_DONE_MS = 3700;   // clear overlay

    function finishIntro() {
        if (!intro) return;
        intro.classList.remove('is-playing', 'is-ending');
        intro.style.display = 'none';
    }

    // Run the intro sequence. IMPORTANT: the host re-executes this whole script
    // when it flips `isOpened` (which happens on the very click that starts the
    // intro). So the timers must NOT live in cleanupFns (that would kill them on
    // re-exec, freezing the overlay). We stash the "intro started" flag on window
    // so a re-execution mid-intro just resumes instead of restarting.
    function runIntro() {
        if (window.__spwrIntroStarted) {
            // A re-exec landed mid-intro: adopt the in-flight overlay, don't restart.
            // If timers were somehow lost, fall back to finishing it promptly so
            // the invitation can never get stuck behind a frozen overlay.
            if (intro && intro.classList.contains('is-playing') && !window.__spwrIntroTimersLive) {
                revealInvitation();
                intro.classList.add('is-ending');
                setTimeout(finishIntro, 700);
            }
            return;
        }
        window.__spwrIntroStarted = true;
        window.__spwrIntroTimersLive = true;

        if (!intro) { revealInvitation(); return; }
        intro.classList.add('is-playing');
        playSparkle();
        // Plain setTimeout (NOT registered in cleanupFns) so re-exec can't clear them.
        setTimeout(revealInvitation, INTRO_HOLD_MS);
        setTimeout(function () { if (intro) intro.classList.add('is-ending'); }, INTRO_FADE_MS);
        setTimeout(function () { finishIntro(); window.__spwrIntroTimersLive = false; }, INTRO_DONE_MS);
    }

    if (btnOpen) {
        on(btnOpen, 'click', function () {
            btnOpen.disabled = true;
            // Fire the YouTube autoplay nudge from INSIDE the real click gesture,
            // BEFORE the intro's 2.6s hold — desktop needs the play() request to
            // originate on the user gesture, not from a later timer.
            nudgeYouTubeMusic();
            runIntro();
        });
    }

    // If the host already flipped to "opened" (e.g. this is the re-execution that
    // fires from the open click), kick the intro even though our click handler
    // didn't run in THIS execution.
    const rootOpened = document.querySelector('.theme-wrapper.is-opened, .is-opened');
    if (rootOpened && !window.__spwrIntroStarted) {
        runIntro();
    }

})();
