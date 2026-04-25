import { useState, useEffect, useMemo, useRef } from 'react';
import { useGuestStore } from '../store/guestStore';
import {
    HiOutlineSearch,
    HiOutlineChatAlt2,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineSave,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/features/auth/store/authStore';
import { invitationContentApi } from '@/core/api/endpoints';
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

export function WhatsAppBlastPage() {
    const { guests, loading, fetchGuests, updateGuest, updateBlastStatus, setFilters } = useGuestStore();
    const { tenant } = useAuthStore();
    const editorRef = useRef<HTMLDivElement>(null);
    const [search, setSearch] = useState('');
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [invitationContent, setInvitationContent] = useState<InvitationContent | null>(null);

    // Sub-component for editable row to prevent full-list re-renders
    const GuestRow = ({ guest, onSend, onUpdate }: {
        guest: any,
        onSend: (g: any) => void,
        onUpdate: (id: string, data: any) => void
    }) => {
        const [localName, setLocalName] = useState(guest.name || '');
        const [localPhone, setLocalPhone] = useState(guest.phone || '');

        // Sync local state if guest prop changes from store (e.g. after a fetch)
        useEffect(() => {
            setLocalName(guest.name || '');
            setLocalPhone(guest.phone || '');
        }, [guest.name, guest.phone]);

        const handleBlur = () => {
            if (localName !== guest.name || localPhone !== guest.phone) {
                onUpdate(guest.id, { name: localName, phone: localPhone });
            }
        };

        return (
            <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-2">
                    <input
                        type="text"
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        onBlur={handleBlur}
                        className="w-full bg-transparent border-none focus:ring-1 focus:ring-gold-500/30 rounded py-1 px-2 text-gray-800 dark:text-white font-medium text-sm transition-all"
                        placeholder="Nama Tamu"
                    />
                </td>
                <td className="px-4 py-2">
                    <input
                        type="text"
                        value={localPhone}
                        onChange={(e) => setLocalPhone(e.target.value)}
                        onBlur={handleBlur}
                        className="w-full bg-transparent border-none focus:ring-1 focus:ring-gold-500/30 rounded py-1 px-2 text-sm text-gray-600 dark:text-gray-400 transition-all"
                        placeholder="Nomor Telepon"
                    />
                </td>
                <td className="px-4 py-3 text-center">
                    {(guest.flag_sudah_kirim_undangan_via_whatsapp === true || guest.flag_sudah_kirim_undangan_via_whatsapp === 'TRUE') ? (
                        <div className="inline-flex items-center gap-1 text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full text-[10px] font-bold">
                            <HiOutlineCheckCircle className="w-3 h-3" />
                            TERKIRIM
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-1 text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-[10px] font-bold">
                            <HiOutlineClock className="w-3 h-3" />
                            BELUM
                        </div>
                    )}
                </td>
                <td className="px-4 py-3 text-right">
                    <button
                        onClick={() => onSend({ ...guest, name: localName, phone: localPhone })}
                        className="btn-primary py-1.5 px-3 text-xs flex items-center gap-2 ml-auto"
                    >
                        <HiOutlineChatAlt2 className="w-4 h-4" />
                        Kirim
                    </button>
                </td>
            </tr>
        );
    };

    // We store the Markdown version for logic, but editor displays HTML
    const [templateMarkdown, setTemplateMarkdown] = useState(
        `Halo {{nama}},\n\nKami mengundang Anda untuk hadir di acara pernikahan kami.\n\nDetail undangan dapat dilihat pada link berikut:\n{{link}}\n\nTerima kasih.`
    );

    useEffect(() => {
        setFilters({ limit: 1000, page: 1 });
        fetchGuests();
        loadTemplate();
    }, [fetchGuests, setFilters]);

    const loadTemplate = async () => {
        try {
            const res = await invitationContentApi.getContent();
            if (res.success && res.data) {
                setInvitationContent(res.data);
                if (res.data.wa_blast_template) {
                    setTemplateMarkdown(res.data.wa_blast_template);
                    if (editorRef.current) {
                        editorRef.current.innerHTML = whatsAppToHtml(res.data.wa_blast_template);
                    }
                } else {
                    // Initialize with default if empty
                    if (editorRef.current) {
                        editorRef.current.innerHTML = whatsAppToHtml(templateMarkdown);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load template:', err);
        }
    };

    const handleSaveTemplate = async () => {
        setIsSavingTemplate(true);
        const currentHtml = editorRef.current?.innerHTML || '';
        const markdown = htmlToWhatsApp(currentHtml);

        try {
            const res = await invitationContentApi.updateContent({ wa_blast_template: markdown });
            if (res.success) {
                setTemplateMarkdown(markdown);
                toast.success('Template berhasil disimpan');
            } else {
                toast.error('Gagal menyimpan template');
            }
        } catch (err) {
            toast.error('Terjadi kesalahan saat menyimpan');
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
            toast.error('Nomor telepon tidak valid atau kosong');
            return;
        }

        // Get fresh markdown from editor HTML
        const editorHtml = editorRef.current?.innerHTML || '';
        const markdown = htmlToWhatsApp(editorHtml);

        // Generate personalized message
        const invitationLink = `${window.location.origin}/#/${tenant.domain_slug}?guestid=${guest.invitation_code}`;
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-white">WhatsApp Blast</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Kirim undangan personal ke tamu via WhatsApp</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Visual Editor Section */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="card h-full flex flex-col min-h-[500px]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <HiOutlineChatAlt2 className="w-5 h-5 text-gold-500" />
                                <h2 className="font-bold text-gray-800 dark:text-white">Template Pesan</h2>
                            </div>
                            <button
                                onClick={handleSaveTemplate}
                                disabled={isSavingTemplate}
                                className="text-xs btn-primary flex items-center gap-1.5 py-1 px-3"
                            >
                                {isSavingTemplate ? (
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <HiOutlineSave className="w-3.5 h-3.5" />
                                )}
                                Simpan
                            </button>
                        </div>

                        <div className="space-y-4 flex-1 flex flex-col">
                            <div>
                                {/* Visual Toolbar */}
                                <div className="flex flex-col gap-2 mb-2 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                                    {/* Formatting Icons */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); handleFormat('bold'); }}
                                            className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 transition-all font-bold"
                                            title="Bold"
                                        >
                                            B
                                        </button>
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); handleFormat('italic'); }}
                                            className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 transition-all italic"
                                            title="Italic"
                                        >
                                            I
                                        </button>
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); handleFormat('strikeThrough'); }}
                                            className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 transition-all line-through"
                                            title="Strikethrough"
                                        >
                                            S
                                        </button>
                                    </div>

                                    <div className="h-px bg-gray-100 dark:bg-gray-800 w-full" />

                                    {/* Template Variables */}
                                    <div className="flex flex-wrap gap-1.5">
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); insertText('{{nama}}'); }}
                                            className="text-[10px] font-bold px-2 py-1 bg-gold-50 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400 rounded-md hover:bg-gold-100 transition-colors shadow-sm"
                                            title={`Nama Tamu\n(Otomatis sesuai nama masing-masing tamu)`}
                                        >
                                            NAMA
                                        </button>
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); insertText('{{link}}'); }}
                                            className="text-[10px] font-bold px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-md hover:bg-emerald-100 transition-colors shadow-sm"
                                            title={`Link Undangan\n(Otomatis sesuai link unik tamu)`}
                                        >
                                            LINK
                                        </button>
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); insertText('{{groom}}'); }}
                                            className="text-[10px] font-bold px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-100 transition-colors shadow-sm"
                                            title={`Nama Pengantin Pria\n${invitationContent?.groom_name || '-'}`}
                                        >
                                            PRIA
                                        </button>
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); insertText('{{bride}}'); }}
                                            className="text-[10px] font-bold px-2 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-md hover:bg-rose-100 transition-colors shadow-sm"
                                            title={`Nama Pengantin Wanita\n${invitationContent?.bride_name || '-'}`}
                                        >
                                            WANITA
                                        </button>
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); insertText('{{lokasi}}'); }}
                                            className="text-[10px] font-bold px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md hover:bg-amber-100 transition-colors shadow-sm"
                                            title={`Lokasi Resepsi\n${invitationContent?.keterangan_lokasi_resepsi || '-'}`}
                                        >
                                            LOKASI
                                        </button>
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); insertText('{{tanggal}}'); }}
                                            className="text-[10px] font-bold px-2 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-md hover:bg-teal-100 transition-colors shadow-sm"
                                            title={`Tanggal Resepsi\n${invitationContent?.wedding_date || '-'}`}
                                        >
                                            TANGGAL
                                        </button>
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); insertText('{{waktu}}'); }}
                                            className="text-[10px] font-bold px-2 py-1 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-md hover:bg-violet-100 transition-colors shadow-sm"
                                            title={`Waktu Resepsi\n${invitationContent?.jam_awal_resepsi || ''} - ${invitationContent?.jam_akhir_resepsi || ''}`}
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
                                <h4 className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-1">Preview Real-time</h4>
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-300 leading-tight">
                                    Editor di atas akan menampilkan teks <strong>tebal</strong> atau <em>miring</em> sesuai yang akan diterima tamu. Simbol * atau _ akan ditambahkan otomatis saat pengiriman.
                                </p>
                            </div>

                            {/* Format Info Box Moved Here */}
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex gap-2">
                                <HiOutlineChatAlt2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase mb-0.5">Format WhatsApp</h4>
                                    <p className="text-[10px] text-blue-700 dark:text-blue-400 leading-tight">
                                        Gunakan <strong>62...</strong> atau <strong>08...</strong>. Jika melihat <code className="bg-red-100 dark:bg-red-900/40 px-1 rounded text-red-700">#error</code>, silakan hapus dan ketik ulang nomornya di tabel.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Guest List Section */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="card h-full flex flex-col min-h-[500px]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <h2 className="font-bold text-gray-800 dark:text-white">Daftar Tamu</h2>
                            <div className="relative w-full sm:w-64">
                                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cari nama atau nomor..."
                                    className="input-field pl-10"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gold-200 dark:scrollbar-thumb-gray-700">
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
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Memuat data...</td>
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
                    </div>
                </div>
            </div>
        </div>
    );
}
