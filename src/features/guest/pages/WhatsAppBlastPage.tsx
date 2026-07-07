import { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import { useGuestStore } from '../store/guestStore';
import {
    HiOutlineSearch,
    HiOutlineChatAlt2,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineRefresh,
    HiOutlinePhone,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/features/auth/store/authStore';
import { invitationContentApi } from '@/core/api/endpoints';
import { useTranslation } from 'react-i18next';
import { InvitationContent } from '@/types';
import { IconButton } from '@/shared/components/IconButton';
import { useAdminHeaderActionStore } from '@/shared/store/adminHeaderActionStore';
import { useBasePath } from '@/shared/hooks/useBasePath';

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

type GuestItemProps = {
    guest: any,
    onSend: (g: any) => void,
    onUpdate: (id: string, data: any) => void,
    onToggleStatus: (id: string, sent: boolean) => Promise<boolean> | void,
};

const isGuestSent = (guest: any) =>
    guest.flag_sudah_kirim_undangan_via_whatsapp === true || guest.flag_sudah_kirim_undangan_via_whatsapp === 'TRUE';

// Status badge yang bisa di-toggle. Saat menunggu update, badge menampilkan
// spinner (bukan block screen). Update-nya sendiri senyap (skipLoader) & optimistik.
function StatusToggleBadge({ guest, onToggleStatus, size = 'md' }: {
    guest: any,
    onToggleStatus: GuestItemProps['onToggleStatus'],
    size?: 'sm' | 'md',
}) {
    const { t } = useTranslation();
    const [isToggling, setIsToggling] = useState(false);
    const isSent = isGuestSent(guest);

    const handleClick = async () => {
        if (isToggling) return;
        setIsToggling(true);
        try {
            await onToggleStatus(guest.id, !isSent);
        } finally {
            setIsToggling(false);
        }
    };

    const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px] gap-1' : 'px-2.5 py-1.5 text-[11px] gap-1.5 rounded-full';
    const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isToggling}
            title={isSent ? t('whatsapp_blast.mark_pending', 'Tandai belum terkirim') as string : t('whatsapp_blast.mark_sent', 'Tandai sudah terkirim') as string}
            className={`inline-flex items-center rounded font-bold shrink-0 transition-all active:scale-95 disabled:opacity-70 ${pad} ${
                isSent
                    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                    : 'text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
        >
            {isToggling ? (
                <span className={`${iconSize} border-2 border-current/30 border-t-current rounded-full animate-spin`} />
            ) : isSent ? (
                <HiOutlineCheckCircle className={iconSize} />
            ) : (
                <HiOutlineClock className={iconSize} />
            )}
            {isSent ? t('whatsapp_blast.sent') : t('whatsapp_blast.pending')}
        </button>
    );
}

// Baris tabel desktop. Di-hoist ke module scope + memo agar identitasnya stabil:
// update store pada 1 tamu tidak me-remount seluruh list (dulu bikin scroll loncat
// ke atas tiap kali toggle status).
const GuestRow = memo(({ guest, onSend, onUpdate, onToggleStatus }: GuestItemProps) => {
    const { t } = useTranslation();
    const [localName, setLocalName] = useState(guest.name || '');
    const [localPhone, setLocalPhone] = useState(guest.phone || '');
    const [isFocused, setIsFocused] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

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
                <StatusToggleBadge guest={guest} onToggleStatus={onToggleStatus} size="sm" />
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
});

// Kartu tamu versi mobile — hoisted + memo (alasan sama seperti GuestRow).
const GuestMobileCard = memo(({ guest, onSend, onUpdate, onToggleStatus }: GuestItemProps) => {
    const { t } = useTranslation();
    const [localName, setLocalName] = useState(guest.name || '');
    const [localPhone, setLocalPhone] = useState(guest.phone || '');
    const [isFocused, setIsFocused] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

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
            className={`rounded-xl p-3 relative transition-all duration-200 border ${
                isFocused
                    ? 'border-gold-400 shadow-md shadow-gold-500/10 bg-white dark:bg-wedding-dark-card'
                    : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-wedding-dark-card shadow-sm'
            }`}
        >
            {/* Top row: name (editable) + send button (tanpa avatar) */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <input
                        type="text"
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={handleBlur}
                        className="w-full bg-transparent border-none focus:ring-0 rounded p-0 text-gray-850 dark:text-white font-bold text-sm leading-tight"
                        placeholder={t('common.name')}
                    />
                    {isUpdating && (
                        <div className="w-3 h-3 border-2 border-gold-500/20 border-t-gold-500 rounded-full animate-spin shrink-0" />
                    )}
                </div>

                <button
                    onClick={() => onSend({ ...guest, name: localName, phone: localPhone })}
                    className="btn-primary py-1 px-2.5 text-[11px] flex items-center gap-1 rounded-full transition-transform active:scale-95 shadow-sm shrink-0 font-bold"
                >
                    <HiOutlineChatAlt2 className="w-3.5 h-3.5" />
                    {t('whatsapp_blast.send')}
                </button>
            </div>

            {/* Bottom row: phone sebagai FORM input asli (jelas bisa diubah) + status toggle */}
            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-dashed border-gray-100 dark:border-gray-800">
                <div className="relative min-w-0 flex-1">
                    <HiOutlinePhone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none z-10" />
                    <input
                        type="tel"
                        inputMode="tel"
                        value={localPhone}
                        onChange={(e) => setLocalPhone(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={handleBlur}
                        className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg py-1.5 pl-8 pr-2 text-[12px] text-gray-700 dark:text-gray-200 font-semibold leading-tight focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-400 transition-all"
                        placeholder={t('common.phone')}
                    />
                </div>

                <StatusToggleBadge guest={guest} onToggleStatus={onToggleStatus} size="sm" />
            </div>
        </div>
    );
});

export function WhatsAppBlastPage() {
    const { guests, loading: guestsLoading, fetchGuests, updateGuest, updateBlastStatus, setFilters } = useGuestStore();
    const { content: invitationContent, loading: contentLoading, hasLoadedContent, fetchContent, updateContent } = useInvitationContentStore();
    const { t } = useTranslation();
    const { tenant } = useAuthStore();
    const setHeaderAction = useAdminHeaderActionStore(s => s.setAction);
    const isAdminLayout = useBasePath() === '/admin';
    const editorRef = useRef<HTMLDivElement>(null);
    const editorSeededRef = useRef(false);
    // Markdown terakhir yang sudah tersimpan ke DB — dipakai agar auto-save saat
    // blur tidak menembak API kalau isi editor tidak berubah.
    const lastSavedMarkdownRef = useRef<string | null>(null);
    const [search, setSearch] = useState('');

    const loading = guestsLoading || contentLoading;

    // We store the Markdown version for logic, but editor displays HTML
    const [templateMarkdown] = useState(
        `Halo {{nama}},\n\nKami mengundang Anda untuk hadir di acara pernikahan kami.\n\nDetail undangan dapat dilihat pada link berikut:\n{{link}}\n\nTerima kasih.`
    );

    useEffect(() => {
        setFilters({ limit: 1000, page: 1 });
        fetchGuests();
        fetchContent();
    }, [fetchGuests, setFilters, fetchContent]);

    // Seed the editor exactly once, dan HANYA setelah fetch content BENAR-BENAR
    // selesai (hasLoadedContent === true).
    //
    // Bug sebelumnya (muncul saat refresh/reload): effect di-gate pada
    // `!contentLoading`. Pada hard reload, `contentLoading` masih `false` di render
    // pertama (fetchContent belum sempat set loading:true), jadi effect jalan saat
    // invitationContent masih null → editor terisi template DEFAULT dan langsung
    // dikunci (editorSeededRef=true). Ketika data DB akhirnya datang, seed di-skip,
    // sehingga template dari DB tidak pernah tampil.
    //
    // `hasLoadedContent` adalah sinyal DEFINITIF bahwa fetch sudah balik (store
    // baru men-set-nya true setelah response sukses), jadi tidak ada race lagi.
    useEffect(() => {
        if (!hasLoadedContent || editorSeededRef.current || !editorRef.current) return;

        const source = invitationContent?.wa_blast_template || templateMarkdown;
        editorRef.current.innerHTML = whatsAppToHtml(source);
        lastSavedMarkdownRef.current = htmlToWhatsApp(editorRef.current.innerHTML);
        editorSeededRef.current = true;
    }, [invitationContent, hasLoadedContent, templateMarkdown]);

    // Refresh: tarik ulang data. Buka kunci seed agar editor di-isi ulang dari
    // template DB terbaru setelah fetch selesai (bukan menyisakan isi lama/default).
    const handleRefresh = () => {
        editorSeededRef.current = false;
        fetchGuests(true);
        fetchContent(true);
    };

    // Pada layout /admin, tombol refresh dipindah ke gold header (sebelah tombol
    // "Buka Undangan") lewat store header-action. Di layout /private lama tombol
    // tetap tampil inline di dalam halaman.
    useEffect(() => {
        if (!isAdminLayout) return;
        setHeaderAction(
            <button
                onClick={handleRefresh}
                disabled={loading}
                title="Refresh Data"
                aria-label="Refresh Data"
                className="admin-icon-btn"
            >
                <HiOutlineRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
        );
        return () => setHeaderAction(null);
    }, [loading, isAdminLayout]);

    // Auto-save saat cursor user meninggalkan editor (onBlur). SILENT: tanpa
    // loading/spinner, tanpa toast sukses — hanya toast kalau benar-benar gagal.
    // Skip kalau isi tidak berubah dari yang terakhir tersimpan.
    const handleAutoSave = async () => {
        if (!editorSeededRef.current) return;
        const markdown = htmlToWhatsApp(editorRef.current?.innerHTML || '');
        if (markdown === lastSavedMarkdownRef.current) return;

        // Optimistik: anggap tersimpan agar blur berikutnya yang tak berubah
        // tidak menembak API lagi. Kalau gagal, di-rollback.
        const previous = lastSavedMarkdownRef.current;
        lastSavedMarkdownRef.current = markdown;
        try {
            const success = await updateContent({ wa_blast_template: markdown });
            if (!success) {
                lastSavedMarkdownRef.current = previous;
                toast.error(t('whatsapp_blast.save_error'));
            }
        } catch (err) {
            lastSavedMarkdownRef.current = previous;
            toast.error(t('common.error'));
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

    const handleSend = useCallback(async (guest: any) => {
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
    }, [tenant, invitationContent, updateBlastStatus, t]);

    // Callback stabil agar GuestRow/GuestMobileCard (memo) tidak re-render
    // percuma saat store update → mengurangi kerja render & jaga scroll tetap.
    const handleUpdateGuest = useCallback(
        (id: string, data: any) => updateGuest({ id, ...data }, true),
        [updateGuest]
    );
    const handleToggleStatus = useCallback(
        (id: string, sent: boolean) => updateBlastStatus(id, sent, true),
        [updateBlastStatus]
    );

    return (
        <div className="space-y-6">
            {/* Layout /admin: tombol refresh sudah dipindah ke gold header. Baris
                ini hanya untuk layout /private lama. */}
            {!isAdminLayout && (
                <div className="flex items-center justify-end mb-1">
                    <IconButton
                        onClick={handleRefresh}
                        icon={<HiOutlineRefresh className="w-4 h-4" />}
                        spinning={loading}
                        size="sm"
                        className="gap-1.5 text-xs font-bold uppercase tracking-wider"
                        title="Refresh Data"
                    />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Visual Editor Section */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="card h-full flex flex-col min-h-[500px]">
                        <div className="flex items-center justify-between gap-2 mb-4">
                            <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate">{t('whatsapp_blast.template_title')}</h2>
                            {/* Tersimpan otomatis saat cursor keluar dari editor — tanpa tombol Simpan. */}
                            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 flex items-center gap-1 shrink-0">
                                <HiOutlineCheckCircle className="w-3.5 h-3.5" />
                                {t('whatsapp_blast.autosave_hint', 'Tersimpan otomatis')}
                            </span>
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
                                onBlur={handleAutoSave}
                                className="input-field min-h-[300px] h-auto text-sm font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-gold-500/20 overflow-y-auto bg-white dark:bg-gray-900/50"
                                style={{ whiteSpace: 'pre-wrap' }}
                            />
                        </div>

   

                        
                    </div>
                </div>

                {/* Guest List Section */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="card flex flex-col">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate">{t('whatsapp_blast.guest_list')}</h2>
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

                        <div>

                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex gap-2">
                                <HiOutlineChatAlt2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase mb-0.5">{t('whatsapp_blast.format_title')}</h4>
                                    <p className="text-[10px] text-blue-700 dark:text-blue-400 leading-tight">
                                        {t('whatsapp_blast.format_desc')}
                                    </p>
                                </div>
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block">
                                <table className="w-full text-left">
                                    <thead className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
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
                                                    onUpdate={handleUpdateGuest}
                                                    onToggleStatus={handleToggleStatus}
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
                                            onUpdate={handleUpdateGuest}
                                            onToggleStatus={handleToggleStatus}
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
