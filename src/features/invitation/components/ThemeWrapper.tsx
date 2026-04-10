import { useEffect, useRef } from 'react';

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
    onSubmitRSVP: (data: { status: string; guests: number; code: string }) => Promise<{ success: boolean; message: string }>;
    onSubmitWish: (data: { name: string; message: string }) => Promise<{ success: boolean; message: string }>;
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
    children
}: ThemeWrapperProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadScript = (id: string, src: string) => {
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

        // Load JS Frameworks (Locked Versions)
        loadScript('uikit-js', 'https://cdn.jsdelivr.net/npm/uikit@3.21.0/dist/js/uikit.min.js');
        loadScript('uikit-icons', 'https://cdn.jsdelivr.net/npm/uikit@3.21.0/dist/js/uikit-icons.min.js');
        loadScript('bootstrap-js', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js');

        return () => {
            // Remove CSS to prevent bleeding into the admin dashboard or other react components
            ['uikit-css', 'bootstrap-css', 'remix-icon'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.remove();
            });
            ['uikit-js', 'uikit-icons', 'bootstrap-js'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.remove();
            });
        };
    }, []);

    // Execute Custom JS Theme Template
    useEffect(() => {
        if (!jsBase) return;
        const script = document.createElement('script');
        script.id = 'theme-custom-js';
        script.innerHTML = `
            try {
                ${jsBase}
            } catch(e) {
                console.error("Theme JS error:", e);
            }
        `;
        document.body.appendChild(script);

        return () => {
            const el = document.getElementById('theme-custom-js');
            if (el) el.remove();
        };
    }, [jsBase, isOpened]); // Re-run js execution if isOpened changes? Only run once ideally, but the user HTML might manipulate DOM on open.
 
    // Audio logic removed for brevity in this chunk, keeping it in the file

    const handleClick = async (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;

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
                btn.disabled = true; // Stay disabled on success as requested
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
        if (target.closest('#btn-open-invitation')) {
            setIsOpened(true);
            setIsPlaying(true);
        }
        if (target.closest('#btn-show-qr')) {
            e.preventDefault();
            onShowQR();
        }
        if (target.closest('#btn-show-menu')) {
            e.preventDefault();
            onShowMenu();
        }
        if (target.closest('#btn-toggle-music')) {
            e.preventDefault();
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <div className="w-full min-h-screen theme-wrapper relative bg-white">
            {cssBase && (
                <style dangerouslySetInnerHTML={{ __html: cssBase }} />
            )}

            {/* Persistent Visibility State Overrides */}
            {isOpened && (
                <style dangerouslySetInnerHTML={{ __html: `
                    #theme-cover { display: none !important; }
                    #main-content { display: block !important; }
                ` }} />
            )}

            <div
                ref={containerRef}
                className="w-full min-h-screen"
                dangerouslySetInnerHTML={{ __html: htmlBase }}
                onClick={handleClick}
            />

            {/* Render any React floating elements / Modals on top */}
            {children}
        </div>
    );
}
