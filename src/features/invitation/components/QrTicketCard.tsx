import { QRCodeSVG } from 'qrcode.react';
import { HiOutlineQrcode } from 'react-icons/hi';

interface QrTicketCardProps {
    /** Dialog heading, e.g. "QR Code Kehadiran". */
    title: string;
    name: string;
    /** The QR payload to encode. */
    qrValue: string;
    /** Human-readable code shown in the chip. Omit for guests without a code yet. */
    code?: string;
    /** Sub-label above the name, e.g. the guest category ("VIP", "Keluarga"). Optional. */
    subtitle?: string;
    /** Instruction note shown at the bottom. */
    note: string;
}

/**
 * Simple, elegant QR check-in card. Designed to live INSIDE the frosted
 * GlassModal shell (so it owns its own header). Centered layout: title →
 * framed QR with gold corner accents → guest name + code chip → hairline →
 * instruction note. Gold wedding accent, works in light & dark.
 */
export function QrTicketCard({ title, name, qrValue, code, subtitle, note }: QrTicketCardProps) {
    return (
        <div className="px-6 pt-7 pb-6 flex flex-col items-center text-center">
            {/* Header */}
            <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">{title}</h3>
            <span className="mt-2 h-px w-10 bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />

            {/* QR framed with gold corner accents */}
            <div className="relative mt-6 p-4 rounded-2xl bg-white/60 dark:bg-white/5 ring-1 ring-gold-500/15">
                <span className="absolute left-2 top-2 h-4 w-4 border-t-2 border-l-2 border-gold-500 rounded-tl" />
                <span className="absolute right-2 top-2 h-4 w-4 border-t-2 border-r-2 border-gold-500 rounded-tr" />
                <span className="absolute left-2 bottom-2 h-4 w-4 border-b-2 border-l-2 border-gold-500 rounded-bl" />
                <span className="absolute right-2 bottom-2 h-4 w-4 border-b-2 border-r-2 border-gold-500 rounded-br" />
                <div className="p-2.5 bg-white rounded-xl shadow-sm">
                    <QRCodeSVG value={qrValue} size={172} fgColor="#1A1A2E" bgColor="#FFFFFF" level="M" />
                </div>
            </div>

            {/* Guest identity */}
            <div className="mt-5">
                {subtitle && (
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-600 dark:text-gold-400 mb-1">
                        {subtitle}
                    </p>
                )}
                <p className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{name}</p>
                {code && (
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gold-50/80 dark:bg-gold-950/40 px-3 py-1 ring-1 ring-inset ring-gold-500/25">
                        <HiOutlineQrcode className="w-3.5 h-3.5 text-gold-500" />
                        <span className="font-mono text-xs font-semibold tracking-wider text-gold-700 dark:text-gold-300">{code}</span>
                    </span>
                )}
            </div>

            {/* Hairline + instruction */}
            <span className="mt-6 h-px w-full max-w-[220px] bg-gray-200/70 dark:bg-white/10" />
            <p className="mt-4 max-w-[240px] text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                {note}
            </p>
        </div>
    );
}
