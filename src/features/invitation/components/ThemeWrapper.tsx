import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface ThemeWrapperProps {
    htmlBase: string;
    cssBase?: string;
    jsBase?: string;
    isOpened: boolean;
    isPlaying: boolean;
    setIsOpened: (val: boolean) => void;
    setIsPlaying: (val: boolean) => void;
    onShowQR: () => void;
    onShowMenu: () => void;
    onSubmitRSVP: (data: { status: string; guests: number; code: string }) => Promise<{ success: boolean; message: string; calendarUrl?: string }>;
    onSubmitWish: (data: { name: string; message: string }) => Promise<{ success: boolean; message: string }>;
    onSubmitGift?: (data: { name: string; amount: number; bank: string }) => Promise<{ success: boolean; message: string }>;
    onOpenLightbox: (index: number, images: string[]) => void;
    weddingDate?: string;
    flagUseSystemActionButton?: boolean;
    children?: React.ReactNode;
}

export function ThemeWrapper({
    htmlBase,
    cssBase,
    jsBase,
    isOpened,
    isPlaying,
    setIsOpened,
    setIsPlaying,
    onShowQR,
    onShowMenu,
    onSubmitRSVP,
    onSubmitWish,
    onSubmitGift,
    onOpenLightbox,
    weddingDate,
    flagUseSystemActionButton = true,
    children
}: ThemeWrapperProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [showScrollUp, setShowScrollUp] = useState(false);

    // Remember the last scroll position of whatever element actually scrolls
    // (the phone container on desktop, the window on mobile). When htmlBase
    // changes (e.g. after submitting RSVP/wish, the template re-renders to show
    // the thank-you state), React re-injects the theme DOM and the scroll
    // resets to top — which feels like a full page refresh. We capture the
    // position on scroll and restore it right after the DOM is replaced.
    const lastScroll = useRef<{ el: HTMLElement | Window; top: number }>({ el: window, top: 0 });

    useEffect(() => {
        const handleScroll = (e: any) => {
            const tgt = e.target;
            const scrollTop = (tgt && typeof tgt.scrollTop === 'number' ? tgt.scrollTop : 0)
                || window.scrollY || document.documentElement.scrollTop;
            setShowScrollUp(scrollTop > 200);

            // Track the active scroller + position for restoration
            if (tgt instanceof HTMLElement && tgt.scrollTop > 0) {
                lastScroll.current = { el: tgt, top: tgt.scrollTop };
            } else {
                lastScroll.current = { el: window, top: window.scrollY || document.documentElement.scrollTop };
            }
        };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, []);

    // Restore scroll position synchronously after the theme DOM is re-injected
    // due to an htmlBase change, so submitting a form doesn't jump to the top.
    useLayoutEffect(() => {
        const { el, top } = lastScroll.current;
        if (!top) return;
        // restore on the next frame too, in case layout settles late
        const restore = () => {
            try {
                if (el === window) window.scrollTo(0, top);
                else (el as HTMLElement).scrollTop = top;
            } catch { /* ignore */ }
        };
        restore();
        const raf = requestAnimationFrame(restore);
        return () => cancelAnimationFrame(raf);
    }, [htmlBase]);

    // Sync open/envelope state when isOpened is true OR htmlBase changes (re-renders fresh HTML)
    useEffect(() => {
        if (!isOpened) return;

        const container = containerRef.current;
        if (!container) return;

        // 1. Instantly reveal the mock app screen content if open
        const appScreen = container.querySelector('.mock-app-screen');
        if (appScreen && !appScreen.classList.contains('reveal-content')) {
            appScreen.classList.add('reveal-content');
        }

        // 2. Make sure document body / phone container allows scrolling
        document.body.style.overflow = 'auto';
        const phoneContainer = container.closest('.phone-container') as HTMLElement;
        if (phoneContainer) {
            phoneContainer.style.overflowY = 'auto';
        }

        // 3. Make sure floating UI/FAB container is visible
        const floatingUI = container.querySelector('#theme-fab-container') || container.querySelector('#floating-ui') as HTMLElement;
        if (floatingUI) {
            (floatingUI as HTMLElement).style.display = 'block';
        }

        // 4. Force update UIkit just in case
        if ((window as any).UIkit) {
            try {
                (window as any).UIkit.update(container, 'update');
            } catch (err) { }
        }
    }, [isOpened, htmlBase]);

    useEffect(() => {
        const loadScript = (id: string, src: string) => {
            // Guard clause to prevent reloading libraries that are already initialized in memory.
            // Overwriting window.UIkit causes registered components and plugins (like icons) to be lost.
            if (id === 'uikit-js' && (window as any).UIkit) return;
            if (id === 'uikit-icons' && (window as any).UIkit && (window as any).UIkit.icon) return;
            if (id === 'bootstrap-js' && (window as any).bootstrap) return;

            if (!document.getElementById(id)) {
                const script = document.createElement('script');
                script.id = id;
                script.src = src;
                script.async = true;
                document.body.appendChild(script);
            }
        };
        const loadCSS = (id: string, href: string) => {
            if (!document.getElementById(id)) {
                const link = document.createElement('link');
                link.id = id;
                link.rel = 'stylesheet';
                link.href = href;
                document.head.appendChild(link);
            }
        };

        // Load CSS Frameworks (Locked Versions)
        loadCSS('uikit-css', 'https://cdn.jsdelivr.net/npm/uikit@3.21.0/dist/css/uikit.min.css');
        loadCSS('bootstrap-css', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css');
        loadCSS('remix-icon', 'https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css');

        // Load JS Frameworks Sequentially (uikit-icons depends on uikit-js being ready)
        loadScript('uikit-js', 'https://cdn.jsdelivr.net/npm/uikit@3.21.0/dist/js/uikit.min.js');
        loadScript('uikit-icons', 'https://cdn.jsdelivr.net/npm/uikit@3.21.0/dist/js/uikit-icons.min.js');
        loadScript('bootstrap-js', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js');

        return () => {
            // Remove CSS to prevent bleeding into the admin dashboard or other react components
            ['uikit-css', 'bootstrap-css', 'remix-icon'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.remove();
            });
        };
    }, []);

    // Execute Custom JS Theme Template
    useEffect(() => {
        if (!jsBase) return;
        const scriptId = 'theme-custom-js';
        const existing = document.getElementById(scriptId);
        if (existing) existing.remove();

        const script = document.createElement('script');
        script.id = scriptId;
        script.innerHTML = `
            try {
                (function() {
                    ${jsBase}
                })();
            } catch(e) {
                console.error("Theme JS error:", e);
            }
        `;
        document.body.appendChild(script);

        return () => {
            const el = document.getElementById(scriptId);
            if (el) el.remove();
        };
    }, [jsBase, isOpened, htmlBase]); // Re-run js execution if isOpened or htmlBase changes

    // Sync music icon state for themes injected via dangerouslySetInnerHTML
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const musicBtn = container.querySelector('#btn-toggle-music, #btn-music');
        if (musicBtn) {
            // Toggle music-playing class on the button
            if (isPlaying) {
                musicBtn.classList.add('music-playing');
            } else {
                musicBtn.classList.remove('music-playing');
            }

            // 1. Check for child with uk-icon attribute
            const ukIconEl = musicBtn.querySelector('[uk-icon], #music-icon');
            if (ukIconEl) {
                const ratio = ukIconEl.getAttribute('uk-icon')?.includes('ratio: 1.2') ? '; ratio: 1.2' : '';
                ukIconEl.setAttribute('uk-icon', isPlaying ? `icon: pause${ratio}` : `icon: play${ratio}`);
                if ((window as any).UIkit) {
                    try { (window as any).UIkit.icon(ukIconEl); } catch (e) { }
                }
            }

            // 2. Check for child with remix icon or font awesome classes
            const musicBtnIcon = musicBtn.querySelector('i, span:not([uk-icon])');
            if (musicBtnIcon) {
                if (isPlaying) {
                    if (musicBtnIcon.className.includes('ri-')) {
                        musicBtnIcon.className = 'ri-pause-circle-line';
                    } else if (musicBtnIcon.className.includes('fa-')) {
                        musicBtnIcon.className = 'fa fa-pause';
                    }
                } else {
                    if (musicBtnIcon.className.includes('ri-')) {
                        musicBtnIcon.className = 'ri-music-2-line';
                    } else if (musicBtnIcon.className.includes('fa-')) {
                        musicBtnIcon.className = 'fa fa-play';
                    }
                }
            }

            // 3. Check for specific play/pause icons (like SVGs with play-icon/pause-icon)
            const playIcon = musicBtn.querySelector('#play-icon') as HTMLElement;
            const pauseIcon = musicBtn.querySelector('#pause-icon') as HTMLElement;
            if (playIcon && pauseIcon) {
                playIcon.style.display = isPlaying ? 'none' : 'block';
                pauseIcon.style.display = isPlaying ? 'block' : 'none';
            }
        }

        // 4. Dispatch native play/pause events on the local audio element to trigger theme-level listeners
        const bgMusicEl = container.querySelector('#bg-music');
        if (bgMusicEl) {
            try {
                const eventName = isPlaying ? 'play' : 'pause';
                bgMusicEl.dispatchEvent(new Event(eventName));
            } catch (e) {
                console.error("Failed to dispatch event on theme bg-music element:", e);
            }
        }
    }, [isPlaying, htmlBase]); // Re-run when playing state OR html content changes

    // --- SYSTEM COUNTDOWN HELPER ---
    useEffect(() => {
        if (!weddingDate) return;

        const updateCountdown = () => {
            const target = new Date(weddingDate).getTime();
            const now = Date.now();
            const diff = Math.max(0, target - now);

            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            const container = containerRef.current;
            if (!container) return;

            // Target elements by ID (which are auto-wrapped in InvitationPage)
            const els = {
                days: container.querySelector('#tm-countdown-days'),
                hours: container.querySelector('#tm-countdown-hours'),
                minutes: container.querySelector('#tm-countdown-minutes'),
                seconds: container.querySelector('#tm-countdown-seconds')
            };

            if (els.days) els.days.textContent = String(d).padStart(2, '0');
            if (els.hours) els.hours.textContent = String(h).padStart(2, '0');
            if (els.minutes) els.minutes.textContent = String(m).padStart(2, '0');
            if (els.seconds) els.seconds.textContent = String(s).padStart(2, '0');
        };

        updateCountdown(); // Initial run
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [weddingDate, htmlBase]); // Restart if wedding date or HTML structure changes

    // --- INTERCEPT LINKS & BUTTONS IN CAPTURE PHASE ---
    // This intercepts click events before any child element listeners (UIkit, standard browser navigation, etc.)
    // can capture them, ensuring the URL is absolutely protected from hash mutations, and preventing
    // UIkit's uk-toggle from hijacking/hiding crucial floating icons.
    useEffect(() => {
        const handleCaptureClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // A. Prevent UIkit's uk-toggle from hijacking/hiding the QR button
            const qrBtn = target.closest('#btn-show-qr');
            if (qrBtn) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                onShowQR();
                return;
            }

            // B. Prevent UIkit's uk-toggle from hijacking/hiding the Menu button
            const menuBtn = target.closest('#btn-show-menu');
            if (menuBtn && flagUseSystemActionButton) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                onShowMenu();
                return;
            }

            const anchor = target.closest('a');
            if (anchor) {
                const href = anchor.getAttribute('href');
                if (href && (href.startsWith('#') || href.includes('#'))) {
                    const hashIndex = href.indexOf('#');
                    const hash = href.substring(hashIndex);

                    // Only intercept if it's a theme layout hash link, NOT a React Router route (which starts with #/)
                    if (hash === '#' || (!hash.startsWith('#/') && hash !== '#/')) {
                        // 1. Instantly kill the event so no other listener (native or UIkit) ever receives it!
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();

                        // 2. Safely trigger target modal hiding to close any open UIkit nav menus
                        const toggleAttr = anchor.getAttribute('uk-toggle');
                        if (toggleAttr && (window as any).UIkit) {
                            const match = toggleAttr.match(/target:\s*(#[a-zA-Z0-9_-]+)/);
                            if (match && match[1]) {
                                try {
                                    (window as any).UIkit.modal(match[1]).hide();
                                } catch (err) { }
                            }
                        } else if ((window as any).UIkit) {
                            // Default fallback to close #menu-modal if present
                            try {
                                (window as any).UIkit.modal('#menu-modal').hide();
                            } catch (err) { }
                            // Also close any offcanvas drawers
                            try {
                                (window as any).UIkit.offcanvas('.uk-offcanvas').hide();
                            } catch (err) { }
                        }

                        // 3. Smooth scroll to the target section element globally
                        if (hash.length > 1) {
                            const targetId = hash.substring(1);
                            const targetEl = document.querySelector(`#${targetId}`);
                            if (targetEl) {
                                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }
                    }
                }
            }
        };

        // Attach listener globally to document in capture phase
        document.addEventListener('click', handleCaptureClick, true);

        return () => {
            document.removeEventListener('click', handleCaptureClick, true);
        };
    }, [htmlBase, onShowQR, onShowMenu, flagUseSystemActionButton]);

    const handleClick = async (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;

        // --- INTERCEPT HASH LINKS FOR SMOOTH SCROLLING ---
        const anchor = target.closest('a') as HTMLAnchorElement;
        if (anchor) {
            const href = anchor.getAttribute('href');
            if (href && (href.startsWith('#') || href.includes('#'))) {
                const hashIndex = href.indexOf('#');
                const hash = href.substring(hashIndex);

                // 1. Prevent default and stop propagation immediately so UIkit or native browser navigation
                // doesn't hijack the hash URL and break React Router's HashRouter!
                e.preventDefault();
                e.stopPropagation();
                if (e.nativeEvent) {
                    e.nativeEvent.stopImmediatePropagation();
                }

                // 2. Safely trigger target modal hiding to close any open UIkit nav menus
                const toggleAttr = anchor.getAttribute('uk-toggle');
                if (toggleAttr && (window as any).UIkit) {
                    const match = toggleAttr.match(/target:\s*(#[a-zA-Z0-9_-]+)/);
                    if (match && match[1]) {
                        try {
                            (window as any).UIkit.modal(match[1]).hide();
                        } catch (err) { }
                    }
                } else if ((window as any).UIkit) {
                    // Default fallback to close #menu-modal if present
                    try {
                        (window as any).UIkit.modal('#menu-modal').hide();
                    } catch (err) { }
                }

                // 3. Smooth scroll to the target section element globally
                if (hash.length > 1) {
                    const targetId = hash.substring(1);
                    const targetEl = document.querySelector(`#${targetId}`);
                    if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
                return;
            }
        }

        // --- SUBMIT RSVP (Kehadiran) ---
        if (target.closest('#btn-submit-kehadiran')) {
            e.preventDefault();
            const btn = target.closest('#btn-submit-kehadiran') as HTMLButtonElement;
            if (btn.disabled) return;

            const container = containerRef.current;
            const alertEl = container?.querySelector('#alert-submit-kehadiran');
            const status = (container?.querySelector('#rsvp-status') as HTMLSelectElement | HTMLInputElement)?.value || 'confirmed';
            const guests = parseInt((container?.querySelector('#rsvp-guests') as HTMLInputElement)?.value || '1');
            const code = (container?.querySelector('#rsvp-code') as HTMLInputElement)?.value || '';

            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="ri-loader-4-line uk-animation-spin"></i> Mengirim...';

            if (alertEl) alertEl.innerHTML = '';

            const res = await onSubmitRSVP({ status, guests, code });

            btn.innerHTML = originalText;

            if (alertEl) {
                alertEl.className = `uk-margin-small-top uk-text-small ${res.success ? 'uk-text-success' : 'uk-text-danger'}`;
                alertEl.innerHTML = (res.success ? '<i class="ri-checkbox-circle-line"></i> ' : '<i class="ri-error-warning-line"></i> ') + res.message;
            }

            if (res.success) {
                btn.disabled = true;

                const thanksEl = container?.querySelector('#rsvp-thanks, .rsvp-thanks, #rsvp-success');
                const formEl = container?.querySelector('#rsvp-form, .rsvp-form');
                if (thanksEl) thanksEl.classList.remove('hidden', 'uk-hidden');
                if (formEl) formEl.classList.add('hidden', 'uk-hidden');
            } else {
                btn.disabled = false;
            }
        }

        // --- SUBMIT WISH (Ucapan) ---
        if (target.closest('#btn-submit-ucapan')) {
            e.preventDefault();
            const btn = target.closest('#btn-submit-ucapan') as HTMLButtonElement;
            if (btn.disabled) return;

            const container = containerRef.current;
            const alertEl = container?.querySelector('#alert-submit-ucapan');
            const name = (container?.querySelector('#wish-name') as HTMLInputElement)?.value || '';
            const message = (container?.querySelector('#wish-message') as HTMLTextAreaElement)?.value || '';

            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="ri-loader-4-line uk-animation-spin"></i> Mengirim...';

            if (alertEl) alertEl.innerHTML = '';

            const res = await onSubmitWish({ name, message });

            btn.innerHTML = originalText;

            if (alertEl) {
                alertEl.className = `uk-margin-small-top uk-text-small ${res.success ? 'uk-text-success' : 'uk-text-danger'}`;
                alertEl.innerHTML = (res.success ? '<i class="ri-checkbox-circle-line"></i> ' : '<i class="ri-error-warning-line"></i> ') + res.message;
            }

            if (res.success) {
                btn.disabled = true; // Stay disabled on success as requested
                // Clear inputs
                const activeName = container?.querySelector('#wish-name') as HTMLInputElement;
                const activeMsg = container?.querySelector('#wish-message') as HTMLTextAreaElement;
                if (activeName) activeName.value = '';
                if (activeMsg) activeMsg.value = '';
            } else {
                btn.disabled = false;
            }
        }

        // --- SUBMIT GIFT (Hadiah) ---
        if (target.closest('#btn-submit-hadiah') && onSubmitGift) {
            e.preventDefault();
            const btn = target.closest('#btn-submit-hadiah') as HTMLButtonElement;
            if (btn.disabled) return;

            const container = containerRef.current;
            const alertEl = container?.querySelector('#alert-submit-hadiah');
            const name = (container?.querySelector('#gift-name') as HTMLInputElement)?.value || '';
            const amountStr = (container?.querySelector('#gift-amount') as HTMLInputElement)?.value || '0';
            const amount = parseInt(amountStr.replace(/\D/g, ''), 10) || 0;
            const bank = (container?.querySelector('#gift-bank') as HTMLInputElement)?.value || '';

            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="ri-loader-4-line uk-animation-spin"></i> Mengirim...';

            if (alertEl) alertEl.innerHTML = '';

            const res = await onSubmitGift({ name, amount, bank });

            btn.innerHTML = originalText;

            if (alertEl) {
                alertEl.className = `uk-margin-small-top uk-text-small ${res.success ? 'uk-text-success' : 'uk-text-danger'}`;
                alertEl.innerHTML = (res.success ? '<i class="ri-checkbox-circle-line"></i> ' : '<i class="ri-error-warning-line"></i> ') + res.message;
            }

            if (res.success) {
                btn.disabled = true;
                const activeName = container?.querySelector('#gift-name') as HTMLInputElement;
                const activeAmount = container?.querySelector('#gift-amount') as HTMLInputElement;
                const activeBank = container?.querySelector('#gift-bank') as HTMLInputElement;
                if (activeName) activeName.value = '';
                if (activeAmount) activeAmount.value = '';
                if (activeBank) activeBank.value = '';
            } else {
                btn.disabled = false;
            }
        }

        if (target.closest('#btn-open-invitation')) {
            setIsOpened(true);
            setIsPlaying(true);

            const appScreen = document.querySelector('.mock-app-screen');
            if (appScreen) appScreen.classList.add('reveal-content');

            setTimeout(() => {
                document.body.style.overflow = 'auto';
                const phoneContainer = document.querySelector('.phone-container') as HTMLElement;
                if (phoneContainer) phoneContainer.style.overflowY = 'auto';

                if ((window as any).UIkit) {
                    (window as any).UIkit.update(document.body, 'update');
                }
            }, 1000);
        }
        if (target.closest('#btn-show-qr')) {
            e.preventDefault();
            e.stopPropagation();
            if (e.nativeEvent) {
                e.nativeEvent.stopImmediatePropagation();
            }
            onShowQR();
            return;
        }
        if (target.closest('#btn-show-menu') && flagUseSystemActionButton) {
            e.preventDefault();
            onShowMenu();
        }
        if (target.closest('#btn-toggle-music') || target.closest('#btn-music')) {
            e.preventDefault();
            setIsPlaying(!isPlaying);
        }
        if (target.closest('#btn-scoll-up') || target.closest('#btn-scroll-up')) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            const phoneContainer = document.querySelector('.phone-container');
            if (phoneContainer) {
                phoneContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
            const scrollableMain = document.querySelector('.mock-app-screen');
            if (scrollableMain) {
                scrollableMain.scrollTo({ top: 0, behavior: 'smooth' });
            }
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }

        // --- UNIVERSAL LIGHTBOX ---
        const galleryItem = target.closest('.gallery-item, .lightbox-injection') as HTMLElement;
        if (galleryItem) {
            const imgEl = (galleryItem.tagName === 'IMG'
                ? galleryItem
                : galleryItem.querySelector('.lightbox-injection, img')) as HTMLImageElement;

            if (imgEl) {
                // Prevent default and stop propagation immediately to override UIkit's or theme's built-in lightboxes!
                e.preventDefault();
                e.stopPropagation();
                if (e.nativeEvent) {
                    e.nativeEvent.stopImmediatePropagation();
                }

                const galleryContainer = target.closest('#sec-gallery, #gallery, .gallery-container, .section-gallery');
                if (galleryContainer) {
                    const allLbImages = Array.from(galleryContainer.querySelectorAll('.lightbox-injection, img')) as HTMLImageElement[];
                    const imageUrls = allLbImages.map(img => img.src || img.getAttribute('src') || '');
                    const currentIndex = allLbImages.indexOf(imgEl);
                    onOpenLightbox(currentIndex >= 0 ? currentIndex : 0, imageUrls);
                } else {
                    onOpenLightbox(0, [imgEl.src]);
                }
                return;
            }
        }
    };

    return (
        <div className={`w-full min-h-screen theme-wrapper relative bg-white ${isOpened ? 'is-opened' : 'is-closed'}`}>
            {cssBase && (
                <style dangerouslySetInnerHTML={{ __html: cssBase }} />
            )}

            {/* Persistent Visibility State Overrides using Static CSS */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .is-closed #theme-fab-container { display: none !important; }
                .is-closed #main-content { display: none !important; }
                .is-opened #theme-cover { display: none !important; }
                .is-opened #main-content { display: block !important; }
                
                /* Override/hide theme FAB container if system action button is requested */
                ${flagUseSystemActionButton ? `
                    #theme-fab-container { display: none !important; }
                ` : `
                    .is-opened #theme-fab-container { display: block !important; }
                `}

                .system-fab-container {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    z-index: 999;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    pointer-events: auto;
                }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 640px) {
                    .system-fab-container {
                        bottom: 16px;
                        right: 16px;
                        gap: 8px;
                    }
                    .system-fab-container button {
                        width: 42px !important;
                        height: 42px !important;
                    }
                    .system-fab-container button i {
                        font-size: 16px !important;
                    }
                }
            ` }} />

            <div
                ref={containerRef}
                className="w-full min-h-screen"
                dangerouslySetInnerHTML={{ __html: htmlBase }}
                onClick={handleClick}
                onInput={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.id === 'rsvp-status' || target.closest('#rsvp-status')) {
                        const statusEl = (target.id === 'rsvp-status' ? target : target.closest('#rsvp-status')) as HTMLSelectElement | HTMLInputElement;
                        const container = containerRef.current;
                        const guestsEl = container?.querySelector('#rsvp-guests') as HTMLInputElement;
                        if (guestsEl) {
                            if (statusEl.value === 'declined') {
                                guestsEl.value = '0';
                                guestsEl.disabled = true;
                            } else {
                                guestsEl.disabled = false;
                                if (guestsEl.value === '0') guestsEl.value = '1';
                            }
                        }
                    }
                }}
                onSubmit={(e) => e.preventDefault()}
            />

            {/* System Floating Action Buttons */}
            {flagUseSystemActionButton && isOpened && (
                <div className="system-fab-container">
                    {/* Scroll up */}
                    {showScrollUp && (
                        <button
                            id="btn-scoll-up"
                            className="w-12 h-12 rounded-full bg-white/85 dark:bg-gray-800/85 backdrop-blur-md shadow-lg border border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-200 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 hover:bg-gold-500 hover:text-white"
                            title="Scroll ke Atas"
                        >
                            <i className="ri-arrow-up-line text-lg"></i>
                        </button>
                    )}

                    {/* Play/Pause Music */}
                    <button
                        id="btn-toggle-music"
                        className={`w-12 h-12 rounded-full backdrop-blur-md shadow-lg border flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${isPlaying
                            ? 'bg-gold-500 border-gold-400/50 text-white'
                            : 'bg-white/85 dark:bg-gray-800/85 border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-200'
                            }`}
                        title={isPlaying ? "Jeda Musik" : "Putar Musik"}
                    >
                        <i className={`text-lg ${isPlaying ? 'ri-music-2-fill' : 'ri-music-2-line'}`} style={{ animation: isPlaying ? 'spin 3s linear infinite' : 'none' }}></i>
                    </button>

                    {/* Show QR code */}
                    <button
                        id="btn-show-qr"
                        className="w-12 h-12 rounded-full bg-white/85 dark:bg-gray-800/85 backdrop-blur-md shadow-lg border border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-200 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 hover:bg-gold-500 hover:text-white"
                        title="QR Code"
                    >
                        <i className="ri-qr-code-line text-lg"></i>
                    </button>

                    {/* Show list menu */}
                    <button
                        id="btn-show-menu"
                        className="w-12 h-12 rounded-full bg-white/85 dark:bg-gray-800/85 backdrop-blur-md shadow-lg border border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-200 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 hover:bg-gold-500 hover:text-white"
                        title="Daftar Menu"
                    >
                        <i className="ri-menu-line text-lg"></i>
                    </button>
                </div>
            )}

            {/* Render any React floating elements / Modals on top */}
            {children}
        </div>
    );
}
