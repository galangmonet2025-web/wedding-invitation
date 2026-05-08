import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HiOutlineX } from 'react-icons/hi';


interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    footer?: React.ReactNode;
    onConfirm?: () => void;
}

const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-full',
};

export function Modal({ isOpen, onClose, title, children, size = 'md', footer, onConfirm }: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'Enter' && onConfirm) {
                // Prevent Enter from triggering other things if modal is open
                e.preventDefault();
                onConfirm();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose, onConfirm]);

    if (!isOpen) return null;

    return createPortal(
        <div
            ref={overlayRef}
            className="fixed inset-0 z-[9999] flex items-start justify-center p-4 sm:p-6 md:p-10 overflow-y-auto"
            onClick={(e) => {
                if (e.target === overlayRef.current) onClose();
            }}
        >
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-fade-in cursor-pointer" 
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={`relative ${sizeClasses[size]} w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl 
                animate-slide-up border border-gray-100 dark:border-gray-800 flex flex-col ${size === 'full' ? 'h-full m-0' : 'my-auto sm:my-8 max-h-[90vh]'} `}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white font-display tracking-tight">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all active:scale-90"
                    >
                        <HiOutlineX className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">{children}</div>

                {/* Footer */}
                {footer && (
                    <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-4 bg-gray-50/30 dark:bg-gray-800/20 rounded-b-3xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
