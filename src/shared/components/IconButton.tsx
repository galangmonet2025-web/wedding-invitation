import React from 'react';

export type IconButtonShape = 'box' | 'ghost';
export type IconButtonColor = 'gold' | 'red' | 'blue' | 'gray' | 'emerald';
export type IconButtonSize = 'sm' | 'md';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** The icon element to render. */
    icon: React.ReactNode;
    /**
     * `box`  -> bordered square button used in headers (e.g. refresh).
     * `ghost`-> compact rounded button used inside tables/rows (edit/delete).
     */
    shape?: IconButtonShape;
    /** Accent color, mostly relevant for the `ghost` shape (table actions). */
    color?: IconButtonColor;
    size?: IconButtonSize;
    /** Spin the icon in place (refresh button) while a fetch is in progress. */
    spinning?: boolean;
}

const boxBase =
    'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gold-500 hover:text-gold-500 rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed';

const ghostColor: Record<IconButtonColor, string> = {
    gold: 'text-gray-400 hover:text-gold-600 hover:bg-gold-50 dark:hover:bg-gold-900/20',
    red: 'text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20',
    blue: 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20',
    emerald: 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
    gray: 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50',
};

const boxPad: Record<IconButtonSize, string> = { sm: 'p-2', md: 'p-2.5' };
const ghostPad: Record<IconButtonSize, string> = { sm: 'p-1.5', md: 'p-2' };

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
    { icon, shape = 'box', color = 'gold', size = 'md', spinning = false, className = '', type = 'button', children, ...rest },
    ref
) {
    const base = shape === 'box'
        ? `${boxBase} ${boxPad[size]}`
        : `rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${ghostColor[color]} ${ghostPad[size]}`;

    return (
        <button
            ref={ref}
            type={type}
            className={[base, 'inline-flex items-center justify-center', className].filter(Boolean).join(' ')}
            {...rest}
        >
            <span className={spinning ? 'animate-spin inline-flex' : 'inline-flex'}>{icon}</span>
            {children}
        </button>
    );
});
