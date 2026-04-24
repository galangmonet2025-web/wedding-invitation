import { useBackgroundTaskStore } from '../store/backgroundTaskStore';
import { HiOutlineRefresh, HiOutlineCheckCircle, HiOutlineExclamationCircle } from 'react-icons/hi';
import { useState } from 'react';
import { BackgroundTaskModal } from './BackgroundTaskModal';

export function BackgroundTaskIndicator() {
    const { tasks } = useBackgroundTaskStore();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const activeTasks = tasks.filter(t => t.status === 'running');
    const hasError = tasks.some(t => t.status === 'error');
    
    if (tasks.length === 0) return null;

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className={`relative p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center
                    ${activeTasks.length > 0 
                        ? 'bg-gold-50 dark:bg-gold-900/20 text-gold-600' 
                        : hasError 
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-500' 
                            : 'bg-green-50 dark:bg-green-900/20 text-green-600'
                    }`}
                title="Lihat Proses Latar Belakang"
            >
                {activeTasks.length > 0 ? (
                    <HiOutlineRefresh className="w-5 h-5 animate-spin" />
                ) : hasError ? (
                    <HiOutlineExclamationCircle className="w-5 h-5" />
                ) : (
                    <HiOutlineCheckCircle className="w-5 h-5" />
                )}

                {activeTasks.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-800">
                        {activeTasks.length}
                    </span>
                )}
            </button>

            <BackgroundTaskModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
            />
        </>
    );
}
