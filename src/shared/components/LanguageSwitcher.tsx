import { useTranslation } from 'react-i18next';
import { HiOutlineTranslate } from 'react-icons/hi';

export function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const toggleLanguage = () => {
        const nextLang = i18n.language === 'id' ? 'en' : 'id';
        i18n.changeLanguage(nextLang);
    };

    const currentLang = i18n.language === 'id' ? 'ID' : 'EN';

    return (
        <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 border border-gray-100 dark:border-gray-700 shadow-sm"
            aria-label="Toggle language"
        >
            <HiOutlineTranslate className="w-5 h-5 text-gold-500" />
            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                {currentLang}
            </span>
        </button>
    );
}
