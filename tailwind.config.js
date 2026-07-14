import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Skala gray: shade TERANG (50–600) = default Tailwind (dipakai luas
                // untuk teks/border/bg di LIGHT mode → JANGAN diubah). Shade GELAP
                // (700–900) diberi TINT UNGU agar semua `dark:bg-gray-800/900` &
                // `dark:border-gray-700/800` SENADA dengan shell retro ungu
                // (--lp-ink #0e0e1a / --lp-panel #1b1530). Lightness dipertahankan
                // mendekati aslinya, jadi `text-gray-800/900` di light mode tetap
                // terbaca gelap (tint ungu tak kentara pada teks sekecil itu).
                gray: {
                    50: '#F9FAFB',
                    100: '#F3F4F6',
                    200: '#E5E7EB',
                    300: '#D1D5DB',
                    400: '#9CA3AF',
                    500: '#6B7280',
                    600: '#4B5563',
                    700: '#2E2748',   // was #374151 → ungu-abu (border dark)
                    750: '#241C3C',
                    800: '#1B1530',   // was #1F2937 → = --lp-panel (surface kartu dark)
                    850: '#151024',
                    900: '#0E0E1A',   // was #111827 → = --lp-ink (bg gelap)
                    950: '#090912',
                },
                gold: {
                    50: '#FBF7EF',
                    100: '#F5ECDA',
                    200: '#EBD9B5',
                    300: '#DFC28B',
                    400: '#D4AD66',
                    500: '#C6A769',
                    600: '#B08E4A',
                    700: '#8E7239',
                    800: '#6B5529',
                    900: '#483A1C',
                },
                wedding: {
                    bg: '#FAFAF8',
                    card: '#FFFFFF',
                    // Dark surfaces diselaraskan dengan shell retro ungu
                    // (lihat --lp-ink / --lp-panel di RetroAuthChrome / DashboardLayout)
                    // supaya kartu & tabel senada dengan rail + topbar.
                    dark: '#0E0E1A',        // = --lp-ink  (page background)
                    'dark-card': '#1B1530', // = --lp-panel (surface kartu)
                    'dark-surface': '#241A44',
                    accent: '#C6A769',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                display: ['Playfair Display', 'serif'],
            },
            boxShadow: {
                'card': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
                'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
                'gold': '0 4px 14px 0 rgba(198, 167, 105, 0.25)',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'slide-in-right': 'slideInRight 0.3s ease-out',
                'pulse-gold': 'pulseGold 2s infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                pulseGold: {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(198, 167, 105, 0.4)' },
                    '50%': { boxShadow: '0 0 0 10px rgba(198, 167, 105, 0)' },
                },
            },
        },
    },
    plugins: [
        typography,
    ],
};
