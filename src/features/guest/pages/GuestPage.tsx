import { useEffect, useState, useMemo, useRef } from 'react';
import { useGuestStore } from '../store/guestStore';
import { DataTable, Column } from '@/shared/components/DataTable';
import { Pagination } from '@/shared/components/Pagination';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/Button';
import { IconButton } from '@/shared/components/IconButton';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import type { Guest, CreateGuestRequest, GuestStatus } from '@/types';
import { useAuthStore } from '@/features/auth/store/authStore';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { exportToExcel, exportToPdf } from '@/shared/utils/exportUtils';
import { useTranslation } from 'react-i18next';
import {
    HiOutlinePlus,
    HiOutlineSearch,
    HiOutlineTrash,
    HiOutlinePencil,
    HiOutlineQrcode,
    HiOutlineRefresh,
    HiOutlineUserGroup,
    HiOutlineSpeakerphone,
    HiOutlineDocumentDownload,
    HiOutlineDocumentText,
    HiOutlineDownload,
    HiOutlineDotsHorizontal,
    HiOutlineUsers,
    HiOutlineCheckCircle,
    HiOutlineClock,
} from 'react-icons/hi';
import { GoogleContactModal } from '../components/GoogleContactModal';
import { GuestCard } from '../components/GuestCard';
import { useAdminHeaderActionStore } from '@/shared/store/adminHeaderActionStore';
import { useBasePath } from '@/shared/hooks/useBasePath';

export function GuestPage() {
    const { t } = useTranslation();
    const {
        guests,
        total,
        totalPages,
        loading,
        filters,
        selectedIds,
        setFilters,
        setSelectedIds,
        fetchGuests,
        createGuest,
        updateGuest,
        deleteGuest,
        bulkDelete,
        bulkCreateGuests,
    } = useGuestStore();

    const { user, tenant } = useAuthStore();
    const isStaff = user?.role === 'staff';
    const setHeaderAction = useAdminHeaderActionStore(s => s.setAction);
    const isAdminLayout = useBasePath() === '/admin';

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showGoogleModal, setShowGoogleModal] = useState(false);
    const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const [form, setForm] = useState<CreateGuestRequest>({
        name: '',
        phone: '',
        category: 'Friends',
        status: 'pending',
        number_of_guests: 1,
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [toolsOpen, setToolsOpen] = useState(false);
    const toolsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setFilters({ limit: 1000, page: 1 });
        fetchGuests();
    }, [filters.status, filters.category]);

    // Tutup dropdown "Ekspor & Impor" saat klik di luar area menu.
    useEffect(() => {
        if (!toolsOpen) return;
        const onDown = (e: MouseEvent) => {
            if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [toolsOpen]);

    // Pada layout /admin, tombol refresh dipindah ke gold header (sebelah "Buka
    // Undangan") lewat store header-action. Di /private lama tetap inline.
    useEffect(() => {
        if (!isAdminLayout) return;
        setHeaderAction(
            <button
                onClick={() => fetchGuests(true)}
                disabled={loading}
                title={t('common.refresh') as string}
                aria-label={t('common.refresh') as string}
                className="admin-icon-btn"
            >
                <HiOutlineRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
        );
        return () => setHeaderAction(null);
    }, [loading, isAdminLayout]);

    // Ringkasan cepat untuk penyelenggara — dihitung dari seluruh tamu (bukan
    // hasil filter), pakai isTrue-tolerant karena backend bisa kirim string.
    const stats = useMemo(() => {
        const norm = (s: any) => String(s || '').toLowerCase();
        return guests.reduce(
            (acc, g) => {
                acc.total += 1;
                acc.headcount += Number(g.number_of_guests) || 0;
                if (norm(g.status) === 'confirmed') acc.confirmed += 1;
                else if (norm(g.status) === 'pending') acc.pending += 1;
                return acc;
            },
            { total: 0, confirmed: 0, pending: 0, headcount: 0 }
        );
    }, [guests]);

    const filteredGuests = useMemo(() => {
        if (!searchTerm) return guests;
        const lowSearch = searchTerm.toLowerCase();
        return guests.filter(g => 
            String(g.name || '').toLowerCase().includes(lowSearch) || 
            String(g.phone || '').toLowerCase().includes(lowSearch) ||
            String(g.invitation_code || '').toLowerCase().includes(lowSearch)
        );
    }, [guests, searchTerm]);

    const paginatedGuests = useMemo(() => {
        return filteredGuests;
    }, [filteredGuests]);

    const handleAdd = async () => {
        if (!form.name.trim()) {
            toast.error(t('guests.name_required'));
            return;
        }
        const success = await createGuest(form);
        if (success) {
            setShowAddModal(false);
            resetForm();
        }
    };

    const handleEdit = async () => {
        if (!selectedGuest) return;
        const success = await updateGuest({ id: selectedGuest.id, ...form });
        if (success) {
            setShowEditModal(false);
            setSelectedGuest(null);
            resetForm();
        }
    };

    const handleDeleteConfirm = async () => {
        if (deleteTargetId) {
            await deleteGuest(deleteTargetId);
        }
        setShowDeleteConfirm(false);
        setDeleteTargetId(null);
    };

    const handleBulkDelete = async () => {
        await bulkDelete();
        setSelectedIds([]);
    };

    const resetForm = () => {
        setForm({ name: '', phone: '', category: 'Friends', status: 'pending', number_of_guests: 1 });
    };

    const openEditModal = (guest: Guest) => {
        setSelectedGuest(guest);
        setForm({
            name: guest.name,
            phone: guest.phone,
            category: guest.category,
            status: guest.status,
            number_of_guests: guest.number_of_guests,
        });
        setShowEditModal(true);
    };

    const openQRModal = (guest: Guest) => {
        setSelectedGuest(guest);
        setShowQRModal(true);
    };

    const exportColumns = [
        { header: t('guests.code'), key: 'invitation_code' },
        { header: t('common.name'), key: 'name' },
        { header: t('common.phone'), key: 'phone' },
        { header: t('common.category'), key: 'category' },
        { header: t('common.status'), key: 'status' },
        { header: t('guests.num_guests'), key: 'number_of_guests' },
        { header: t('guests.wish_status'), key: 'flag_sudah_isi_ucapan' },
        { header: t('guests.gift_status'), key: 'flag_sudah_kirim_hadiah' },
    ];

    const handleExportExcel = () => {
        exportToExcel(filteredGuests, exportColumns, 'Data_Tamu', t('guests.management'));
    };

    const handleExportPdf = () => {
        exportToPdf(filteredGuests, exportColumns, 'Data_Tamu', t('guests.management'));
    };

    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').slice(1);
            const imported = lines
                .filter((line) => line.trim())
                .map((line) => {
                    const [name, phone, category, status, number_of_guests] = line.split(',');
                    return {
                        name: name?.trim() || '',
                        phone: phone?.trim() || '',
                        category: category?.trim() || 'Friends',
                        status: (status?.trim() || 'pending') as GuestStatus,
                        number_of_guests: parseInt(number_of_guests?.trim() || '1') || 1,
                    };
                });
            toast.success(t('guests.import_ready', { count: imported.length }));
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleImportGoogleContacts = async (contacts: CreateGuestRequest[]) => {
        return await bulkCreateGuests(contacts);
    };

    const statusBadge = (status: string) => {
        const classes: Record<string, string> = {
            confirmed: 'badge-success',
            declined: 'badge-danger',
            pending: 'badge-warning',
        };
        return <span className={classes[status] || 'badge-info'}>{t(`guests.status.${status}`)}</span>;
    };

    const columns: Column<Guest>[] = [
        {
            key: 'name',
            header: t('common.name'),
            render: (g: Guest) => (
                <div>
                    <p className="font-medium text-gray-800 dark:text-white">{g.name}</p>
                    <p className="text-xs text-gray-400">{g.invitation_code}</p>
                </div>
            ),
        },
        { key: 'phone', header: t('common.phone') },
        {
            key: 'category',
            header: t('common.category'),
            render: (g: Guest) => <span className="badge-gold">{g.category}</span>,
        },
        {
            key: 'status',
            header: t('common.status'),
            render: (g: Guest) => statusBadge(g.status),
        },
        { key: 'number_of_guests', header: t('guests.num_guests') },
        {
            key: 'flag_sudah_isi_ucapan',
            header: t('dashboard.wishes'),
            render: (g: Guest) => g.flag_sudah_isi_ucapan ? (
                <span className="badge-success text-[10px]">✅ {t('guests.status_yes')}</span>
            ) : (
                <span className="badge-secondary text-[10px]">⏳ {t('guests.status_no')}</span>
            ),
        },
        {
            key: 'flag_sudah_kirim_hadiah',
            header: t('dashboard.gifts'),
            render: (g: Guest) => g.flag_sudah_kirim_hadiah ? (
                <span className="badge-success text-[10px]">✅ {t('guests.status_yes')}</span>
            ) : (
                <span className="badge-secondary text-[10px]">⏳ {t('guests.status_no')}</span>
            ),
        },
        {
            key: 'actions',
            header: t('common.actions'),
            render: (g: Guest) => (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => openQRModal(g)}
                        className="p-1.5 rounded-lg hover:bg-gold-50 dark:hover:bg-gold-900/20 text-gold-600 transition-colors"
                        title={t('guests.qr_code')}
                    >
                        <HiOutlineQrcode className="w-4 h-4" />
                    </button>
                    {!isStaff && (
                        <>
                            <button
                                onClick={() => openEditModal(g)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 transition-colors"
                                title={t('common.edit')}
                            >
                                <HiOutlinePencil className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => {
                                    setDeleteTargetId(g.id);
                                    setShowDeleteConfirm(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                                title={t('common.delete')}
                            >
                                <HiOutlineTrash className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    const guestFormFields = (
        <div className="space-y-4">
            <div>
                <label className="label-field">{t('common.name')} *</label>
                <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="input-field"
                    placeholder={t('common.name')}
                />
            </div>
            <div>
                <label className="label-field">{t('common.phone')}</label>
                <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="input-field"
                    placeholder="08xx-xxxx-xxxx"
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label-field">{t('common.category')}</label>
                    <select
                        value={form.category}
                        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                        className="select-field"
                    >
                        <option value="Family">{t('guests.categories.family')}</option>
                        <option value="Friends">{t('guests.categories.friends')}</option>
                        <option value="Work">{t('guests.categories.work')}</option>
                        <option value="VIP">{t('guests.categories.vip')}</option>
                    </select>
                </div>
                <div>
                    <label className="label-field">{t('common.status')}</label>
                    <select
                        value={form.status}
                        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as GuestStatus }))}
                        className="select-field"
                    >
                        <option value="pending">{t('guests.status.pending')}</option>
                        <option value="confirmed">{t('guests.status.confirmed')}</option>
                        <option value="declined">{t('guests.status.declined')}</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="label-field">{t('guests.num_guests')}</label>
                <input
                    type="number"
                    min={1}
                    max={10}
                    value={form.number_of_guests}
                    onChange={(e) => setForm((f) => ({ ...f, number_of_guests: parseInt(e.target.value) || 1 }))}
                    className="input-field"
                />
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* ===== Header: action row + stat strip + search/filters (satu blok) ===== */}
            <div className="space-y-4">
                {/* Action row */}
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate">
                        {t('guests.management')}
                    </h2>
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Layout /admin: refresh dipindah ke gold header. Inline hanya untuk /private. */}
                        {!isAdminLayout && (
                            <IconButton
                                onClick={() => fetchGuests(true)}
                                title={t('common.refresh')}
                                spinning={loading}
                                icon={<HiOutlineRefresh className="w-4 h-4" />}
                            />
                        )}
                        {!isStaff && (
                            <>
                                {/* Ekspor & Impor — satu dropdown menggantikan 4 tombol */}
                                <div className="relative" ref={toolsRef}>
                                    <button
                                        onClick={() => setToolsOpen((v) => !v)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-95"
                                        title={t('guests.tools_menu')}
                                    >
                                        <HiOutlineDotsHorizontal className="w-4 h-4" />
                                        <span className="hidden sm:inline">{t('guests.tools_menu')}</span>
                                    </button>
                                    {toolsOpen && (
                                        <div className="absolute right-0 mt-2 w-56 z-30 rounded-2xl bg-white dark:bg-wedding-dark-card border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden animate-fade-in">
                                            <button
                                                onClick={() => { handleExportExcel(); setToolsOpen(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                            >
                                                <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center shrink-0">
                                                    <HiOutlineDocumentDownload className="w-4 h-4" />
                                                </span>
                                                {t('guests.export_excel')}
                                            </button>
                                            <button
                                                onClick={() => { handleExportPdf(); setToolsOpen(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                            >
                                                <span className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center shrink-0">
                                                    <HiOutlineDocumentText className="w-4 h-4" />
                                                </span>
                                                {t('guests.export_pdf')}
                                            </button>
                                            <div className="h-px bg-gray-100 dark:bg-gray-800" />
                                            <label className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                                                <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-300 flex items-center justify-center shrink-0">
                                                    <HiOutlineDownload className="w-4 h-4" />
                                                </span>
                                                {t('guests.import_csv')}
                                                <input type="file" accept=".csv" className="hidden" onChange={(e) => { handleImportCSV(e); setToolsOpen(false); }} />
                                            </label>
                                            <button
                                                onClick={() => { setShowGoogleModal(true); setToolsOpen(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                            >
                                                <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center shrink-0">
                                                    <HiOutlineUserGroup className="w-4 h-4" />
                                                </span>
                                                {t('guests.import_google')}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Aksi utama */}
                                <Button
                                    onClick={() => { resetForm(); setShowAddModal(true); }}
                                    className="text-sm shrink-0"
                                    icon={<HiOutlinePlus className="w-4 h-4" />}
                                >
                                    <span className="hidden sm:inline">{t('guests.add_new')}</span>
                                    <span className="sm:hidden">{t('guests.add_new_short')}</span>
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Stat strip */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <StatPill
                        icon={<HiOutlineUsers className="w-4 h-4" />}
                        value={stats.total}
                        label={t('guests.stat_total')}
                        tone="gold"
                    />
                    <StatPill
                        icon={<HiOutlineCheckCircle className="w-4 h-4" />}
                        value={stats.confirmed}
                        label={t('guests.stat_confirmed')}
                        tone="emerald"
                    />
                    <StatPill
                        icon={<HiOutlineClock className="w-4 h-4" />}
                        value={stats.pending}
                        label={t('guests.stat_pending')}
                        tone="amber"
                    />
                </div>

                {/* Search + filters. `content-form-compact` matches the smaller
                    text size used by the Step-1 forms in Kelola Undangan. The
                    dropdown arrow spacing is handled globally by `.select-field`
                    (custom SVG chevron with a gap from the border). */}
                <div className="card !p-3 sm:!p-4 content-form-compact">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('guests.search_placeholder')}
                                className="input-field pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 sm:gap-3">
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ status: e.target.value as GuestStatus | '', page: 1 })}
                                className="select-field flex-1 sm:w-auto sm:flex-none"
                            >
                                <option value="">{t('guests.all_status')}</option>
                                <option value="confirmed">{t('guests.status.confirmed')}</option>
                                <option value="declined">{t('guests.status.declined')}</option>
                                <option value="pending">{t('guests.status.pending')}</option>
                            </select>
                            <select
                                value={filters.category}
                                onChange={(e) => setFilters({ category: e.target.value, page: 1 })}
                                className="select-field flex-1 sm:w-auto sm:flex-none"
                            >
                                <option value="">{t('guests.all_categories')}</option>
                                <option value="Family">{t('guests.categories.family')}</option>
                                <option value="Friends">{t('guests.categories.friends')}</option>
                                <option value="Work">{t('guests.categories.work')}</option>
                                <option value="VIP">{t('guests.categories.vip')}</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {selectedIds.length > 0 && !isStaff && (
                <div className="flex items-center gap-4 px-4 py-3 bg-gold-50 dark:bg-gold-900/20 rounded-xl border border-gold-200 dark:border-gold-800">
                    <span className="text-sm font-medium text-gold-700 dark:text-gold-400">
                        {t('guests.selected_count', { count: selectedIds.length })}
                    </span>
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={handleBulkDelete}
                        icon={<HiOutlineTrash className="w-4 h-4" />}
                    >
                        {t('common.delete')}
                    </Button>
                    <Button variant="ghost" onClick={() => setSelectedIds([])} className="text-sm py-1.5">
                        {t('common.clear')}
                    </Button>
                </div>
            )}

            <DataTable
                columns={columns}
                data={paginatedGuests}
                loading={loading}
                emptyMessage={t('guests.no_guests')}
                selectedIds={!isStaff ? selectedIds : undefined}
                onSelectChange={!isStaff ? setSelectedIds : undefined}
                renderMobileCard={(g, { isSelected, toggleSelect, selectable }) => (
                    <GuestCard
                        guest={g}
                        isSelected={isSelected}
                        selectable={selectable}
                        selectionMode={selectedIds.length > 0}
                        onToggleSelect={toggleSelect}
                        isStaff={isStaff}
                        onQr={openQRModal}
                        onEdit={openEditModal}
                        onDelete={(guest) => { setDeleteTargetId(guest.id); setShowDeleteConfirm(true); }}
                    />
                )}
            />

            {totalPages > 1 && (
                <Pagination
                    page={filters.page}
                    totalPages={totalPages}
                    onPageChange={(p) => setFilters({ page: p })}
                    total={total}
                    limit={filters.limit}
                />
            )}

            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title={t('guests.add_new')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setShowAddModal(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleAdd}>{t('common.save')}</Button>
                    </>
                }
            >
                {guestFormFields}
            </Modal>

            <Modal
                isOpen={showEditModal}
                onClose={() => { setShowEditModal(false); setSelectedGuest(null); }}
                title={t('common.edit')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => { setShowEditModal(false); setSelectedGuest(null); }}>{t('common.cancel')}</Button>
                        <Button onClick={handleEdit}>{t('common.save')}</Button>
                    </>
                }
            >
                {guestFormFields}
            </Modal>

            <Modal
                isOpen={showQRModal}
                onClose={() => { setShowQRModal(false); setSelectedGuest(null); }}
                title={t('guests.qr_code')}
                size="xl"
            >
                {selectedGuest && (
                    <div className="flex flex-col md:flex-row gap-6 w-full h-full items-start">
                        <div className="flex flex-col items-center flex-1 w-full bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
                                <QRCodeSVG
                                    value={selectedGuest.invitation_code}
                                    size={180}
                                    fgColor="#1A1A2E"
                                    bgColor="#FFFFFF"
                                    level="H"
                                />
                            </div>
                            <div className="text-center w-full">
                                <p className="font-semibold text-gray-800 dark:text-white text-xl">{selectedGuest.name}</p>
                                <p className="text-gold-600 font-mono text-sm mt-1 bg-gold-50 dark:bg-gold-900/20 px-3 py-1 rounded-full inline-block">{selectedGuest.invitation_code}</p>
                                <div className="mt-3">
                                    <span className="badge-gold">{selectedGuest.category}</span>
                                </div>
                            </div>

                            {tenant && (
                                <div className="w-full h-full text-left mt-6">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-white mb-2">{t('guests.invitation_link')}</p>
                                    <div className="space-y-3">
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                readOnly
                                                value={window.location.href.split('#')[0].replace(/\/$/, '') + `/#/${tenant.domain_slug}?guestid=${selectedGuest.invitation_code}`}
                                                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-3 pr-20 text-xs text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gold-500/20 transition-all shadow-sm group-hover:border-gold-300"
                                                onClick={(e) => e.currentTarget.select()}
                                            />
                                            <button
                                                onClick={() => {
                                                    const link = window.location.href.split('#')[0].replace(/\/$/, '') + `/#/${tenant.domain_slug}?guestid=${selectedGuest.invitation_code}`;
                                                    navigator.clipboard.writeText(link);
                                                    toast.success(t('common.copied'));
                                                }}
                                                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-gold-50 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 hover:bg-gold-100 dark:hover:bg-gold-900/50 rounded-lg text-[11px] font-bold transition-all border border-gold-200 dark:border-gold-800"
                                            >
                                                {t('common.copy')}
                                            </button>
                                        </div>
                                        
                                        <button
                                            onClick={() => {
                                                const link = window.location.href.split('#')[0].replace(/\/$/, '') + `/#/${tenant.domain_slug}?guestid=${selectedGuest.invitation_code}`;
                                                window.open(link, '_blank');
                                            }}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                                        >
                                            <HiOutlineSpeakerphone className="w-4 h-4" />
                                            {t('guests.open_invitation')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {tenant && (
                            <div className="flex-1 flex flex-col w-full h-full">
                                <div className="w-full ">
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden h-[670px] w-full bg-gray-100 dark:bg-gray-900 shadow-inner relative group flex-shrink-0">
                                        <iframe
                                            style={{ zoom: '0.8' }}
                                            src={window.location.href.split('#')[0].replace(/\/$/, '') + `/#/${tenant.domain_slug}?guestid=${selectedGuest.invitation_code}`}
                                            className="w-full h-full border-none opacity-90 group-hover:opacity-100 transition-opacity"
                                            title="Live Preview"
                                        />
                                        <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded backdrop-blur-md pointer-events-none">
                                            {t('guests.live')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => { setShowDeleteConfirm(false); setDeleteTargetId(null); }}
                onConfirm={handleDeleteConfirm}
                title={t('guests.delete_confirm_title') || "Hapus Tamu"}
                variant="danger"
                warningTitle={t('guests.confirm_delete')}
                message={t('guests.delete_confirm')}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
            />

            <GoogleContactModal
                isOpen={showGoogleModal}
                onClose={() => setShowGoogleModal(false)}
                onImport={handleImportGoogleContacts}
            />
        </div>
    );
}

// Kartu statistik ringkas untuk header. Warna mengikuti bahasa desain yang
// sudah dipakai di GuestCard (status pill emerald/amber, aksen gold).
const STAT_TONE: Record<string, { icon: string; value: string }> = {
    gold: {
        icon: 'bg-gold-100 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400',
        value: 'text-gray-900 dark:text-white',
    },
    emerald: {
        icon: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
        value: 'text-emerald-600 dark:text-emerald-400',
    },
    amber: {
        icon: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
        value: 'text-amber-600 dark:text-amber-400',
    },
};

function StatPill({ icon, value, label, tone }: {
    icon: React.ReactNode;
    value: number;
    label: string;
    tone: keyof typeof STAT_TONE;
}) {
    const c = STAT_TONE[tone] || STAT_TONE.gold;
    return (
        <div className="card !p-3 flex items-center gap-2.5 min-w-0">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
                {icon}
            </span>
            <div className="min-w-0">
                <p className={`text-xl font-black leading-none ${c.value}`}>{value}</p>
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 truncate mt-1">{label}</p>
            </div>
        </div>
    );
}
