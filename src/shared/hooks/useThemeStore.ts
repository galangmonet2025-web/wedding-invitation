import { create } from 'zustand';

interface ThemeState {
    isDark: boolean;
    toggleTheme: () => void;
    setTheme: (dark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => {
    const stored = localStorage.getItem('wedding-saas-theme');
    const isDark = stored === 'dark';

    if (isDark) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
    }

    return {
        isDark,
        toggleTheme: () =>
            set((state) => {
                const newDark = !state.isDark;
                localStorage.setItem('wedding-saas-theme', newDark ? 'dark' : 'light');
                if (newDark) {
                    document.documentElement.classList.add('dark');
                    document.body.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                    document.body.classList.remove('dark');
                }
                return { isDark: newDark };
            }),
        setTheme: (dark: boolean) =>
            set(() => {
                localStorage.setItem('wedding-saas-theme', dark ? 'dark' : 'light');
                if (dark) {
                    document.documentElement.classList.add('dark');
                    document.body.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                    document.body.classList.remove('dark');
                }
                return { isDark: dark };
            }),
    };
});
