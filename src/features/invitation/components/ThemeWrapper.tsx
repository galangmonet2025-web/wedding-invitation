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

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
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
