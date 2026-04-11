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
                    dark: '#1A1A2E',
                    'dark-card': '#16213E',
                    'dark-surface': '#0F3460',
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
    plugins: [],
};
