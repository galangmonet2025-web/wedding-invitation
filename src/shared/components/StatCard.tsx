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
        <div className="stat-card group animate-fade-in">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white group-hover:text-gradient-gold transition-colors">
                        {value}
                    </p>
                    {trend && (
                        <div className="flex items-center gap-1 mt-2">
                            <span className={`text-xs font-medium ${trend.value >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
                            </span>
                            <span className="text-xs text-gray-400">{trend.label}</span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-xl ${colors.bg} transition-transform duration-300 group-hover:scale-110`}>
                    <div className={colors.icon}>{icon}</div>
                </div>
            </div>
        </div>
    );
}
