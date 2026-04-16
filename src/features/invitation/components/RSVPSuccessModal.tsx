import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiX, HiCheckCircle, HiCalendar, HiLocationMarker, HiClock } from 'react-icons/hi';

interface RSVPSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        title: string;
        date: string;
        time: string;
        location: string;
        calendarUrl: string;
    } | null;
}

export function RSVPSuccessModal({ isOpen, onClose, data }: RSVPSuccessModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isOpen || !data || !mounted || typeof document === 'undefined' || !document.body) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-white/20 transform transition-all animate-in zoom-in-95 duration-300">
                {/* Header with Success Icon */}
                <div className="relative h-32 flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
                    >
                        <HiX className="w-5 h-5" />
                    </button>
                    <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm border border-white/30">
                        <HiCheckCircle className="w-12 h-12 text-white" />
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col items-center text-center">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Terima Kasih!</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Konfirmasi kehadiran Anda telah kami terima.
                    </p>

                    {/* Event Detail Box */}
                    <div className="w-full mt-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 text-left space-y-4">
                        <div className="flex items-start gap-3">
                            <HiCalendar className="w-5 h-5 text-gold-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Acara</p>
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{data.title}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <HiClock className="w-5 h-5 text-gold-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Waktu</p>
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{data.date}, {data.time}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <HiLocationMarker className="w-5 h-5 text-gold-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Lokasi</p>
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 line-clamp-2">{data.location}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <a
                        href={data.calendarUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full mt-8 flex items-center justify-center gap-3 py-4 px-6 bg-white border-2 border-[#4285F4] text-[#4285F4] rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-lg shadow-blue-500/10 active:scale-[0.98]"
                    >
                        <HiCalendar className="w-6 h-6" />
                        Simpan ke Google Calendar
                    </a>

                    <button
                        onClick={onClose}
                        className="mt-6 text-sm text-gray-400 hover:text-gray-600 font-medium transition-all"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
