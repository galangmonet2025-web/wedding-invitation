import { useRef, useLayoutEffect, useCallback } from 'react';
import type { TextareaHTMLAttributes } from 'react';

/**
 * A textarea whose height grows to fit its content — no inner scrollbar.
 * Drop-in replacement for a plain <textarea>; keeps the same className/props.
 * `minRows` sets the initial/minimum height in rows.
 */
export function AutoTextarea({
    value,
    onChange,
    className = '',
    minRows = 2,
    style,
    ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }) {
    const ref = useRef<HTMLTextAreaElement>(null);

    const resize = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = 'auto';               // reset so scrollHeight is accurate
        el.style.height = `${el.scrollHeight}px`; // grow to fit content
    }, []);

    // Re-fit whenever the value changes (typing OR external updates like load).
    useLayoutEffect(() => {
        resize();
    }, [value, resize]);

    return (
        <textarea
            ref={ref}
            value={value}
            onChange={(e) => { onChange?.(e); resize(); }}
            rows={minRows}
            // overflow-hidden kills the scrollbar; height is driven by JS above.
            className={`resize-none overflow-hidden ${className}`}
            style={style}
            {...rest}
        />
    );
}
