interface LoadingOverlayProps {
    message?: string;
}

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="glass-card p-8 flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-gold-200 dark:border-gold-800 border-t-gold-500 animate-spin" />
                    <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-transparent border-b-gold-300 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{message}</p>
            </div>
        </div>
    );
}

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizeClasses = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
    return (
        <div className="flex items-center justify-center py-12">
            <div className={`${sizeClasses[size]} rounded-full border-4 border-gold-200 dark:border-gold-800 border-t-gold-500 animate-spin`} />
        </div>
    );
}

export function PageLoader() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-gold-200 dark:border-gold-800 border-t-gold-500 animate-spin" />
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-gold-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-gold-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-gold-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        </div>
    );
}
