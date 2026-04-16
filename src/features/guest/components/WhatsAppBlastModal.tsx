import { useState, useMemo } from 'react';
import { Modal } from '@/shared/components/Modal';
import { generateWhatsAppLink } from '@/utils/whatsappUtils';
import type { Guest, Tenant } from '@/types';
import { HiOutlineChat, HiOutlineCheckCircle, HiOutlinePlay, HiOutlineArrowRight } from 'react-icons/hi';
import toast from 'react-hot-toast';

interface WhatsAppBlastModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedGuests: Guest[];
    tenant: Tenant | null;
}

export function WhatsAppBlastModal({ isOpen, onClose, selectedGuests, tenant }: WhatsAppBlastModalProps) {
    const defaultTemplate = `Halo *{{name}}*,\n\nKami mengundang Anda untuk hadir di acara pernikahan kami.\n\nSilakan buka tautan di bawah ini untuk melihat detail undangan digital Anda:\n{{link}}\n\nMerupakan suatu kehormatan bagi kami jika Anda dapat hadir.\n\nTerima kasih!`;
    
    const [template, setTemplate] = useState(defaultTemplate);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [sentIds, setSentIds] = useState<Set<string>>(new Set());

    const previewMessage = useMemo(() => {
        if (selectedGuests.length === 0 || !tenant) return '';
        const guest = selectedGuests[currentIndex] || selectedGuests[0];
        const link = `${window.location.origin}/wedding-invitation/#/${tenant.domain_slug}?guestid=${guest.invitation_code}`;
        
        return template
            .replace(/{{name}}/g, guest.name)
            .replace(/{{link}}/g, link);
    }, [template, currentIndex, selectedGuests, tenant]);

    const handleSendNext = () => {
        if (currentIndex >= selectedGuests.length || !tenant) return;
        
        const guest = selectedGuests[currentIndex];
        const link = generateWhatsAppLink(guest.phone, previewMessage);
        
        // Mark as sent
        const nextSent = new Set(sentIds);
        nextSent.add(guest.id);
        setSentIds(nextSent);

        // Open WhatsApp in new tab
        window.open(link, '_blank');

        // Move to next automatically if not the last
        if (currentIndex < selectedGuests.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            toast.success('Semua pesan telah disiapkan!');
        }
    };

    const resetBlast = () => {
        setCurrentIndex(0);
        setSentIds(new Set());
    };

    const progress = (sentIds.size / selectedGuests.length) * 100;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="WhatsApp Blast"
            size="2xl"
            footer={
                <div className="flex justify-between items-center w-full">
                    <button onClick={resetBlast} className="btn-ghost text-xs">Reset Progress</button>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="btn-ghost">Tutup</button>
                        <button 
                            onClick={handleSendNext} 
                            className="btn-primary flex items-center gap-2"
                            disabled={selectedGuests.length === 0}
                        >
                            {currentIndex < selectedGuests.length - 1 ? (
                                <>Kirim & Lanjut <HiOutlineArrowRight className="w-4 h-4" /></>
                            ) : (
                                <>Kirim Pesan Terakhir <HiOutlineCheckCircle className="w-4 h-4" /></>
                            )}
                        </button>
                    </div>
                </div>
            }
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Configuration */}
                <div className="space-y-4">
                    <div>
                        <label className="label-field text-xs uppercase tracking-wider font-bold">Template Pesan</label>
                        <textarea
                            className="input-field min-h-[200px] font-mono text-sm leading-relaxed"
                            value={template}
                            onChange={(e) => setTemplate(e.target.value)}
                        />
                        <p className="text-[10px] text-gray-500 mt-2">
                            Gunakan <code className="bg-gray-100 px-1 rounded">{"{{name}}"}</code> dan <code className="bg-gray-100 px-1 rounded">{"{{link}}"}</code> untuk data otomatis.
                        </p>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">Progress Pengiriman</span>
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{sentIds.size} / {selectedGuests.length}</span>
                        </div>
                        <div className="w-full bg-emerald-200 dark:bg-emerald-900/30 h-2 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-emerald-500 transition-all duration-500" 
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Queue & Preview */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center">
                        <span className="font-bold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                            <HiOutlinePlay className="text-gold-500" />
                            Preview: Antrean {currentIndex + 1}
                        </span>
                        <div className="flex gap-1">
                            <button 
                                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                                disabled={currentIndex === 0}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <button 
                                onClick={() => setCurrentIndex(Math.min(selectedGuests.length - 1, currentIndex + 1))}
                                disabled={currentIndex === selectedGuests.length - 1}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 p-6 flex flex-col">
                        {/* WhatsApp Bubble Preview */}
                        <div className="bg-emerald-100 dark:bg-emerald-900/40 p-4 rounded-2xl rounded-tl-none relative shadow-sm text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap flex-1">
                            {previewMessage}
                        </div>
                        
                        <div className="mt-6 flex items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="w-10 h-10 bg-gold-50 dark:bg-gold-900/20 text-gold-600 rounded-full flex items-center justify-center shrink-0">
                                <HiOutlineChat className="w-5 h-5" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-xs font-bold text-gray-400 uppercase">Tujuan</p>
                                <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                                    {selectedGuests[currentIndex]?.name} ({selectedGuests[currentIndex]?.phone || 'No WhatsApp'})
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
