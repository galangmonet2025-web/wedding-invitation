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
    HiOutlineExternalLink
} from 'react-icons/hi';
import type { TimelineItem } from '@/types';
import { useAuthStore } from '@/features/auth/store/authStore';
import { MapPickerModal } from '../components/MapPickerModal';

export function InvitationContentPage() {
    const [content, setContent] = useState<Partial<InvitationContent> | null>(null);
    const [themes, setThemes] = useState<Theme[]>([]);
    const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
    const [timelineItems, setTimelineItems] = useState<{ tanggal: string; judul: string; deskripsi: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { tenant } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'tema' | 'mempelai' | 'acara' | 'cerita' | 'hadiah'>('tema');
    const [iframeKey, setIframeKey] = useState(0);

    // Map Picker State
    const [showMapModal, setShowMapModal] = useState(false);
    const [mapTarget, setMapTarget] = useState<'akad' | 'resepsi' | null>(null);

    useEffect(() => {
        fetchContent();
    }, []);

    const handleMapConfirm = (data: { placeName: string; address: string; mapsUrl: string }) => {
        if (!mapTarget || !content) return;

        setContent(prev => {
            if (!prev) return prev;
            if (mapTarget === 'akad') {
                return {
                    ...prev,
                    nama_lokasi_akad: data.placeName,
                    keterangan_lokasi_akad: data.address,
                    akad_map: data.mapsUrl
                };
            } else {
                return {
                    ...prev,
                    nama_lokasi_resepsi: data.placeName,
                    keterangan_lokasi_resepsi: data.address,
                    resepsi_map: data.mapsUrl
                };
            }
        });
    };

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
            flag_pakai_timeline_kisah: false,
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
            const [contentRes, themesRes] = await Promise.all([
                invitationContentApi.getContent(),
                themeApi.getThemes()
            ]);

            if (themesRes.success) {
                setThemes(themesRes.data);
                if (tenant?.theme_id) setSelectedThemeId(tenant.theme_id);
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

    const tabs = [
        { id: 'tema', label: 'Pilih Tema', icon: HiOutlineColorSwatch },
        { id: 'mempelai', label: 'Mempelai & Keluarga', icon: HiOutlineUserGroup },
        { id: 'acara', label: 'Teks & Acara', icon: HiOutlineMap },
        { id: 'cerita', label: 'Cerita Cinta', icon: HiOutlineHeart },
        { id: 'hadiah', label: 'Amplop Digital', icon: HiOutlineCreditCard },
    ];

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
                            href={`${window.location.origin}${window.location.pathname}#/invitation/${tenant.domain_slug}`}
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
                <div className="w-full lg:w-[60%] flex-shrink-0 flex flex-col gap-6 pb-20">

                    {/* Tabs Navigation */}
                    <div className="overflow-x-auto custom-scrollbar border-b border-gray-200 dark:border-gray-800 pb-px">
                        <div className="flex w-max min-w-full gap-2">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as 'tema' | 'mempelai' | 'acara' | 'cerita' | 'hadiah')}
                                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-xl transition-all duration-200 mb-[-1px] ${activeTab === tab.id
                                        ? 'text-gold-600 bg-white dark:bg-gray-900 border-t border-l border-r border-gray-200 dark:border-gray-800 shadow-[0_-2px_6px_rgba(0,0,0,0.02)]'
                                        : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-t border-l border-r border-transparent'
                                        }`}
                                >
                                    <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-gold-500' : 'text-gray-400'}`} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 animate-fade-in">

                        {/* TAB 0: TEMA */}
                        {activeTab === 'tema' && (
                            <div className="card space-y-4 shadow-sm border border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600">
                                        <HiOutlineColorSwatch className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Pilih Tema Undangan</h2>
                                </div>
                                <div className="pt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
                                    {themes.length === 0 ? (
                                        <p className="text-gray-500 text-sm">Belum ada tema yang tersedia.</p>
                                    ) : (
                                        themes.map(theme => (
                                            <div
                                                key={theme.id}
                                                onClick={() => setSelectedThemeId(theme.id)}
                                                className={`cursor-pointer rounded-xl border-2 transition-all duration-200 overflow-hidden group 
                                                    ${selectedThemeId === theme.id ? 'border-gold-500 shadow-lg shadow-gold-500/20 transform -translate-y-1' : 'border-gray-200 dark:border-gray-700 hover:border-gold-300 dark:hover:border-gold-700'}`}
                                            >
                                                <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 relative">
                                                    {theme.preview_image ? (
                                                        <img src={theme.preview_image} alt={theme.name} className="w-full h-full object-cover" />
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
                                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider
                                                    ${theme.plan_type === 'free' ? 'bg-gray-100 text-gray-600' :
                                                            theme.plan_type === 'pro' ? 'bg-blue-100 text-blue-600' :
                                                                'bg-purple-100 text-purple-600'}`}>
                                                        {theme.plan_type}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 1: MEMPELAI & KELUARGA */}
                        {activeTab === 'mempelai' && (
                            <>
                                {/* ================= MEMPELAI UTAMA ================= */}
                                <div className="card space-y-4 shadow-sm border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                                        <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg text-rose-600">
                                            <HiOutlineHeart className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Data Mempelai Utama</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 animate-fade-in">
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
                                <div className="card space-y-4 shadow-sm border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                                        <div className="p-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg text-pink-600">
                                            <HiOutlineShare className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Social Media Links</h2>
                                    </div>

                                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-gray-100 dark:border-gray-800">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 dark:bg-gray-900 dark:border-gray-700"
                                            checked={getBool(content.flag_tampilkan_sosial_media_mempelai)}
                                            onChange={(e) => updateField('flag_tampilkan_sosial_media_mempelai', e.target.checked)}
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show social media accounts</span>
                                    </label>

                                    {getBool(content.flag_tampilkan_sosial_media_mempelai) && (


                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="label-field">Groom's Instagram (e.g. @username)</label>
                                                    <input
                                                        type="text"
                                                        value={content.account_media_sosial_laki_laki || ''}
                                                        onChange={(e) => updateField('account_media_sosial_laki_laki', e.target.value)}
                                                        className="input-field"
                                                        prefix="@"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <label className="label-field">Bride's Instagram (e.g. @username)</label>
                                                    <input
                                                        type="text"
                                                        value={content.account_media_sosial_perempuan || ''}
                                                        onChange={(e) => updateField('account_media_sosial_perempuan', e.target.value)}
                                                        className="input-field"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ================= PARENTS SETTINGS ================= */}
                                <div className="card space-y-4 shadow-sm border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600">
                                            <HiOutlineUserGroup className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Parents Information</h2>
                                    </div>

                                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-gray-100 dark:border-gray-800">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 dark:bg-gray-900 dark:border-gray-700"
                                            checked={getBool(content.flag_tampilkan_nama_orang_tua)}
                                            onChange={(e) => updateField('flag_tampilkan_nama_orang_tua', e.target.checked)}
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show parents' names on invitation</span>
                                    </label>

                                    {getBool(content.flag_tampilkan_nama_orang_tua) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 animate-fade-in">
                                            <div className="space-y-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Groom's Parents</p>
                                                <div>
                                                    <label className="label-field text-xs">Father Name</label>
                                                    <input type="text" value={content.nama_bapak_laki_laki || ''} onChange={(e) => updateField('nama_bapak_laki_laki', e.target.value)} className="input-field text-sm" />
                                                </div>
                                                <div>
                                                    <label className="label-field text-xs">Mother Name</label>
                                                    <input type="text" value={content.nama_ibu_laki_laki || ''} onChange={(e) => updateField('nama_ibu_laki_laki', e.target.value)} className="input-field text-sm" />
                                                </div>
                                            </div>
                                            <div className="space-y-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Bride's Parents</p>
                                                <div>
                                                    <label className="label-field text-xs">Father Name</label>
                                                    <input type="text" value={content.nama_bapak_perempuan || ''} onChange={(e) => updateField('nama_bapak_perempuan', e.target.value)} className="input-field text-sm" />
                                                </div>
                                                <div>
                                                    <label className="label-field text-xs">Mother Name</label>
                                                    <input type="text" value={content.nama_ibu_perempuan || ''} onChange={(e) => updateField('nama_ibu_perempuan', e.target.value)} className="input-field text-sm" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>


                            </>
                        )}

                        {/* TAB 2: TEKS & ACARA (Loca & Text) */}
                        {activeTab === 'acara' && (
                            <>
                                {/* ================= LOCATION SETTINGS ================= */}
                                <div className="card space-y-4 shadow-sm border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                                            <HiOutlineMap className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Location Maps</h2>
                                    </div>

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
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="label-field">Tanggal Akad</label>
                                                    <input type="date" value={content.tanggal_akad || ''} onChange={(e) => updateField('tanggal_akad', e.target.value)} className="input-field" />
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <label className="label-field">Tanggal Resepsi</label>
                                                    <input type="date" value={content.wedding_date || ''} onChange={(e) => updateField('wedding_date', e.target.value)} className="input-field" />
                                                </div>
                                            </div>
                                        </div>


                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <label className="label-field mb-0">Akad Time</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="time" value={content.jam_awal_akad || ''} onChange={(e) => updateField('jam_awal_akad', e.target.value)} className="input-field shadow-none" title="Start Time" />
                                                    <span className="text-gray-400">-</span>
                                                    <input type="time" value={content.jam_akhir_akad || ''} onChange={(e) => updateField('jam_akhir_akad', e.target.value)} className="input-field shadow-none" title="End Time" />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="label-field mb-0">Resepsi Time</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="time" value={content.jam_awal_resepsi || ''} onChange={(e) => updateField('jam_awal_resepsi', e.target.value)} className="input-field shadow-none" title="Start Time" />
                                                    <span className="text-gray-400">-</span>
                                                    <input type="time" value={content.jam_akhir_resepsi || ''} onChange={(e) => updateField('jam_akhir_resepsi', e.target.value)} className="input-field shadow-none" title="End Time" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-2">
                                        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-3">
                                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Akad Location</p>
                                            <div>
                                                <label className="label-field">Venue Name</label>
                                                <input type="text" value={content.nama_lokasi_akad || ''} onChange={(e) => updateField('nama_lokasi_akad', e.target.value)} className="input-field" placeholder="Masjid Raya / Hotel Grand..." />
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="label-field mb-0">Link Google Maps</label>
                                                    <button
                                                        title="buka map"
                                                        onClick={() => {
                                                            setMapTarget('akad');
                                                            setShowMapModal(true);
                                                        }}
                                                        className="text-xs flex items-center gap-1 text-gold-600 hover:text-gold-700 font-medium bg-gold-50 px-2.5 py-1 rounded-md transition-colors"
                                                    >
                                                        <HiOutlineMap className="w-3.5 h-3.5" /> Pilih dari Peta
                                                    </button>
                                                </div>
                                                <input type="url" value={content.akad_map || ''} onChange={(e) => updateField('akad_map', e.target.value)} className="input-field" placeholder="https://maps.app.goo.gl/..." />
                                            </div>
                                            <div>
                                                <label className="label-field">Address & Info</label>
                                                <textarea value={content.keterangan_lokasi_akad || ''} onChange={(e) => updateField('keterangan_lokasi_akad', e.target.value)} className="input-field min-h-[60px]" placeholder="Jl. Sudirman No 1..." />
                                            </div>
                                        </div>

                                        {getBool(content.flag_lokasi_akad_dan_resepsi_berbeda) && (
                                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-3 animate-fade-in">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Resepsi Location</p>
                                                <div>
                                                    <label className="label-field">Venue Name</label>
                                                    <input type="text" value={content.nama_lokasi_resepsi || ''} onChange={(e) => updateField('nama_lokasi_resepsi', e.target.value)} className="input-field" placeholder="Hotel Mulia..." />
                                                </div>
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <label className="label-field mb-0">Link Google Maps</label>
                                                        <button
                                                            title="buka map"
                                                            onClick={() => {
                                                                setMapTarget('resepsi');
                                                                setShowMapModal(true);
                                                            }}
                                                            className="text-xs flex items-center gap-1 text-gold-600 hover:text-gold-700 font-medium bg-gold-50 px-2.5 py-1 rounded-md transition-colors"
                                                        >
                                                            <HiOutlineMap className="w-3.5 h-3.5" /> Pilih dari Peta
                                                        </button>
                                                    </div>
                                                    <input type="url" value={content.resepsi_map || ''} onChange={(e) => updateField('resepsi_map', e.target.value)} className="input-field" placeholder="https://maps.app.goo.gl/..." />
                                                </div>
                                                <div>
                                                    <label className="label-field">Address & Info</label>
                                                    <textarea value={content.keterangan_lokasi_resepsi || ''} onChange={(e) => updateField('keterangan_lokasi_resepsi', e.target.value)} className="input-field min-h-[60px]" placeholder="Jl. Gatot Subroto No 5..." />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ================= CUSTOM TEXTS ================= */}
                                <div className="card space-y-4 shadow-sm border border-gray-100 dark:border-gray-800 md:col-span-2">
                                    <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600">
                                            <HiOutlineChatAlt2 className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Custom Texts</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                        {/* Custom Opening */}
                                        <div className="space-y-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 dark:bg-gray-900 dark:border-gray-700" checked={getBool(content.flag_pakai_kalimat_pembuka_custom)} onChange={(e) => updateField('flag_pakai_kalimat_pembuka_custom', e.target.checked)} />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Use Custom Opening Text</span>
                                            </label>
                                            {getBool(content.flag_pakai_kalimat_pembuka_custom) && (
                                                <textarea value={content.kalimat_pembuka_undangan || ''} onChange={(e) => updateField('kalimat_pembuka_undangan', e.target.value)} className="input-field min-h-[80px]" placeholder="Bismillah... Dengan memohon rahmat Allah..." />
                                            )}
                                        </div>

                                        {/* Custom Closing */}
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
                                            <label className="label-field">Quote (Custom Text 1)</label>
                                            <textarea
                                                value={content.custom_kalimat_1 || ''}
                                                onChange={(e) => updateField('custom_kalimat_1', e.target.value)}
                                                className="input-field min-h-[80px]"
                                                placeholder="e.g. And of His signs is that He created for you..."
                                            />
                                        </div>
                                        <div>
                                            <label className="label-field">Welcome Text (Custom Text 2)</label>
                                            <textarea
                                                value={content.custom_kalimat_2 || ''}
                                                onChange={(e) => updateField('custom_kalimat_2', e.target.value)}
                                                className="input-field min-h-[80px]"
                                                placeholder="e.g. It is a joy and privilege to invite you..."
                                            />
                                        </div>
                                        <div>
                                            <label className="label-field">Protocol / Health Text (Custom Text 3)</label>
                                            <textarea
                                                value={content.custom_kalimat_3 || ''}
                                                onChange={(e) => updateField('custom_kalimat_3', e.target.value)}
                                                className="input-field min-h-[80px]"
                                                placeholder="e.g. Please follow health protocols..."
                                            />
                                        </div>
                                        <div>
                                            <label className="label-field">Additional Footer Text (Custom Text 4)</label>
                                            <textarea
                                                value={content.custom_kalimat_4 || ''}
                                                onChange={(e) => updateField('custom_kalimat_4', e.target.value)}
                                                className="input-field min-h-[80px]"
                                                placeholder="e.g. Your presence is the best gift for us."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ================= MEDIA & AUDIO ================= */}
                                <div className="card space-y-4 shadow-sm border border-gray-100 dark:border-gray-800 md:col-span-2">
                                    <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                                            <HiOutlineMusicNote className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Music & Media</h2>
                                    </div>

                                    <div className="pt-2">
                                        <label className="label-field">Background Music Link (URL YouTube)</label>
                                        <input
                                            type="text"
                                            value={content.link_backsound_music || ''}
                                            onChange={(e) => updateField('link_backsound_music', e.target.value)}
                                            className="input-field"
                                            placeholder="https://youtube.com/watch?v=..."
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* TAB 3: CERITA CINTA (Love Story) */}
                        {activeTab === 'cerita' && (
                            <div className="card space-y-4 shadow-sm border border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-500">
                                        <HiOutlineHeart className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Love Story Timeline</h2>
                                </div>

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
                                    <div className="pt-4 space-y-4 animate-fade-in border-t border-gray-100 dark:border-gray-800">
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
                                                        <label className="label-field text-xs">Date (e.g. 2020-01-12)</label>
                                                        <input
                                                            type="date"
                                                            value={item.tanggal}
                                                            onChange={(e) => {
                                                                const newArr = [...timelineItems];
                                                                newArr[idx].tanggal = e.target.value;
                                                                setTimelineItems(newArr);
                                                            }}
                                                            className="input-field text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="label-field text-xs">Title</label>
                                                        <input
                                                            type="text"
                                                            value={item.judul}
                                                            onChange={(e) => {
                                                                const newArr = [...timelineItems];
                                                                newArr[idx].judul = e.target.value;
                                                                setTimelineItems(newArr);
                                                            }}
                                                            className="input-field text-sm"
                                                            placeholder="First Meet"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="label-field text-xs">Description</label>
                                                    <textarea
                                                        value={item.deskripsi}
                                                        onChange={(e) => {
                                                            const newArr = [...timelineItems];
                                                            newArr[idx].deskripsi = e.target.value;
                                                            setTimelineItems(newArr);
                                                        }}
                                                        className="input-field min-h-[60px] text-sm"
                                                        placeholder="We first met at..."
                                                    />
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
                        )}

                        {/* TAB 4: HADIAH & AMPLOP DIGITAL */}
                        {activeTab === 'hadiah' && (
                            <div className="card space-y-4 shadow-sm border border-gray-100 dark:border-gray-800 md:col-span-2">
                                <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                                    <div className="p-2 bg-gold-50 dark:bg-gold-900/20 rounded-lg text-gold-600">
                                        <HiOutlineCreditCard className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Digital Envelopes (Gifts)</h2>
                                </div>

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
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 animate-fade-in">
                                        {/* Bank 1 */}
                                        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-3">
                                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Bank Account 1</p>
                                            <div>
                                                <label className="label-field">Bank Name (e.g. BCA, Mandiri)</label>
                                                <input type="text" value={content.nama_bank_1 || ''} onChange={(e) => updateField('nama_bank_1', e.target.value)} className="input-field" />
                                            </div>
                                            <div>
                                                <label className="label-field">Account Name</label>
                                                <input type="text" value={content.nama_rekening_bank_1 || ''} onChange={(e) => updateField('nama_rekening_bank_1', e.target.value)} className="input-field" />
                                            </div>
                                            <div>
                                                <label className="label-field">Account Number</label>
                                                <input type="text" value={content.nomor_rekening_bank_1 || ''} onChange={(e) => updateField('nomor_rekening_bank_1', e.target.value)} className="input-field font-mono" />
                                            </div>
                                        </div>

                                        {/* Bank 2 */}
                                        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-3">
                                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Bank Account 2 <span className="text-gray-400 font-normal">(Optional)</span></p>
                                            <div>
                                                <label className="label-field">Bank Name</label>
                                                <input type="text" value={content.nama_bank_2 || ''} onChange={(e) => updateField('nama_bank_2', e.target.value)} className="input-field" />
                                            </div>
                                            <div>
                                                <label className="label-field">Account Name</label>
                                                <input type="text" value={content.nama_rekening_bank_2 || ''} onChange={(e) => updateField('nama_rekening_bank_2', e.target.value)} className="input-field" />
                                            </div>
                                            <div>
                                                <label className="label-field">Account Number</label>
                                                <input type="text" value={content.nomor_rekening_bank_2 || ''} onChange={(e) => updateField('nomor_rekening_bank_2', e.target.value)} className="input-field font-mono" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>

                {/* RIGHT PANE: Live Preview */}
                <div className="w-full lg:w-[40%] hidden lg:flex flex-col items-center border-l border-gray-100 dark:border-gray-800 lg:pl-6 sticky top-24 h-[calc(100vh-6rem)] overflow-hidden">
                    <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-6">Live Preview</h3>

                    {/* Device Frame */}
                    <div className="relative mx-auto w-[320px] h-[650px] bg-black rounded-[2.5rem] border-[8px] border-gray-900 shadow-2xl overflow-hidden shrink-0 flex flex-col">

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
                            {/* Iframe pointing to the real public invitation URL */}
                            {tenant?.domain_slug ? (
                                <iframe
                                    key={iframeKey}
                                    src={`${window.location.origin}${import.meta.env.BASE_URL}#/invitation/${tenant.domain_slug}`}
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
            <MapPickerModal
                isOpen={showMapModal}
                onClose={() => setShowMapModal(false)}
                onConfirm={handleMapConfirm}
            />

        </div>
    );
}
