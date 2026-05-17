import { useState, useEffect, useMemo, useRef } from 'react';
import { useGuestStore } from '../store/guestStore';
import {
    HiOutlineSearch,
    HiOutlineChatAlt2,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineSave,
    HiOutlineRefresh,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/features/auth/store/authStore';
import { invitationContentApi } from '@/core/api/endpoints';
import { useTranslation } from 'react-i18next';
import { InvitationContent } from '@/types';

// Helper: Convert WhatsApp Markdown to HTML for visual editor
const whatsAppToHtml = (text: string) => {
    if (!text) return '';
    return text
        .replace(/\*(.*?)\*/g, "<strong>$1</strong>")
        .replace(/_(.*?)_/g, "<em>$1</em>")
        .replace(/~(.*?)~/g, "<strike>$1</strike>")
        .replace(/```([\s\S]*?)```/g, "<code>$1</code>")
        .split('\n')
        .join('<br>');
};

// Helper: Convert HTML back to WhatsApp Markdown for sending/saving
const htmlToWhatsApp = (html: string) => {
    if (!html) return '';

    let text = html
        // Handle newlines
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<div>/gi, "\n")
        .replace(/<\/div>/gi, "")
        // Handle bold
        .replace(/<strong>(.*?)<\/strong>/gi, "*$1*")
        .replace(/<b>(.*?)<\/b>/gi, "*$1*")
        // Handle italic
        .replace(/<em>(.*?)<\/em>/gi, "_$1_")
        .replace(/<i>(.*?)<\/i>/gi, "_$1_")
        // Handle strike
        .replace(/<strike>(.*?)<\/strike>/gi, "~$1~")
        .replace(/<s>(.*?)<\/s>/gi, "~$1~")
        // Handle code
        .replace(/<code>(.*?)<\/code>/gi, "```$1```")
        .replace(/<pre>(.*?)<\/pre>/gi, "```$1```");

    // Remove remaining HTML tags
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = text;
    return tempDiv.textContent || tempDiv.innerText || "";
};

// Helper: Format phone number for WhatsApp (Indonesian focus)
const formatPhoneForWhatsApp = (phone: any) => {
    // Convert to string and remove non-numeric characters
    let cleaned = String(phone || '').replace(/\D/g, '');

    // Handle 0 prefix (e.g. 0812 -> 62812)
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    }
    // Handle 8 prefix (e.g. 812 -> 62812)
    else if (cleaned.startsWith('8')) {
        cleaned = '62' + cleaned;
    }

    return cleaned;
};

import { useInvitationContentStore } from '@/features/invitation/store/invitationContentStore';

export function WhatsAppBlastPage() {
    const { guests, loading: guestsLoading, fetchGuests, updateGuest, updateBlastStatus, setFilters } = useGuestStore();
    const { content: invitationContent, loading: contentLoading, fetchContent, updateContent } = useInvitationContentStore();
    const { t } = useTranslation();
    const { tenant } = useAuthStore();
    const editorRef = useRef<HTMLDivElement>(null);
    const [search, setSearch] = useState('');
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);

    const loading = guestsLoading || contentLoading;

    // We store the Markdown version for logic, but editor displays HTML
    const [templateMarkdown] = useState(
        `Halo {{nama}},\n\nKami mengundang Anda untuk hadir di acara pernikahan kami.\n\nDetail undangan dapat dilihat pada link berikut:\n{{link}}\n\nTerima kasih.`
    );

    // Sub-component for editable row to prevent full-list re-renders
    const GuestRow = ({ guest, onSend, onUpdate }: {
        guest: any,
        onSend: (g: any) => void,
        onUpdate: (id: string, data: any) => void
    }) => {
        const [localName, setLocalName] = useState(guest.name || '');
        const [localPhone, setLocalPhone] = useState(guest.phone || '');
        const [isFocused, setIsFocused] = useState(false);
        const [isUpdating, setIsUpdating] = useState(false);

        // Sync local state if guest prop changes from store (e.g. after a fetch)
        useEffect(() => {
            setLocalName(guest.name || '');
            setLocalPhone(guest.phone || '');
        }, [guest.name, guest.phone]);

        const handleBlur = async () => {
            setIsFocused(false);
            if (localName !== guest.name || localPhone !== guest.phone) {
                setIsUpdating(true);
                try {
                    await onUpdate(guest.id, { name: localName, phone: localPhone });
                } finally {
                    setIsUpdating(false);
                }
            }
        };

        return (
            <tr className={`${isFocused ? 'bg-gold-50/50 dark:bg-gold-900/10 ring-1 ring-inset ring-gold-200 dark:ring-gold-900/50' : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/50'} transition-all border-b border-gray-50 dark:border-gray-800 last:border-0 group`}>
                <td className="px-3 py-1 relative">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={localName}
                            onChange={(e) => setLocalName(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={handleBlur}
                            className="w-full bg-transparent border-none focus:ring-0 rounded py-0.5 px-1 text-gray-800 dark:text-white font-medium text-sm transition-all"
                            placeholder={t('common.name')}
                        />
                        {isUpdating && (
                            <div className="w-3 h-3 border-2 border-gold-500/20 border-t-gold-500 rounded-full animate-spin shrink-0" />
                        )}
                    </div>
                </td>
                <td className="px-3 py-1">
                    <input
                        type="text"
                        value={localPhone}
                        onChange={(e) => setLocalPhone(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={handleBlur}
                        className="w-full bg-transparent border-none focus:ring-0 rounded py-0.5 px-1 text-xs text-gray-500 dark:text-gray-400 transition-all"
                        placeholder={t('common.phone')}
                    />
                </td>
                <td className="px-3 py-1 text-center">
                    {(guest.flag_sudah_kirim_undangan_via_whatsapp === true || guest.flag_sudah_kirim_undangan_via_whatsapp === 'TRUE') ? (
                        <div className="inline-flex items-center gap-1 text-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10 px-2 py-0.5 rounded text-[10px] font-bold">
                            <HiOutlineCheckCircle className="w-3 h-3" />
                            {t('whatsapp_blast.sent')}
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-1 text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-2 py-0.5 rounded text-[10px] font-bold">
                            <HiOutlineClock className="w-3 h-3" />
                            {t('whatsapp_blast.pending')}
                        </div>
                    )}
                </td>
                <td className="px-3 py-1 text-right">
                    <button
                        onClick={() => onSend({ ...guest, name: localName, phone: localPhone })}
                        className="btn-primary py-1 px-3 text-[11px] flex items-center gap-1.5 ml-auto rounded-md transition-transform active:scale-95"
                    >
                        <HiOutlineChatAlt2 className="w-3.5 h-3.5" />
                        {t('whatsapp_blast.send')}
                    </button>
                </td>
            </tr>
        );
    };

    // Sub-component for editable mobile guest card to prevent full-list re-renders
    const GuestMobileCard = ({ guest, onSend, onUpdate }: {
        guest: any,
        onSend: (g: any) => void,
        onUpdate: (id: string, data: any) => void
    }) => {
        const [localName, setLocalName] = useState(guest.name || '');
        const [localPhone, setLocalPhone] = useState(guest.phone || '');
        const [isFocused, setIsFocused] = useState(false);
        const [isUpdating, setIsUpdating] = useState(false);

        // Sync local state if guest prop changes from store (e.g. after a fetch)
        useEffect(() => {
            setLocalName(guest.name || '');
            setLocalPhone(guest.phone || '');
        }, [guest.name, guest.phone]);

        const handleBlur = async () => {
            setIsFocused(false);
            if (localName !== guest.name || localPhone !== guest.phone) {
                setIsUpdating(true);
                try {
                    await onUpdate(guest.id, { name: localName, phone: localPhone });
                } finally {
                    setIsUpdating(false);
                }
            }
        };

        return (
            <div
                className={`card p-2.5 space-y-1.5 relative transition-all duration-300 border ${
                    isFocused
                        ? 'border-gold-400 bg-gold-50/10 dark:bg-gold-950/5 shadow-md shadow-gold-500/5'
                        : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-wedding-dark-card'
                }`}
            >
                {/* Header / Name Edit Row */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <input
                            type="text"
                            value={localName}
                            onChange={(e) => setLocalName(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={handleBlur}
                            className="w-full bg-transparent border-none focus:ring-0 rounded py-0 px-0 text-gray-850 dark:text-white font-bold text-[13px] leading-tight transition-all"
                            placeholder={t('common.name')}
                        />
                        {isUpdating && (
                            <div className="w-3 h-3 border-2 border-gold-500/20 border-t-gold-500 rounded-full animate-spin shrink-0" />
                        )}
                    </div>
                    
                    {/* Action Button right in Header */}
                    <button
                        onClick={() => onSend({ ...guest, name: localName, phone: localPhone })}
                        className="btn-primary py-1 px-2.5 text-[11px] flex items-center gap-1 rounded-md transition-transform active:scale-95 shadow-sm shrink-0"
                    >
                        <HiOutlineChatAlt2 className="w-3.5 h-3.5" />
                        {t('whatsapp_blast.send')}
                    </button>
                </div>

                {/* Info Fields Stack */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-0.5">
                    <div className="space-y-0.5">
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">
                            No. Telepon
                        </span>
                        <input
                            type="text"
                            value={localPhone}
                            onChange={(e) => setLocalPhone(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={handleBlur}
                            className="w-full bg-transparent border-none focus:ring-0 rounded py-0 px-0 text-[10.5px] text-gray-655 dark:text-gray-300 font-semibold transition-all leading-tight"
                            placeholder={t('common.phone')}
                        />
                    </div>

                    <div className="space-y-0.5">
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">
                            Status Blast
                        </span>
                        <div className="flex items-center">
                            {(guest.flag_sudah_kirim_undangan_via_whatsapp === true || guest.flag_sudah_kirim_undangan_via_whatsapp === 'TRUE') ? (
                                <span className="inline-flex items-center gap-1 text-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                    <HiOutlineCheckCircle className="w-2.5 h-2.5" />
                                    {t('whatsapp_blast.sent')}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                    <HiOutlineClock className="w-2.5 h-2.5" />
                                    {t('whatsapp_blast.pending')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    useEffect(() => {
        setFilters({ limit: 1000, page: 1 });
        fetchGuests();
        fetchContent();
    }, [fetchGuests, setFilters, fetchContent]);

    // Update editor when invitationContent is loaded
    useEffect(() => {
        if (invitationContent?.wa_blast_template && editorRef.current && !editorRef.current.innerHTML) {
            editorRef.current.innerHTML = whatsAppToHtml(invitationContent.wa_blast_template);
        } else if (!invitationContent?.wa_blast_template && editorRef.current && !editorRef.current.innerHTML) {
            editorRef.current.innerHTML = whatsAppToHtml(templateMarkdown);
        }
    }, [invitationContent]);

    const handleSaveTemplate = async () => {
        setIsSavingTemplate(true);
        const currentHtml = editorRef.current?.innerHTML || '';
        const markdown = htmlToWhatsApp(currentHtml);

        try {
            const success = await updateContent({ wa_blast_template: markdown });
            if (success) {
                toast.success(t('whatsapp_blast.save_success'));
            } else {
                toast.error(t('whatsapp_blast.save_error'));
            }
        } catch (err) {
            toast.error(t('common.error'));
        } finally {
            setIsSavingTemplate(false);
        }
    };

    const handleFormat = (command: string, value: string = '') => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            editorRef.current.focus();
        }
    };

    const insertText = (text: string) => {
        const selection = window.getSelection();
        const editor = editorRef.current;
        if (!editor) return;

        let isInsideEditor = false;
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            isInsideEditor = editor.contains(range.commonAncestorContainer);
        }

        if (isInsideEditor && selection) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(text));
            // Move cursor after inserted text
            const newRange = document.createRange();
            newRange.setStartAfter(range.endContainer);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        } else {
            // Fallback: append to the end of editor if focus is outside
            const textNode = document.createTextNode(text);
            editor.appendChild(textNode);

            // Focus and move cursor to end
            editor.focus();
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
    };

    // Filter guests: match search only
    const filteredGuests = useMemo(() => {
        return guests.filter((g) => {
            const phoneStr = String(g.phone || '');
            const matchesSearch = (g.name || '').toLowerCase().includes(search.toLowerCase()) ||
                phoneStr.includes(search);
            return matchesSearch;
        });
    }, [guests, search]);

    const handleSend = async (guest: any) => {
        if (!tenant) return;

        const formattedPhone = formatPhoneForWhatsApp(guest.phone);

        if (!formattedPhone || formattedPhone.length < 10) {
            toast.error(t('whatsapp_blast.invalid_phone'));
            return;
        }

        // Get fresh markdown from editor HTML
        const editorHtml = editorRef.current?.innerHTML || '';
        const markdown = htmlToWhatsApp(editorHtml);

        // Generate personalized message
        const baseUrl = window.location.href.split('#')[0].replace(/\/$/, '');
        const invitationLink = `${baseUrl}/#/${tenant.domain_slug}?guestid=${guest.invitation_code}`;
        let message = markdown
            .replace(/{{nama}}/g, guest.name)
            .replace(/{{link}}/g, invitationLink);

        // Replace additional global variables if invitationContent is available
        if (invitationContent) {
            const waktu = `${invitationContent.jam_awal_resepsi || ''} - ${invitationContent.jam_akhir_resepsi || ''}`;
            message = message
                .replace(/{{groom}}/g, invitationContent.groom_name || '')
                .replace(/{{bride}}/g, invitationContent.bride_name || '')
                .replace(/{{lokasi}}/g, invitationContent.keterangan_lokasi_resepsi || '')
                .replace(/{{tanggal}}/g, invitationContent.wedding_date || '')
                .replace(/{{waktu}}/g, waktu);
        }

        // Encode message
        const encodedMessage = encodeURIComponent(message);
        const waUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

        // Open WhatsApp
        window.open(waUrl, '_blank');

        // Update status in database silently in background
        updateBlastStatus(guest.id, true, true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-end mb-1">
                <button
                    onClick={() => { fetchGuests(true); fetchContent(true); }}
                    className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gold-500 text-gray-400 hover:text-gold-500 rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                    title="Refresh Data"
                >
                    <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Visual Editor Section */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="card h-full flex flex-col min-h-[500px]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-3.5 bg-gold-500 rounded-full" />
                                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('whatsapp_blast.template_title')}</h2>
                            </div>
                            <button
                                onClick={handleSaveTemplate}
                                disabled={isSavingTemplate}
                                className="btn-primary py-1 px-3 text-[11px] text-white flex items-center gap-1.5 rounded-md transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-sm font-semibold"
                            >
                                {isSavingTemplate ? (
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <HiOutlineSave className="w-3.5 h-3.5" />
                                )}
                                {t('common.save')}
                            </button>
                        </div>

                        <div className="space-y-4 flex-1 flex flex-col">
                            <div>
                                {/* Visual Toolbar */}
                                <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded-md shadow-sm border border-gray-100 dark:border-gray-700">
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); handleFormat('bold'); }}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300 transition-all font-bold"
                                        title="Bold"
                                    >
                                        B
                                    </button>
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); handleFormat('italic'); }}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300 transition-all italic"
                                        title="Italic"
                                    >
                                        I
                                    </button>
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); handleFormat('strikeThrough'); }}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300 transition-all line-through"
                                        title="Strikethrough"
                                    >
                                        S
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); insertText('{{nama}}'); }}
                                        className="text-[10px] font-bold px-2 py-1 bg-gold-50 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400 rounded-md hover:bg-gold-100 transition-colors shadow-sm"
                                        title={t('whatsapp_blast.var_name')}
                                    >
                                        NAMA
                                    </button>
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); insertText('{{link}}'); }}
                                        className="text-[10px] font-bold px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-md hover:bg-emerald-100 transition-colors shadow-sm"
                                        title={t('whatsapp_blast.var_link')}
                                    >
                                        LINK
                                    </button>
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); insertText('{{groom}}'); }}
                                        className="text-[10px] font-bold px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-100 transition-colors shadow-sm"
                                        title={t('whatsapp_blast.var_groom')}
                                    >
                                        PRIA
                                    </button>
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); insertText('{{bride}}'); }}
                                        className="text-[10px] font-bold px-2 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-md hover:bg-rose-100 transition-colors shadow-sm"
                                        title={t('whatsapp_blast.var_bride')}
                                    >
                                        WANITA
                                    </button>
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); insertText('{{lokasi}}'); }}
                                        className="text-[10px] font-bold px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md hover:bg-amber-100 transition-colors shadow-sm"
                                        title={t('whatsapp_blast.var_location')}
                                    >
                                        LOKASI
                                    </button>
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); insertText('{{tanggal}}'); }}
                                        className="text-[10px] font-bold px-2 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-md hover:bg-teal-100 transition-colors shadow-sm"
                                        title={t('whatsapp_blast.var_date')}
                                    >
                                        TANGGAL
                                    </button>
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); insertText('{{waktu}}'); }}
                                        className="text-[10px] font-bold px-2 py-1 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-md hover:bg-violet-100 transition-colors shadow-sm"
                                        title={t('whatsapp_blast.var_time')}
                                    >
                                        WAKTU
                                    </button>
                                </div>
                            </div>

                            {/* ContentEditable Editor */}
                            <div
                                ref={editorRef}
                                contentEditable
                                className="input-field min-h-[300px] h-auto text-sm font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-gold-500/20 overflow-y-auto bg-white dark:bg-gray-900/50"
                                style={{ whiteSpace: 'pre-wrap' }}
                            />
                        </div>

                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                            <h4 className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-1">{t('whatsapp_blast.preview_realtime')}</h4>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-300 leading-tight">
                                {t('whatsapp_blast.preview_desc')}
                            </p>
                        </div>

                        {/* Format Info Box Moved Here */}
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex gap-2">
                            <HiOutlineChatAlt2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase mb-0.5">{t('whatsapp_blast.format_title')}</h4>
                                <p className="text-[10px] text-blue-700 dark:text-blue-400 leading-tight">
                                    {t('whatsapp_blast.format_desc')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Guest List Section */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="card h-full flex flex-col min-h-[500px]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-3.5 bg-gold-500 rounded-full" />
                                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('whatsapp_blast.guest_list')}</h2>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={t('common.search')}
                                    className="input-field pl-10"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gold-200 dark:scrollbar-thumb-gray-700">
                            {/* Desktop Table View */}
                            <div className="hidden md:block">
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 z-10 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                        <tr>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Nama</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">No. Telepon</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-center">Sudah Kirim</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                        {loading && filteredGuests.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="w-4 h-4 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
                                                        Memuat data...
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredGuests.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Tamu tidak ditemukan</td>
                                            </tr>
                                        ) : (
                                            filteredGuests.map((guest) => (
                                                <GuestRow
                                                    key={guest.id}
                                                    guest={guest}
                                                    onSend={handleSend}
                                                    onUpdate={(id, data) => updateGuest({ id, ...data }, true)}
                                                />
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards List View */}
                            <div className="block md:hidden p-1 space-y-3">
                                {loading && filteredGuests.length === 0 ? (
                                    <div className="py-8 text-center text-gray-400">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
                                            Memuat data...
                                        </div>
                                    </div>
                                ) : filteredGuests.length === 0 ? (
                                    <div className="py-8 text-center text-gray-400">Tamu tidak ditemukan</div>
                                ) : (
                                    filteredGuests.map((guest) => (
                                        <GuestMobileCard
                                            key={guest.id}
                                            guest={guest}
                                            onSend={handleSend}
                                            onUpdate={(id, data) => updateGuest({ id, ...data }, true)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
