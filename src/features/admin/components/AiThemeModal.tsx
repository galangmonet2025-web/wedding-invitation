import React, { useState, useCallback } from 'react';
import { Modal } from '@/shared/components/Modal';
import { HiOutlineDocumentText, HiOutlineCode, HiOutlineLightningBolt, HiOutlineCheckCircle, HiOutlineUpload, HiOutlineX, HiOutlineArrowsExpand, HiOutlineSparkles } from 'react-icons/hi';
import { IoLogoHtml5, IoLogoCss3, IoLogoJavascript } from 'react-icons/io5';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
const gfm = remarkGfm;
import BASE_PROMPT from '../assets/ai-theme-prompt.md?raw';

interface AiThemeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTriggerUpload: () => void;
    onApplyCode: (codes: { html?: string; css?: string; js?: string }) => void;
}

const THEME_STYLES = [
    {
        id: 'none',
        name: 'Tanpa Tema (Bebas AI)',
        icon: '🤖',
        prompt: ""
    },
    {
        id: 'modern',
        name: 'Modern Clean',
        icon: '✨',
        prompt: "\n### STYLE: MODERN CLEAN\n- Gunakan tipografi Sans-Serif yang bersih (seperti Inter atau Montserrat).\n- Layout asimetris yang berani dengan banyak whitespace.\n- Gunakan efek glassmorphism pada card atau navigasi.\n- Palette warna: Bold contrasts (misal: Deep Black & Gold, atau Pure White & Emerald)."
    },
    {
        id: 'elegant',
        name: 'Elegant Luxury',
        icon: '💎',
        prompt: "\n### STYLE: ELEGANT LUXURY\n- Gunakan tipografi Serif klasik yang mewah (seperti Playfair Display).\n- Tambahkan aksen border tipis berwarna emas atau perak.\n- Gunakan animasi transisi yang sangat halus dan lambat.\n- Palette warna: Champagne, Cream, Gold, dan Navy Blue."
    },
    {
        id: 'rustic',
        name: 'Rustic Earthy',
        icon: '🌿',
        prompt: "\n### STYLE: RUSTIC EARTHY\n- Gunakan elemen dekoratif organik seperti daun, ranting, atau tekstur kertas kraft.\n- Tipografi campuran antara Script yang hangat dan Serif klasik.\n- Gunakan warna-warna bumi (Earthy Tones).\n- Palette warna: Terracotta, Olive Green, Brown, dan Beige."
    },
    {
        id: 'minimalist',
        name: 'Minimalist',
        icon: '⚪',
        prompt: "\n### STYLE: MINIMALIST\n- Sangat sedikit dekorasi, fokus sepenuhnya pada foto mempelai.\n- Tipografi minimalis (thin sans-serif).\n- Gunakan margin dan padding yang sangat luas.\n- Palette warna: Monokromatik dengan satu warna aksen pastel yang sangat lembut."
    },
    {
        id: 'traditional',
        name: 'Traditional',
        icon: '🏮',
        prompt: "\n### STYLE: TRADITIONAL CULTURAL\n- Gunakan ornamen pola tradisional (seperti Batik, Songket, atau pola ukiran).\n- Warna-warna yang melambangkan kemegahan adat (Merah Marun, Emas Tua).\n- Layout yang lebih formal dan simetris.\n- Palette warna: Deep Red, Royal Gold, dan Dark Wood."
    }
];

export function AiThemeModal({ isOpen, onClose, onTriggerUpload, onApplyCode }: AiThemeModalProps) {
    const [isCopied, setIsCopied] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [selectedStyleId, setSelectedStyleId] = useState('none');
    const [pastedCodes, setPastedCodes] = useState<{ html: string; css: string; js: string }>({
        html: '',
        css: '',
        js: ''
    });

    const selectedStyle = THEME_STYLES.find(s => s.id === selectedStyleId) || THEME_STYLES[0];
    const FULL_PROMPT = selectedStyle.prompt ? `${BASE_PROMPT}\n\n${selectedStyle.prompt}` : BASE_PROMPT;

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(FULL_PROMPT).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }).catch(() => {
            const el = document.createElement('textarea');
            el.value = FULL_PROMPT;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    }, [FULL_PROMPT]);

    const handlePaste = (type: 'html' | 'css' | 'js') => (e: React.ClipboardEvent) => {
        const text = e.clipboardData.getData('text');
        if (text) {
            setPastedCodes(prev => ({ ...prev, [type]: text }));
        }
    };

    const handleApply = () => {
        onApplyCode(pastedCodes);
        onClose();
        setPastedCodes({ html: '', css: '', js: '' });
    };

    const hasAnyPaste = pastedCodes.html || pastedCodes.css || pastedCodes.js;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="✨ Buat Tema dengan AI"
            size={isFullScreen ? 'full' : 'xl'}
        >
            <div className="flex flex-col gap-4 text-sm text-gray-700 dark:text-gray-300 h-[75vh] min-h-[550px]">

                <section className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-lg shrink-0">
                    <h3 className="text-base font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                        🚀 Cara Kerja Auto-Convert AI
                    </h3>
                    <ol className="list-decimal pl-5 space-y-2 text-blue-900 dark:text-blue-200">
                        <li>Pilih <strong>Style</strong> dan salin <strong>Prompt</strong> di bawah ini.</li>
                        <li>Buka AI favorit Anda (Claude 3.5 Sonnet sangat disarankan, atau ChatGPT Plus).</li>
                        <li>Tempelkan prompt tersebut dan minta AI membuatkan tema undangan.</li>
                        <li><strong>Opsi 1:</strong> Unduh 3 file hasilnya dan unggah di sini.</li>
                        <li><strong>Opsi 2:</strong> Salin (Copy) kode dari AI dan <strong>Paste</strong> pada kotak di bawah ini.</li>
                    </ol>
                </section>

                <div className="flex gap-4 flex-1 min-h-0 relative">
                    {/* Left: Prompt (Main Area) */}
                    <section className={`flex flex-col min-h-0 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900 transition-all duration-300 flex-1 ${isFullScreen ? 'fixed inset-4 z-50 shadow-2xl' : ''}`}>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                📝 Prompt theme builder
                            </h3>
                            <div className="flex items-center gap-2">
                                <select 
                                    value={selectedStyleId}
                                    onChange={(e) => setSelectedStyleId(e.target.value)}
                                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] font-bold rounded px-2 py-1 focus:ring-1 focus:ring-gold-500 outline-none cursor-pointer"
                                >
                                    {THEME_STYLES.map(style => (
                                        <option key={style.id} value={style.id}>
                                            {style.icon} {style.name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleCopy}
                                    className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase rounded transition-all ${isCopied ? 'bg-green-500 text-white' : 'bg-gold-500 text-white hover:bg-gold-600'}`}
                                >
                                    {isCopied ? 'Copied!' : 'Copy Prompt'}
                                </button>
                                <button
                                    onClick={() => setIsFullScreen(!isFullScreen)}
                                    className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                                    title={isFullScreen ? 'Tutup Full Screen' : 'Full Screen Prompt'}
                                >
                                    {isFullScreen ? <HiOutlineX className="w-5 h-5" /> : <HiOutlineArrowsExpand className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 text-xs bg-white dark:bg-gray-950 ${isFullScreen ? 'text-base' : ''}`}>
                            <article className={`prose dark:prose-invert max-w-none ${isFullScreen ? 'prose-base' : 'prose-sm'}`}>
                                <ReactMarkdown remarkPlugins={[gfm]}>{FULL_PROMPT}</ReactMarkdown>
                            </article>
                        </div>
                    </section>

                    {/* Right: Paste Areas (Narrow Column) */}
                    <section className="flex flex-col gap-3 w-28 shrink-0 min-h-0">
                        <h3 className="font-bold text-[11px] text-gray-500 dark:text-gray-400 uppercase text-center shrink-0">
                            Paste Code
                        </h3>
                        
                        <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
                            {(['html', 'css', 'js'] as const).map(type => (
                                <div
                                    key={type}
                                    tabIndex={0}
                                    onPaste={handlePaste(type)}
                                    className={`relative aspect-square w-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-all cursor-pointer focus:ring-2 focus:ring-gold-500 focus:outline-none ${pastedCodes[type] ? 'border-green-500 bg-green-50/30 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gold-400 bg-white dark:bg-gray-800'}`}
                                >
                                    {pastedCodes[type] ? (
                                        <div className="flex flex-col items-center gap-1 animate-fade-in text-center p-1">
                                            <HiOutlineCheckCircle className="text-xl text-green-500" />
                                            <span className="text-[8px] font-bold uppercase text-green-600 truncate w-full px-1">{type} OK</span>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setPastedCodes(p => ({ ...p, [type]: '' })); }}
                                                className="text-[8px] text-gray-400 hover:text-red-500 underline"
                                            >Reset</button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 text-gray-400 group p-1 text-center">
                                            {type === 'html' ? <IoLogoHtml5 className="text-xl group-hover:text-orange-500 transition-colors" /> : 
                                             type === 'css' ? <IoLogoCss3 className="text-xl group-hover:text-blue-500 transition-colors" /> : 
                                             <IoLogoJavascript className="text-xl group-hover:text-yellow-500 transition-colors" />}
                                            <span className="text-[8px] font-bold uppercase">{type.toUpperCase()}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center mt-2">
                <button
                    onClick={onClose}
                    className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                    Tutup
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={onTriggerUpload}
                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-bold rounded-lg transition-all flex items-center gap-2"
                    >
                        <HiOutlineUpload className="text-lg" />
                        Upload File
                    </button>
                    <button
                        disabled={!hasAnyPaste}
                        onClick={handleApply}
                        className={`px-6 py-2.5 bg-gold-500 hover:bg-gold-600 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-50 disabled:grayscale`}
                    >
                        <HiOutlineLightningBolt className="text-lg" />
                        Konversi & Terapkan
                    </button>
                </div>
            </div>
        </Modal>
    );
}
