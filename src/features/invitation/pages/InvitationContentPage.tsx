import { useEffect, useState } from 'react';
import { invitationContentApi, tenantApi, themeApi } from '@/core/api/endpoints';
import { PageLoader } from '@/shared/components/Loading';
import type { InvitationContent, Theme } from '@/types';
import toast from 'react-hot-toast';
import {
    HiOutlineMap,
    HiOutlineUserGroup,
    HiOutlineShare,
    HiOutlineHeart,
    HiOutlineCreditCard,
    HiOutlineChatAlt2,
    HiOutlineSave,
    HiOutlineMusicNote,
    HiOutlinePlus,
    HiOutlineTrash,
    HiOutlineColorSwatch,
    HiOutlineExternalLink,
    HiOutlineLink,
    HiOutlineVideoCamera,
    HiOutlinePhotograph,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineChevronDown,
    HiOutlineX
} from 'react-icons/hi';
import type { TimelineItem } from '@/types';
import { useAuthStore } from '@/features/auth/store/authStore';
import { ProxyImage } from '@/shared/components/ProxyImage';
import { MapTutorialModal } from '../components/MapTutorialModal';
import { ImageUpload } from '@/shared/components/ImageUpload';
import { imageApi } from '@/core/api/imageApi';
import type { ImageRecord } from '@/types';

export const AccordionItem = ({ id, icon, iconBg, iconColor, title, children, isOpen, onToggle }: {
    id: string;
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    title: string;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: (id: string) => void;
}) => {
    return (
        <div className="card shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <button
                type="button"
                className="w-full flex items-center justify-between gap-3 text-left"
                onClick={() => onToggle(id)}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 ${iconBg} rounded-lg ${iconColor} flex-shrink-0`}>
                        {icon}
                    </div>
                    <h2 className="text-base font-semibold text-gray-800 dark:text-white">{title}</h2>
                </div>
                <HiOutlineChevronDown
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            {isOpen && (
                <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800 space-y-4 animate-fade-in">
                    {children}
                </div>
            )}
        </div>
    );
};

export function InvitationContentPage() {
    const [content, setContent] = useState<Partial<InvitationContent> | null>(null);
    const [themes, setThemes] = useState<Theme[]>([]);
    const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
    const [timelineItems, setTimelineItems] = useState<{ tanggal: string; judul: string; deskripsi: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { tenant } = useAuthStore();
    const [iframeKey, setIframeKey] = useState(0);
    const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set(['mempelai', 'acara', 'hadiah', 'teks', 'cerita']));
    const [currentStep, setCurrentStep] = useState(1);

    const steps = [
        { id: 1, title: 'Isi Konten', subTitle: 'Detail Informasi' },
        { id: 2, title: 'Galery', subTitle: 'Foto & Gambar' },
        { id: 3, title: 'Backsound & Streaming', subTitle: 'Media & Link' },
        { id: 4, title: 'Tema', subTitle: 'Pilih Desain' },
    ];

    const toggleAccordion = (id: string) => {
        setOpenAccordions(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Images State
    const [images, setImages] = useState<ImageRecord[]>([]);
    const [lightboxImageIndex, setLightboxImageIndex] = useState<number | null>(null);

    const openLightbox = (image: ImageRecord) => {
        const idx = images.findIndex(img => img.id === image.id);
        if (idx !== -1) setLightboxImageIndex(idx);
    };

    const handleNextImage = () => {
        if (lightboxImageIndex !== null) {
            setLightboxImageIndex((lightboxImageIndex + 1) % images.length);
        }
    };

    const handlePrevImage = () => {
        if (lightboxImageIndex !== null) {
            setLightboxImageIndex((lightboxImageIndex - 1 + images.length) % images.length);
        }
    };

    // Map Picker State
    const [showTutorialModal, setShowTutorialModal] = useState(false);

    useEffect(() => {
        fetchContent();
    }, []);

    // Helpers to normalize data from GAS backend
    // GAS returns "null" string for empty cells, and dates/times as ISO timestamps
    const sanitizeValue = (val: any): string => {
        if (val === null || val === undefined || val === 'null') return '';
        return String(val);
    };

    const parseApiDate = (val: any): string => {
        if (!val || val === 'null') return '';
        const str = String(val);
        // Already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
        // ISO timestamp like "+020521-02-01T17:00:00.000Z" or "2022-05-21T..."
        try {
            const d = new Date(str);
            if (!isNaN(d.getTime())) {
                const yyyy = d.getFullYear();
                if (yyyy > 9999 || yyyy < 1900) return ''; // Invalid year
                return `${yyyy}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
        } catch { /* fall through */ }
        return '';
    };

    const parseApiTime = (val: any): string => {
        if (!val || val === 'null') return '';
        const str = String(val);
        // Already in HH:mm format
        if (/^\d{2}:\d{2}$/.test(str)) return str;
        // ISO timestamp like "1899-12-30T00:18:48.000Z" — extract UTC time as HH:mm
        try {
            const d = new Date(str);
            if (!isNaN(d.getTime())) {
                return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
            }
        } catch { /* fall through */ }
        return '';
    };

    const fetchContent = async () => {
        const defaultOpeningText = "Kepada Yth\nBapak/Ibu/Saudara/i :";
        const defaultValues: Partial<InvitationContent> = {
            tanggal_akad: tenant?.wedding_date || '',
            flag_lokasi_akad_dan_resepsi_berbeda: false,
            akad_map: '',
            nama_lokasi_akad: '',
            keterangan_lokasi_akad: '',
            resepsi_map: '',
            nama_lokasi_resepsi: '',
            keterangan_lokasi_resepsi: '',
            flag_tampilkan_nama_orang_tua: true,
            nama_bapak_laki_laki: '',
            nama_ibu_laki_laki: '',
            nama_bapak_perempuan: '',
            nama_ibu_perempuan: '',
            flag_tampilkan_sosial_media_mempelai: false,
            account_media_sosial_laki_laki: '',
            account_media_sosial_perempuan: '',
            is_fitur_tamu_spesial: 'false',
            flag_pakai_live_streaming: 'false',
            link_live_streaming: '',
            platform_live_streaming: '',
            flag_pakai_timeline_kisah: 'false',
            timeline_kisah: '',
            tampilkan_amplop_online: true,
            nama_bank_1: '',
            nama_rekening_bank_1: '',
            nomor_rekening_bank_1: '',
            nama_bank_2: '',
            nama_rekening_bank_2: '',
            nomor_rekening_bank_2: '',
            custom_kalimat_1: '',
            custom_kalimat_2: '',
            custom_kalimat_3: '',
            custom_kalimat_4: '',
            flag_kirim_hadiah_offline: false,
            map_kirim_hadiah_offline: '',
            nama_lokasi_kirim_hadiah_offline: '',
            alamat_lokasi_kirim_hadiah_offline: '',
            flag_pakai_kalimat_pembuka_custom: false,
            kalimat_pembuka_undangan: defaultOpeningText,
            flag_pakai_kalimat_penutup_custom: false,
            kalimat_penutup_undangan: '',
            link_backsound_music: '',
            bride_name: tenant?.bride_name || '',
            groom_name: tenant?.groom_name || '',
            wedding_date: tenant?.wedding_date || '',
        };

        try {
            const [contentRes, themesRes, imagesRes] = await Promise.all([
                invitationContentApi.getContent(),
                themeApi.getThemes(),
                imageApi.getTenantImages()
            ]);

            if (themesRes.success) {
                setThemes(themesRes.data);
                if (tenant?.theme_id) setSelectedThemeId(tenant.theme_id);
            }

            if (imagesRes.success && imagesRes.data) {
                setImages(imagesRes.data);
            }

            if (contentRes.success && contentRes.data) {
                const response = contentRes;
                // Merge default values with backend data so no fields are completely undefined.
                const currentData = { ...defaultValues, ...response.data };

                // Sanitize null strings (GAS returns "null" for empty cells)
                for (const key of Object.keys(currentData) as Array<keyof typeof currentData>) {
                    const v = currentData[key];
                    if (typeof v === 'string' && v === 'null') {
                        (currentData as any)[key] = '';
                    }
                }

                // Convert date fields from ISO to YYYY-MM-DD for <input type="date">
                currentData.wedding_date = parseApiDate(currentData.wedding_date) || tenant?.wedding_date || '';
                currentData.tanggal_akad = parseApiDate(currentData.tanggal_akad) || tenant?.wedding_date || '';

                // Convert time fields from ISO to HH:mm for <input type="time">
                currentData.jam_awal_akad = parseApiTime(currentData.jam_awal_akad);
                currentData.jam_akhir_akad = parseApiTime(currentData.jam_akhir_akad);
                currentData.jam_awal_resepsi = parseApiTime(currentData.jam_awal_resepsi);
                currentData.jam_akhir_resepsi = parseApiTime(currentData.jam_akhir_resepsi);

                // Sanitize text fields that might be null/undefined
                currentData.keterangan_lokasi_resepsi = sanitizeValue(currentData.keterangan_lokasi_resepsi);
                currentData.keterangan_lokasi_akad = sanitizeValue(currentData.keterangan_lokasi_akad);

                // Ensure default opening text is applied if no custom text is set
                if (!getBool(currentData.flag_pakai_kalimat_pembuka_custom) && !currentData.kalimat_pembuka_undangan) {
                    currentData.kalimat_pembuka_undangan = defaultOpeningText;
                }

                setContent(currentData);
                parseTimeline(currentData.timeline_kisah);
            } else {
                // Initialize with default empty values if backend returns null completely
                setContent(defaultValues);
            }
        } catch (error: any) {
            console.error('Failed to fetch invitation content:', error);
            toast.error('Failed to load invitation content settings');
            // Ensure content is set to defaults even after error
            setContent(prev => prev ?? defaultValues);
        } finally {
            setLoading(false);
        }
    };

    const parseTimeline = (jsonString: any) => {
        try {
            if (jsonString) {
                const parsed = JSON.parse(jsonString);
                if (Array.isArray(parsed)) {
                    setTimelineItems(parsed as { tanggal: string; judul: string; deskripsi: string }[]);
                }
            }
        } catch (e) {
            console.error("Failed to parse timeline JSON:", e, jsonString);
        }
    };

    const handleSave = async () => {
        if (!content || !tenant) return;
        setSaving(true);
        try {
            // Update the string value before saving
            const payload = { ...content, timeline_kisah: JSON.stringify(timelineItems) };

            const contentRes = await invitationContentApi.updateContent(payload);

            // Save theme selection if changed
            if (selectedThemeId !== tenant.theme_id) {
                await tenantApi.updateTenant({
                    id: tenant.id,
                    theme_id: selectedThemeId || undefined
                });
                // We mutate tenant locally so it doesn't trigger another save loop if clicked again
                tenant.theme_id = selectedThemeId || undefined;
            }

            if (contentRes.success) {
                toast.success('Settings saved successfully');
                // Don't overwrite content state with response.data — the backend
                // may not return all fields (e.g. tenant-injected wedding_date,
                // time fields, resepsi location). The state already has the
                // correct data that was just saved.
                setIframeKey(prev => prev + 1); // Force iframe reload
            } else {
                toast.error(contentRes.message || 'Failed to save settings');
            }
        } catch (error: any) {
            console.error('Save error:', error);
            toast.error('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const updateField = (field: keyof InvitationContent, value: any) => {
        setContent(prev => prev ? { ...prev, [field]: value } : null);
    };

    // Safe boolean parsing since DB might return 'TRUE' or boolean true
    const getBool = (val: any) => String(val).toLowerCase() === 'true';

    if (loading || !content) return <PageLoader />;

    return (
        <div className="space-y-6 animate-fade-in w-full max-w-[1600px] mx-auto pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-white">Invitation Content Settings</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure exactly what to show on your digital invitation</p>
                </div>
                <div className="flex items-center gap-3">
                    {tenant?.domain_slug && (
                        <a
                            href={`${window.location.origin}${window.location.pathname}#/${tenant.domain_slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary flex items-center justify-center gap-2 px-6"
                        >
                            <HiOutlineExternalLink className="w-5 h-5" />
                            Open Invitation
                        </a>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary flex items-center justify-center gap-2 px-6"
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <HiOutlineSave className="w-5 h-5" />
                        )}
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">

                {/* LEFT PANE: Form Settings */}
                <div className="w-full lg:w-[70%] flex-shrink-0 flex flex-col gap-6 pb-20">
                    {/* Stepper Header */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            {steps.map((step, idx) => (
                                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                                    <div
                                        onClick={() => setCurrentStep(step.id)}
                                        className="flex flex-col items-center gap-2 cursor-pointer group"
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
                                                ${currentStep === step.id ? 'bg-gold-500 text-white ring-4 ring-gold-100 dark:ring-gold-900/30' :
                                                currentStep > step.id ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'}`}>
                                            {currentStep > step.id ? (
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : step.id}
                                        </div>
                                        <div className="hidden sm:flex flex-col items-center">
                                            <span className={`text-xs font-bold leading-none ${currentStep === step.id ? 'text-gold-600' : 'text-gray-500'}`}>{step.title}</span>
                                            <span className="text-[10px] text-gray-400 mt-1 font-medium">{step.subTitle}</span>
                                        </div>
                                    </div>
                                    {idx < steps.length - 1 && (
                                        <div className={`flex-1 h-0.5 mx-4 transition-colors duration-500 ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-100 dark:bg-gray-800'}`}></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Step Content Content */}
                    <div className="flex flex-col gap-6 animate-fade-in w-full min-h-[500px]">

                        {/* STEP 1: ISI KONTEN */}
                        {currentStep === 1 && (
                            <div className="space-y-6 animate-slide-up">
                                <AccordionItem id="mempelai" isOpen={openAccordions.has('mempelai')} onToggle={toggleAccordion} icon={<HiOutlineUserGroup className="w-5 h-5" />} iconBg="bg-rose-50 dark:bg-rose-900/20" iconColor="text-rose-600" title="Informasi Mempelai & Orang Tua">
                                    <div className="space-y-6">
                                        {/* ================= MEMPELAI UTAMA ================= */}
                                        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-4">
                                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Data Mempelai Utama</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="label-field">Nama Laki-laki (Groom)</label>
                                                    <input type="text" value={content.groom_name || ''} onChange={(e) => updateField('groom_name', e.target.value)} className="input-field" placeholder="e.g. Romeo" />
                                                </div>
                                                <div>
                                                    <label className="label-field">Nama Perempuan (Bride)</label>
                                                    <input type="text" value={content.bride_name || ''} onChange={(e) => updateField('bride_name', e.target.value)} className="input-field" placeholder="e.g. Juliet" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* ================= SOCIAL MEDIA ================= */}
                                        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Social Media Links</p>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded text-gold-500 focus:ring-gold-500"
                                                        checked={getBool(content.flag_tampilkan_sosial_media_mempelai)}
                                                        onChange={(e) => updateField('flag_tampilkan_sosial_media_mempelai', e.target.checked)}
                                                    />
                                                    <span className="text-xs font-medium text-gray-500">Tampilkan</span>
                                                </label>
                                            </div>
                                            {getBool(content.flag_tampilkan_sosial_media_mempelai) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                                                    <div>
                                                        <label className="label-field">Instagram Mempelai Pria</label>
                                                        <input type="text" value={content.account_media_sosial_laki_laki || ''} onChange={(e) => updateField('account_media_sosial_laki_laki', e.target.value)} className="input-field" prefix="@" />
                                                    </div>
                                                    <div>
                                                        <label className="label-field">Instagram Mempelai Wanita</label>
                                                        <input type="text" value={content.account_media_sosial_perempuan || ''} onChange={(e) => updateField('account_media_sosial_perempuan', e.target.value)} className="input-field" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* ================= PARENTS ================= */}
                                        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nama Orang Tua</p>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded text-gold-500 focus:ring-gold-500"
                                                        checked={getBool(content.flag_tampilkan_nama_orang_tua)}
                                                        onChange={(e) => updateField('flag_tampilkan_nama_orang_tua', e.target.checked)}
                                                    />
                                                    <span className="text-xs font-medium text-gray-500">Tampilkan</span>
                                                </label>
                                            </div>
                                            {getBool(content.flag_tampilkan_nama_orang_tua) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                                                    <div className="space-y-3">
                                                        <p className="text-xs font-bold text-gray-400 uppercase">Orang Tua Laki-laki</p>
                                                        <input type="text" value={content.nama_bapak_laki_laki || ''} onChange={(e) => updateField('nama_bapak_laki_laki', e.target.value)} className="input-field text-sm" placeholder="Nama Ayah" />
                                                        <input type="text" value={content.nama_ibu_laki_laki || ''} onChange={(e) => updateField('nama_ibu_laki_laki', e.target.value)} className="input-field text-sm" placeholder="Nama Ibu" />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <p className="text-xs font-bold text-gray-400 uppercase">Orang Tua Perempuan</p>
                                                        <input type="text" value={content.nama_bapak_perempuan || ''} onChange={(e) => updateField('nama_bapak_perempuan', e.target.value)} className="input-field text-sm" placeholder="Nama Ayah" />
                                                        <input type="text" value={content.nama_ibu_perempuan || ''} onChange={(e) => updateField('nama_ibu_perempuan', e.target.value)} className="input-field text-sm" placeholder="Nama Ibu" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </AccordionItem>

                                <AccordionItem id="acara" isOpen={openAccordions.has('acara')} onToggle={toggleAccordion} icon={<HiOutlineMap className="w-5 h-5" />} iconBg="bg-blue-50 dark:bg-blue-900/20" iconColor="text-blue-600" title="Alamat & Lokasi Acara">
                                    <div className="space-y-6">
                                        {/* ================= LOCATION SETTINGS ================= */}
                                        <div className="space-y-4">
                                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-gray-100 dark:border-gray-800">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 dark:bg-gray-900 dark:border-gray-700"
                                                    checked={getBool(content.flag_lokasi_akad_dan_resepsi_berbeda)}
                                                    onChange={(e) => updateField('flag_lokasi_akad_dan_resepsi_berbeda', e.target.checked)}
                                                />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Akad and Resepsi are at different locations</span>
                                            </label>

                                            {/* Event Dates & Times */}
                                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-4">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Wedding Schedule</p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="label-field">Tanggal Akad</label>
                                                        <input type="date" value={content.tanggal_akad || ''} onChange={(e) => updateField('tanggal_akad', e.target.value)} className="input-field" />
                                                    </div>
                                                    <div>
                                                        <label className="label-field">Tanggal Resepsi</label>
                                                        <input type="date" value={content.wedding_date || ''} onChange={(e) => updateField('wedding_date', e.target.value)} className="input-field" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-3">
                                                        <label className="label-field mb-0">Waktu Akad</label>
                                                        <div className="flex items-center gap-2">
                                                            <input type="time" value={content.jam_awal_akad || ''} onChange={(e) => updateField('jam_awal_akad', e.target.value)} className="input-field shadow-none" title="Start Time" />
                                                            <span className="text-gray-400">-</span>
                                                            <input type="time" value={content.jam_akhir_akad || ''} onChange={(e) => updateField('jam_akhir_akad', e.target.value)} className="input-field shadow-none" title="End Time" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label className="label-field mb-0">Waktu Resepsi</label>
                                                        <div className="flex items-center gap-2">
                                                            <input type="time" value={content.jam_awal_resepsi || ''} onChange={(e) => updateField('jam_awal_resepsi', e.target.value)} className="input-field shadow-none" title="Start Time" />
                                                            <span className="text-gray-400">-</span>
                                                            <input type="time" value={content.jam_akhir_resepsi || ''} onChange={(e) => updateField('jam_akhir_resepsi', e.target.value)} className="input-field shadow-none" title="End Time" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-3">
                                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Akad Location</p>
                                                    <div>
                                                        <label className="label-field">Nama Tempat</label>
                                                        <input type="text" value={content.nama_lokasi_akad || ''} onChange={(e) => updateField('nama_lokasi_akad', e.target.value)} className="input-field" placeholder="Masjid Raya / Hotel Grand..." />
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="label-field">Alamat & Info</label>
                                                            <textarea value={content.keterangan_lokasi_akad || ''} onChange={(e) => updateField('keterangan_lokasi_akad', e.target.value)} className="input-field min-h-[80px]" placeholder="Jl. Sudirman No 1..." />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <label className="label-field mb-0">Link Google Maps</label>
                                                                <button
                                                                    type="button"
                                                                    title="Buka Google Maps"
                                                                    onClick={() => window.open('https://www.google.com/maps', '_blank')}
                                                                    className="text-xs flex items-center gap-1 text-gold-600 hover:text-gold-700 font-medium bg-gold-50 px-2.5 py-1 rounded-md transition-colors"
                                                                >
                                                                    <HiOutlineMap className="w-3.5 h-3.5" /> Buka Google Maps
                                                                </button>
                                                            </div>
                                                            <input type="url" value={content.akad_map || ''} onChange={(e) => updateField('akad_map', e.target.value)} className="input-field" placeholder="https://maps.app.goo.gl/..." />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowTutorialModal(true)}
                                                                className="mt-2 text-[10px] inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg font-bold transition-all border border-blue-100/50 shadow-sm"
                                                            >
                                                                <HiOutlineVideoCamera className="w-3.5 h-3.5" /> Cara Ambil Titik Google Maps
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {getBool(content.flag_lokasi_akad_dan_resepsi_berbeda) && (
                                                    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-3">
                                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Resepsi Location</p>
                                                        <div>
                                                            <label className="label-field">Nama Tempat</label>
                                                            <input type="text" value={content.nama_lokasi_resepsi || ''} onChange={(e) => updateField('nama_lokasi_resepsi', e.target.value)} className="input-field" placeholder="Hotel Mulia..." />
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="label-field">Alamat & Info</label>
                                                                <textarea value={content.keterangan_lokasi_resepsi || ''} onChange={(e) => updateField('keterangan_lokasi_resepsi', e.target.value)} className="input-field min-h-[80px]" placeholder="Jl. Gatot Subroto No 5..." />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <label className="label-field mb-0">Link Google Maps</label>
                                                                    <button
                                                                        type="button"
                                                                        title="Buka Google Maps"
                                                                        onClick={() => window.open('https://www.google.com/maps', '_blank')}
                                                                        className="text-xs flex items-center gap-1 text-gold-600 hover:text-gold-700 font-medium bg-gold-50 px-2.5 py-1 rounded-md transition-colors"
                                                                    >
                                                                        <HiOutlineMap className="w-3.5 h-3.5" /> Buka Google Maps
                                                                    </button>
                                                                </div>
                                                                <input type="url" value={content.resepsi_map || ''} onChange={(e) => updateField('resepsi_map', e.target.value)} className="input-field" placeholder="https://maps.app.goo.gl/..." />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowTutorialModal(true)}
                                                                    className="mt-2 text-[10px] inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg font-bold transition-all border border-blue-100/50 shadow-sm"
                                                                >
                                                                    <HiOutlineVideoCamera className="w-3.5 h-3.5" /> Cara Ambil Titik Google Maps
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </AccordionItem>

                                <AccordionItem id="hadiah" isOpen={openAccordions.has('hadiah')} onToggle={toggleAccordion} icon={<HiOutlineCreditCard className="w-5 h-5" />} iconBg="bg-gold-50 dark:bg-gold-900/20" iconColor="text-gold-600" title="Hadiah & Alamat Kado">
                                    <div className="space-y-6">
                                        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-gray-100 dark:border-gray-800 w-fit">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 dark:bg-gray-900 dark:border-gray-700"
                                                checked={getBool(content.tampilkan_amplop_online)}
                                                onChange={(e) => updateField('tampilkan_amplop_online', e.target.checked)}
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable digital envelopes (Show bank accounts)</span>
                                        </label>

                                        {getBool(content.tampilkan_amplop_online) && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-3">
                                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Bank Account 1</p>
                                                    <div>
                                                        <label className="label-field">Nama Bank</label>
                                                        <input type="text" value={content.nama_bank_1 || ''} onChange={(e) => updateField('nama_bank_1', e.target.value)} className="input-field" />
                                                    </div>
                                                    <div>
                                                        <label className="label-field">Nama Rekening</label>
                                                        <input type="text" value={content.nama_rekening_bank_1 || ''} onChange={(e) => updateField('nama_rekening_bank_1', e.target.value)} className="input-field" />
                                                    </div>
                                                    <div>
                                                        <label className="label-field">Nomor Rekening</label>
                                                        <input type="text" value={content.nomor_rekening_bank_1 || ''} onChange={(e) => updateField('nomor_rekening_bank_1', e.target.value)} className="input-field font-mono" />
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-3">
                                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Bank Account 2 <span className="text-gray-400 font-normal">(Optional)</span></p>
                                                    <div>
                                                        <label className="label-field">Nama Bank</label>
                                                        <input type="text" value={content.nama_bank_2 || ''} onChange={(e) => updateField('nama_bank_2', e.target.value)} className="input-field" />
                                                    </div>
                                                    <div>
                                                        <label className="label-field">Nama Rekening</label>
                                                        <input type="text" value={content.nama_rekening_bank_2 || ''} onChange={(e) => updateField('nama_rekening_bank_2', e.target.value)} className="input-field" />
                                                    </div>
                                                    <div>
                                                        <label className="label-field">Nomor Rekening</label>
                                                        <input type="text" value={content.nomor_rekening_bank_2 || ''} onChange={(e) => updateField('nomor_rekening_bank_2', e.target.value)} className="input-field font-mono" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
                                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-gray-100 dark:border-gray-800 w-fit">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 dark:bg-gray-900 dark:border-gray-700"
                                                    checked={getBool(content.flag_kirim_hadiah_offline)}
                                                    onChange={(e) => updateField('flag_kirim_hadiah_offline', e.target.checked)}
                                                />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Terima Hadiah Fisik (Offline Gift Delivery)</span>
                                            </label>

                                            {getBool(content.flag_kirim_hadiah_offline) && (
                                                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-4 animate-fade-in">
                                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Alamat Pengiriman Hadiah</p>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="label-field">Nama Tempat / Penerima</label>
                                                            <input type="text" value={content.nama_lokasi_kirim_hadiah_offline || ''} onChange={(e) => updateField('nama_lokasi_kirim_hadiah_offline', e.target.value)} className="input-field" placeholder="Rumah Mempelai Wanita / Bpk. Sigit" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <label className="label-field mb-0">Link Google Maps (Pilihan)</label>
                                                                <button
                                                                    type="button"
                                                                    title="Buka Google Maps"
                                                                    onClick={() => window.open('https://www.google.com/maps', '_blank')}
                                                                    className="text-xs flex items-center gap-1 text-gold-600 hover:text-gold-700 font-medium bg-gold-50 px-2.5 py-1 rounded-md transition-colors"
                                                                >
                                                                    <HiOutlineMap className="w-3.5 h-3.5" /> Buka Google Maps
                                                                </button>
                                                            </div>
                                                            <input type="url" value={content.map_kirim_hadiah_offline || ''} onChange={(e) => updateField('map_kirim_hadiah_offline', e.target.value)} className="input-field" placeholder="https://maps.app.goo.gl/..." />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowTutorialModal(true)}
                                                                className="mt-2 text-[10px] inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg font-bold transition-all border border-blue-100/50 shadow-sm"
                                                            >
                                                                <HiOutlineVideoCamera className="w-3.5 h-3.5" /> Cara Ambil Titik Google Maps
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="label-field">Alamat Lengkap (Beserta Kodepos & Detail Patokan)</label>
                                                        <textarea value={content.alamat_lokasi_kirim_hadiah_offline || ''} onChange={(e) => updateField('alamat_lokasi_kirim_hadiah_offline', e.target.value)} className="input-field min-h-[80px]" placeholder="Jl. Sudirman No. 10 (Samping Warung Pak RT), Kodepos 12345..." />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </AccordionItem>

                                <AccordionItem id="cerita" isOpen={openAccordions.has('cerita')} onToggle={toggleAccordion} icon={<HiOutlineHeart className="w-5 h-5" />} iconBg="bg-rose-50 dark:bg-rose-900/20" iconColor="text-rose-600" title="Cerita Cinta / Love Story">
                                    <div className="space-y-4">
                                        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-gray-100 dark:border-gray-800">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 dark:bg-gray-900 dark:border-gray-700"
                                                checked={getBool(content.flag_pakai_timeline_kisah)}
                                                onChange={(e) => updateField('flag_pakai_timeline_kisah', e.target.checked)}
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Include your love story timeline</span>
                                        </label>

                                        {getBool(content.flag_pakai_timeline_kisah) && (
                                            <div className="pt-4 space-y-4 border-t border-gray-100 dark:border-gray-800">
                                                {timelineItems.map((item, idx) => (
                                                    <div key={idx} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 relative group space-y-3">
                                                        <button
                                                            onClick={() => setTimelineItems(prev => prev.filter((_, i) => i !== idx))}
                                                            className="absolute top-3 right-3 text-gray-400 hover:text-red-500 bg-white dark:bg-gray-900 rounded p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Remove story"
                                                        >
                                                            <HiOutlineTrash className="w-4 h-4" />
                                                        </button>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="label-field text-xs">Tanggal</label>
                                                                <input type="date" value={item.tanggal} onChange={(e) => {
                                                                    const newArr = [...timelineItems];
                                                                    newArr[idx].tanggal = e.target.value;
                                                                    setTimelineItems(newArr);
                                                                }} className="input-field text-sm" />
                                                            </div>
                                                            <div>
                                                                <label className="label-field text-xs">Judul</label>
                                                                <input type="text" value={item.judul} onChange={(e) => {
                                                                    const newArr = [...timelineItems];
                                                                    newArr[idx].judul = e.target.value;
                                                                    setTimelineItems(newArr);
                                                                }} className="input-field text-sm" placeholder="First Meet" />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="label-field text-xs">Deskripsi</label>
                                                            <textarea value={item.deskripsi} onChange={(e) => {
                                                                const newArr = [...timelineItems];
                                                                newArr[idx].deskripsi = e.target.value;
                                                                setTimelineItems(newArr);
                                                            }} className="input-field min-h-[60px] text-sm" placeholder="We first met at..." />
                                                        </div>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => setTimelineItems(prev => [...prev, { tanggal: '', judul: '', deskripsi: '' }])}
                                                    className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-500 hover:text-gold-500 hover:border-gold-300 dark:hover:border-gold-700 hover:bg-gold-50 dark:hover:bg-gold-900/10 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <HiOutlinePlus className="w-4 h-4" />
                                                    Add Story Event
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </AccordionItem>

                                <AccordionItem id="teks" isOpen={openAccordions.has('teks')} onToggle={toggleAccordion} icon={<HiOutlineChatAlt2 className="w-5 h-5" />} iconBg="bg-pink-50 dark:bg-pink-900/20" iconColor="text-pink-600" title="Custom Texts & Opening">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                            <div className="space-y-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input type="checkbox" className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 dark:bg-gray-900 dark:border-gray-700" checked={getBool(content.flag_pakai_kalimat_pembuka_custom)} onChange={(e) => updateField('flag_pakai_kalimat_pembuka_custom', e.target.checked)} />
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Use Custom Opening Text</span>
                                                </label>
                                                {getBool(content.flag_pakai_kalimat_pembuka_custom) && (
                                                    <textarea value={content.kalimat_pembuka_undangan || ''} onChange={(e) => updateField('kalimat_pembuka_undangan', e.target.value)} className="input-field min-h-[80px]" placeholder="Bismillah... Dengan memohon rahmat Allah..." />
                                                )}
                                            </div>
                                            <div className="space-y-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input type="checkbox" className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 dark:bg-gray-900 dark:border-gray-700" checked={getBool(content.flag_pakai_kalimat_penutup_custom)} onChange={(e) => updateField('flag_pakai_kalimat_penutup_custom', e.target.checked)} />
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Use Custom Closing Text</span>
                                                </label>
                                                {getBool(content.flag_pakai_kalimat_penutup_custom) && (
                                                    <textarea value={content.kalimat_penutup_undangan || ''} onChange={(e) => updateField('kalimat_penutup_undangan', e.target.value)} className="input-field min-h-[80px]" placeholder="Merupakan suatu kehormatan..." />
                                                )}
                                            </div>
                                            <div>
                                                <label className="label-field">Kutipan (Teks Kustom 1)</label>
                                                <textarea value={content.custom_kalimat_1 || ''} onChange={(e) => updateField('custom_kalimat_1', e.target.value)} className="input-field min-h-[80px]" placeholder="e.g. And of His signs is that He created for you..." />
                                            </div>
                                            <div>
                                                <label className="label-field">Teks Sambutan (Teks Kustom 2)</label>
                                                <textarea value={content.custom_kalimat_2 || ''} onChange={(e) => updateField('custom_kalimat_2', e.target.value)} className="input-field min-h-[80px]" placeholder="e.g. It is a joy and privilege to invite you..." />
                                            </div>
                                            <div>
                                                <label className="label-field">Protokol / Teks Kesehatan (Teks Kustom 3)</label>
                                                <textarea value={content.custom_kalimat_3 || ''} onChange={(e) => updateField('custom_kalimat_3', e.target.value)} className="input-field min-h-[80px]" placeholder="e.g. Please follow health protocols..." />
                                            </div>
                                            <div>
                                                <label className="label-field">Teks Tambahan Footer (Teks Kustom 4)</label>
                                                <textarea value={content.custom_kalimat_4 || ''} onChange={(e) => updateField('custom_kalimat_4', e.target.value)} className="input-field min-h-[80px]" placeholder="e.g. Your presence is the best gift for us." />
                                            </div>
                                        </div>
                                    </div>
                                </AccordionItem>
                            </div>
                        )}

                        {/* STEP 2: GALERY */}
                        {currentStep === 2 && (
                            <div className="space-y-6 animate-slide-up">
                                <div className="card p-6 border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600">
                                            <HiOutlinePhotograph className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Galeri & Foto Undangan</h2>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-6">Upload gambar sesuai kebutuhan variabel tema yang Anda pilih.</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {(() => {
                                            const activeTheme = themes.find(t => t.id === selectedThemeId);
                                            const typesList = (activeTheme?.image_types && activeTheme.image_types.length > 0)
                                                ? activeTheme.image_types
                                                : ['hero_cover', 'groom_photo', 'bride_photo', 'gallery', 'story_photo', 'cover', 'closing'];

                                            return (
                                                <>
                                                    {typesList.filter(t => t !== 'gallery').map(type => {
                                                        const currentImg = images.find(img => img.image_type === type);
                                                        return (
                                                            <div key={type} className="relative">
                                                                <ImageUpload
                                                                    imageType={type}
                                                                    title={type.replace(/_/g, ' ')}
                                                                    description=""
                                                                    aspectRatio="square"
                                                                    currentImage={currentImg}
                                                                    onUploadSuccess={(img) => setImages(prev => [...prev.filter(i => i.image_type !== type), img])}
                                                                    onDeleteSuccess={(id) => setImages(prev => prev.filter(i => i.id !== id))}
                                                                    onClick={openLightbox}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                    {typesList.includes('gallery') && (
                                                        <div className="col-span-full mt-6 border-t border-gray-100 dark:border-gray-800 pt-6">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h3 className="text-md font-semibold text-gray-800 dark:text-white">Foto Album (Multi Image)</h3>
                                                                {(() => {
                                                                    const maxGallery = tenant?.plan_type === 'premium' ? 15 : tenant?.plan_type === 'pro' ? 10 : 5;
                                                                    const currentCount = images.filter(img => img.image_type === 'gallery').length;
                                                                    return (
                                                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${currentCount >= maxGallery ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30'}`}>
                                                                            {currentCount} / {maxGallery} Foto (Paket {tenant?.plan_type || 'basic'})
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </div>
                                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                                                {images.filter(img => img.image_type === 'gallery').map(img => (
                                                                    <div key={img.id} className="relative group">
                                                                        <ImageUpload
                                                                            imageType="gallery"
                                                                            title={`Gallery`}
                                                                            currentImage={img}
                                                                            onUploadSuccess={() => { }}
                                                                            onDeleteSuccess={(id) => setImages(prev => prev.filter(i => i.id !== id))}
                                                                            onClick={openLightbox}
                                                                            aspectRatio="square"
                                                                        />
                                                                    </div>
                                                                ))}
                                                                {(() => {
                                                                    const maxGallery = tenant?.plan_type === 'premium' ? 15 : tenant?.plan_type === 'pro' ? 10 : 5;
                                                                    const currentCount = images.filter(img => img.image_type === 'gallery').length;
                                                                    const remainingCount = maxGallery - currentCount;
                                                                    return currentCount < maxGallery ? (
                                                                        <ImageUpload
                                                                            imageType="gallery"
                                                                            title="Tambah Foto Album"
                                                                            allowMultiple={true}
                                                                            maxFiles={remainingCount}
                                                                            onUploadSuccess={(img) => setImages(prev => [...prev.filter(i => i.id !== img.id), img])}
                                                                            onDeleteSuccess={() => { }}
                                                                            aspectRatio="square"
                                                                        />
                                                                    ) : null;
                                                                })()}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 3 && (
                            <div className="space-y-6 animate-slide-up">
                                {/* SECTION: MEDIA & AUDIO */}
                                <div className="card p-6 border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                                            <HiOutlineMusicNote className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Music Background</h2>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="label-field">Link Musik Latar (URL YouTube)</label>
                                        <input type="text" autoComplete="off" value={content.link_backsound_music || ''} onChange={(e) => updateField('link_backsound_music', e.target.value)} className="input-field" placeholder="https://youtube.com/watch?v=..." />
                                        <p className="text-[10px] text-gray-400 mt-1">Gunakan link full URL dari YouTube</p>
                                    </div>
                                </div>

                                {/* SECTION: LIVE STREAMING */}
                                <div className="card p-6 border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500">
                                            <HiOutlineVideoCamera className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Live Streaming</h2>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-gray-100 dark:border-gray-800">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 dark:bg-gray-900 dark:border-gray-700"
                                                checked={getBool(content.flag_pakai_live_streaming)}
                                                onChange={(e) => updateField('flag_pakai_live_streaming', e.target.checked)}
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Aktifkan Fitur Live Streaming</span>
                                        </label>

                                        {getBool(content.flag_pakai_live_streaming) && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                                                <div>
                                                    <label className="label-field">Platform (misal: YouTube, Zoom)</label>
                                                    <input type="text" autoComplete="off" value={content.platform_live_streaming || ''} onChange={(e) => updateField('platform_live_streaming', e.target.value)} className="input-field" placeholder="YouTube" />
                                                </div>
                                                <div>
                                                    <label className="label-field">Link Live Streaming / URL Meeting</label>
                                                    <input type="url" autoComplete="off" value={content.link_live_streaming || ''} onChange={(e) => updateField('link_live_streaming', e.target.value)} className="input-field" placeholder="https://..." />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: TEMA */}
                        {currentStep === 4 && (
                            <div className="space-y-6 animate-slide-up">
                                <div className="card p-6 border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600">
                                            <HiOutlineColorSwatch className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Pilih Tema Undangan</h2>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {(() => {
                                            const filteredThemes = themes.filter(theme => {
                                                // Filter out drafts
                                                const isDraft = typeof theme.flag_draft === 'boolean' ? theme.flag_draft : String(theme.flag_draft).toLowerCase() === 'true';
                                                if (isDraft) return false;

                                                // Filter based on plan type
                                                if (!tenant) return false;
                                                if (tenant.plan_type === 'premium') return true;
                                                if (tenant.plan_type === 'pro') return theme.plan_type === 'basic' || theme.plan_type === 'pro';
                                                return theme.plan_type === 'basic';
                                            });

                                            if (filteredThemes.length === 0) {
                                                return <p className="text-gray-500 text-sm">Belum ada tema yang tersedia untuk plan {tenant?.plan_type}.</p>;
                                            }

                                            return filteredThemes.map(theme => (
                                                <div
                                                    key={theme.id}
                                                    onClick={() => setSelectedThemeId(theme.id)}
                                                    className={`cursor-pointer rounded-xl border-2 transition-all duration-200 overflow-hidden group 
                                                            ${selectedThemeId === theme.id ? 'border-gold-500 shadow-lg shadow-gold-500/20 transform -translate-y-1' : 'border-gray-200 dark:border-gray-700 hover:border-gold-300 dark:hover:border-gold-700'}`}
                                                >
                                                    <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 relative">
                                                        {theme.preview_image ? (
                                                            <ProxyImage 
                                                                src={theme.preview_image} 
                                                                alt={theme.name} 
                                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                                <HiOutlineColorSwatch className="w-12 h-12 opacity-50" />
                                                            </div>
                                                        )}
                                                        {selectedThemeId === theme.id && (
                                                            <div className="absolute inset-0 bg-gold-500/10 flex items-center justify-center">
                                                                <div className="bg-gold-500 text-white p-2 rounded-full shadow-lg">
                                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                                                        <h3 className="font-semibold text-gray-800 dark:text-white truncate">{theme.name}</h3>
                                                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded 
                                                            ${theme.plan_type === 'basic' ? 'bg-gray-100 text-gray-600' :
                                                                theme.plan_type === 'pro' ? 'bg-blue-100 text-blue-600' :
                                                                    'bg-gold-100 text-gold-600'}`}>
                                                            {theme.plan_type}
                                                        </span>
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Navigation Footer */}
                    <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mt-auto">
                        <button
                            type="button"
                            disabled={currentStep === 1}
                            onClick={() => setCurrentStep(prev => prev - 1)}
                            className={`btn-secondary flex items-center gap-2 px-6 ${currentStep === 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                            <HiOutlineChevronLeft className="w-5 h-5" />
                            Sebelumnya
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (currentStep < 4) setCurrentStep(prev => prev + 1);
                                else handleSave();
                            }}
                            className="btn-primary flex items-center gap-2 px-8"
                        >
                            {currentStep < 4 ? (
                                <>
                                    Selanjutnya
                                    <HiOutlineChevronRight className="w-5 h-5" />
                                </>
                            ) : (
                                <>
                                    {saving ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <HiOutlineSave className="w-5 h-5" />
                                    )}
                                    {saving ? 'Menyimpan...' : 'Simpan Settings'}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* RIGHT PANE: Live Preview */}
                <div className="w-full lg:w-[30%] hidden lg:flex flex-col items-center border-l border-gray-100 dark:border-gray-800 lg:pl-6 sticky top-24 h-[calc(100vh-6rem)] overflow-hidden">
                    {/* <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Live Preview</h3> */}

                    {/* Device Frame */}
                    <div
                        className="relative mx-auto w-[380px] bg-black rounded-[2.5rem] border-[8px] border-gray-900 shadow-2xl overflow-hidden flex flex-col"
                        style={{ height: 'calc(99% - 12rem)', position: 'fixed' }}
                    >

                        {/* Notch / Dynamic Island */}
                        <div className="absolute top-0 inset-x-0 h-6 flex justify-center items-start z-50 pointer-events-none">
                            <div className="w-32 h-6 bg-black rounded-b-2xl relative">
                                <div className="absolute top-1/2 left-4 w-2 h-2 rounded-full bg-gray-800 border border-gray-700"></div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-1.5 rounded-full bg-gray-800 border border-gray-700"></div>
                            </div>
                        </div>

                        {/* Power Button (Simulated on side) */}
                        <div className="absolute top-24 -right-2.5 w-1.5 h-12 bg-gray-800 rounded-l-md z-0 hidden"></div>

                        {/* Screen Content Wrapper */}
                        <div className="w-full flex-grow relative bg-white dark:bg-gray-950 overflow-y-auto custom-scrollbar no-scrollbar scroll-smooth" id="preview-scroll-container">
                            {tenant?.domain_slug ? (
                                <iframe
                                    style={{ zoom: '0.8' }}
                                    key={iframeKey}
                                    src={`${window.location.origin}${import.meta.env.BASE_URL}#/${tenant.domain_slug}`}
                                    className="w-full h-full border-none pointer-events-auto"
                                    title="Invitation Preview"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm text-center px-6">
                                    Domain slug not set. Update tenant settings first.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {showTutorialModal && (
                <MapTutorialModal
                    isOpen={showTutorialModal}
                    onClose={() => setShowTutorialModal(false)}
                />
            )}

            {/* LIGHTBOX MODAL */}
            {lightboxImageIndex !== null && images[lightboxImageIndex] && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in p-4 lg:p-12">
                    {/* Close Button */}
                    <button
                        onClick={() => setLightboxImageIndex(null)}
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-white/20 rounded-full transition-colors z-10"
                    >
                        <HiOutlineX className="w-6 h-6" />
                    </button>

                    {/* Navigation - Prev */}
                    {images.length > 1 && (
                        <button
                            onClick={handlePrevImage}
                            className="absolute left-2 lg:left-8 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-white/20 rounded-full transition-colors z-10"
                        >
                            <HiOutlineChevronLeft className="w-6 h-6 lg:w-8 lg:h-8" />
                        </button>
                    )}

                    {/* Navigation - Next */}
                    {images.length > 1 && (
                        <button
                            onClick={handleNextImage}
                            className="absolute right-2 lg:right-8 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-white/20 rounded-full transition-colors z-10"
                        >
                            <HiOutlineChevronRight className="w-6 h-6 lg:w-8 lg:h-8" />
                        </button>
                    )}

                    {/* Main Image */}
                    <div className="w-full max-w-5xl max-h-full flex flex-col items-center justify-center pointer-events-none">
                        <ProxyImage
                            src={images[lightboxImageIndex].cdn_url || images[lightboxImageIndex].drive_url}
                            alt={images[lightboxImageIndex].file_name}
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl pointer-events-auto"
                        />
                        <p className="text-white/60 text-xs lg:text-sm mt-4 font-medium px-4 text-center">
                            {images[lightboxImageIndex].file_name}
                            <span className="opacity-50 ml-2">({images[lightboxImageIndex].width}x{images[lightboxImageIndex].height} - {images[lightboxImageIndex].size_kb} KB)</span>
                        </p>
                    </div>
                </div>
            )}

        </div>
    );
}
