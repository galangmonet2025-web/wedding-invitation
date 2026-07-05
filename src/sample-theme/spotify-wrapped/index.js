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

                const done = Math.min(1, Math.max(0, (now - startRef) / totalSpan));
                if (barFill) barFill.style.width = (done * 100).toFixed(2) + '%';
                if (elapsedEl) {
                    const mins = Math.floor(done * 233);
                    elapsedEl.textContent = Math.floor(mins / 60) + ':' + String(mins % 60).padStart(2, '0');
                }
            } else if (now <= recEnd.getTime()) {
                // Wedding day, still within (or before end of) the reception.
                if (barFill) barFill.style.width = '100%';
                showStatus('💚', 'Hari yang kami nantikan telah tiba.<br>Acara sedang berlangsung 🎶', 'Hari bahagia kami');
            } else {
                // After the reception has ended.
                if (barFill) barFill.style.width = '100%';
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

    function updateMusicUI() {
        const playIcon = document.getElementById('play-icon');
        const pauseIcon = document.getElementById('pause-icon');
        if (!bgMusic) return;
        const playing = !bgMusic.paused;
        if (btnMusic) btnMusic.classList.toggle('music-playing', playing);
        if (playIcon) playIcon.style.display = playing ? 'block' : 'none';
        if (pauseIcon) pauseIcon.style.display = playing ? 'none' : 'block';
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
