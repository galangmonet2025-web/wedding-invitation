import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Visual style. Maps to the existing .btn-* utility classes. */
    variant?: ButtonVariant;
    /** Padding/text size preset. `md` keeps the default class paddings. */
    size?: ButtonSize;
    /** Show a spinner and disable the button. The label/children stay visible. */
    loading?: boolean;
    /** Icon rendered to the left of the label. Replaced by the spinner while loading. */
    icon?: React.ReactNode;
    /** Icon rendered to the right of the label. */
    iconRight?: React.ReactNode;
    /** Make the button take the full width of its container. */
    fullWidth?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
};

// Size overrides the default padding baked into the .btn-* classes.
const sizeClass: Record<ButtonSize, string> = {
    sm: 'px-4 py-1.5 text-sm',
    md: '', // keep the class default (px-6 py-2.5)
    lg: 'px-8 py-3 text-base',
};

/** Spinner shown inside solid buttons (white) vs ghost/secondary (gold). */
function ButtonSpinner({ variant, size }: { variant: ButtonVariant; size: ButtonSize }) {
    const dim = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
    const color = variant === 'primary' || variant === 'danger'
        ? 'border-white/30 border-t-white'
        : 'border-gold-300 border-t-gold-600';
    return <div className={`${dim} border-2 ${color} rounded-full animate-spin`} aria-hidden="true" />;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    {
        variant = 'primary',
        size = 'md',
        loading = false,
        icon,
        iconRight,
        fullWidth = false,
        disabled,
        className = '',
        children,
        type = 'button',
        ...rest
    },
    ref
) {
    const hasLabel = children !== undefined && children !== null && children !== false;
    return (
        <button
            ref={ref}
            type={type}
            disabled={disabled || loading}
            className={[
                variantClass[variant],
                sizeClass[size],
                'inline-flex items-center justify-center gap-2',
                fullWidth ? 'w-full' : '',
                className,
            ].filter(Boolean).join(' ')}
            {...rest}
        >
            {loading ? <ButtonSpinner variant={variant} size={size} /> : icon}
            {hasLabel && <span>{children}</span>}
            {!loading && iconRight}
        </button>
    );
});
