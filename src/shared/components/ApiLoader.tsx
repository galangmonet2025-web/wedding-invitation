import { useApiStore } from '@/core/api/apiStore';
import { HiOutlineRefresh } from 'react-icons/hi';

export function ApiLoader() {
    const { loadingCount } = useApiStore();

    if (loadingCount === 0) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 animate-fade-in max-w-sm w-full mx-4">
                <div className="w-12 h-12 rounded-full border-4 border-gold-100 border-t-gold-500 animate-spin"></div>
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Processing Action</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Please wait while we process your request to the server...</p>
                </div>
            </div>
        </div>
    );
}
