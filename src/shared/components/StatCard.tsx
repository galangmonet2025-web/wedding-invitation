import type { ReactNode } from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    trend?: { value: number; label: string };
    color?: 'gold' | 'emerald' | 'blue' | 'rose' | 'violet';
}

const colorMap = {
    gold: {
        bg: 'bg-gold-100 dark:bg-gold-900/30',
        icon: 'text-gold-600 dark:text-gold-400',
        trend: 'text-gold-600',
    },
    emerald: {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        icon: 'text-emerald-600 dark:text-emerald-400',
        trend: 'text-emerald-600',
    },
    blue: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        icon: 'text-blue-600 dark:text-blue-400',
        trend: 'text-blue-600',
    },
    rose: {
        bg: 'bg-rose-100 dark:bg-rose-900/30',
        icon: 'text-rose-600 dark:text-rose-400',
        trend: 'text-rose-600',
    },
    violet: {
        bg: 'bg-violet-100 dark:bg-violet-900/30',
        icon: 'text-violet-600 dark:text-violet-400',
        trend: 'text-violet-600',
    },
};

export function StatCard({ title, value, icon, trend, color = 'gold' }: StatCardProps) {
    const colors = colorMap[color];

    return (
        <div className="group relative overflow-hidden bg-white dark:bg-wedding-dark-card rounded-xl p-3 md:p-4 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in">
            {/* Subtle Gradient Background */}
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-6 -mt-6 rounded-full blur-2xl opacity-10 dark:opacity-20 transition-opacity group-hover:opacity-20 dark:group-hover:opacity-30 ${colors.bg}`} />

            <div className="relative flex items-center gap-3 md:gap-4">
                <div className={`p-2 md:p-2.5 rounded-xl ${colors.bg} transition-all duration-300 group-hover:scale-105`}>
                    <div className={`${colors.icon} w-4 h-4 md:w-5 md:h-5`}>{icon}</div>
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-[10px] md:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate">{title}</p>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                        <h2 className="text-base md:text-xl font-black text-gray-800 dark:text-white truncate">
                            {value}
                        </h2>
                        {trend && (
                            <span className={`text-[9px] md:text-[10px] font-bold ${trend.value >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {trend.value >= 0 ? '↑' : '↓'}{Math.abs(trend.value)}%
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
