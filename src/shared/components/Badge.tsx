import React from 'react';

export type BadgeVariant =
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'gold'
    | 'neutral';

export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
    variant?: BadgeVariant;
    size?: BadgeSize;
    /** Optional leading icon. */
    icon?: React.ReactNode;
    /** Add a subtle matching border (matches some inline badges in the app). */
    bordered?: boolean;
    className?: string;
    children: React.ReactNode;
    onClick?: () => void;
    title?: string;
}

// Color tokens consistent with the inline badge patterns used across the app.
const colorMap: Record<BadgeVariant, { base: string; border: string }> = {
    success: {
        base: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
        border: 'border border-emerald-200 dark:border-emerald-900/40',
    },
    warning: {
        base: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
        border: 'border border-amber-200 dark:border-amber-900/40',
    },
    danger: {
        base: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        border: 'border border-red-200 dark:border-red-900/40',
    },
    info: {
        base: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
        border: 'border border-blue-200 dark:border-blue-900/40',
    },
    gold: {
        base: 'bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400',
        border: 'border border-gold-200 dark:border-gold-900/40',
    },
    neutral: {
        base: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
        border: 'border border-gray-200 dark:border-gray-600',
    },
};

const sizeMap: Record<BadgeSize, string> = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
};

export function Badge({
    variant = 'neutral',
    size = 'md',
    icon,
    bordered = false,
    className = '',
    children,
    onClick,
    title,
}: BadgeProps) {
    const color = colorMap[variant];
    return (
        <span
            onClick={onClick}
            title={title}
            className={[
                'inline-flex items-center gap-1 rounded-full font-semibold',
                sizeMap[size],
                color.base,
                bordered ? color.border : '',
                onClick ? 'cursor-pointer transition-colors' : '',
                className,
            ].filter(Boolean).join(' ')}
        >
            {icon}
            {children}
        </span>
    );
}
