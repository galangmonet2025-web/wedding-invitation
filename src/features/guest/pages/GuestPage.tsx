import { useEffect, useState, useMemo } from 'react';
import { useGuestStore } from '../store/guestStore';
import { DataTable, Column } from '@/shared/components/DataTable';
import { Pagination } from '@/shared/components/Pagination';
import { Modal } from '@/shared/components/Modal';
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
    HiOutlineUpload,
    HiOutlineRefresh,
    HiOutlineUserGroup,
    HiOutlineSpeakerphone,
} from 'react-icons/hi';
import { GoogleContactModal } from '../components/GoogleContactModal';
import { WhatsAppBlastModal } from '../components/WhatsAppBlastModal';

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

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showGoogleModal, setShowGoogleModal] = useState(false);
    const [showBlastModal, setShowBlastModal] = useState(false);
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

    useEffect(() => {
        setFilters({ limit: 1000, page: 1 });
        fetchGuests();
    }, [filters.status, filters.category]);

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

    const selectedGuestsObjects = useMemo(() => {
        return guests.filter(g => selectedIds.includes(g.id));
    }, [guests, selectedIds]);

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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-white">{t('guests.management')}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {t('guests.total_count', { count: total })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => fetchGuests()} 
                        className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gold-500 text-gray-400 hover:text-gold-500 rounded-xl transition-all shadow-sm"
                        title={t('common.refresh')}
                    >
                        <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {!isStaff && (
                        <>
                            <label className="btn-ghost cursor-pointer text-sm flex items-center gap-2">
                                <HiOutlineUpload className="w-4 h-4" />
                                {t('common.import')}
                                <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
                            </label>
                            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1 border border-gray-200 dark:border-gray-700">
                                <button onClick={handleExportExcel} className="flex-1 lg:flex-none px-3 py-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded shadow-sm transition-colors flex items-center gap-2 justify-center">
                                    Excel
                                </button>
                                <button onClick={handleExportPdf} className="flex-1 lg:flex-none px-3 py-1.5 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded shadow-sm transition-colors flex items-center gap-2 justify-center">
                                    PDF
                                </button>
                            </div>
                            <button 
                                onClick={() => setShowGoogleModal(true)} 
                                className="btn-ghost text-sm flex items-center gap-2 text-blue-600 hover:text-blue-700"
                            >
                                <HiOutlineUserGroup className="w-4 h-4" />
                                Google
                            </button>
                            <button onClick={() => { resetForm(); setShowAddModal(true); }} className="btn-primary text-sm flex items-center gap-2">
                                <HiOutlinePlus className="w-4 h-4" />
                                {t('guests.add_new')}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="card">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('guests.search_placeholder')}
                            className="input-field pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ status: e.target.value as GuestStatus | '', page: 1 })}
                            className="select-field w-auto"
                        >
                            <option value="">{t('guests.all_status')}</option>
                            <option value="confirmed">{t('guests.status.confirmed')}</option>
                            <option value="declined">{t('guests.status.declined')}</option>
                            <option value="pending">{t('guests.status.pending')}</option>
                        </select>
                        <select
                            value={filters.category}
                            onChange={(e) => setFilters({ category: e.target.value, page: 1 })}
                            className="select-field w-auto"
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

            {selectedIds.length > 0 && !isStaff && (
                <div className="flex items-center gap-4 px-4 py-3 bg-gold-50 dark:bg-gold-900/20 rounded-xl border border-gold-200 dark:border-gold-800">
                    <span className="text-sm font-medium text-gold-700 dark:text-gold-400">
                        {t('guests.selected_count', { count: selectedIds.length })}
                    </span>
                    <button onClick={handleBulkDelete} className="btn-danger text-sm py-1.5 px-4">
                        <HiOutlineTrash className="w-4 h-4 inline mr-1" />
                        {t('common.delete')}
                    </button>
                    <button 
                        onClick={() => setShowBlastModal(true)} 
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <HiOutlineSpeakerphone className="w-4 h-4" />
                        Blast
                    </button>
                    <button onClick={() => setSelectedIds([])} className="btn-ghost text-sm py-1.5">
                        {t('common.clear')}
                    </button>
                </div>
            )}

            <DataTable
                columns={columns}
                data={paginatedGuests}
                loading={loading}
                emptyMessage={t('guests.no_guests')}
                selectedIds={!isStaff ? selectedIds : undefined}
                onSelectChange={!isStaff ? setSelectedIds : undefined}
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
                        <button onClick={() => setShowAddModal(false)} className="btn-ghost">{t('common.cancel')}</button>
                        <button onClick={handleAdd} className="btn-primary">{t('common.save')}</button>
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
                        <button onClick={() => { setShowEditModal(false); setSelectedGuest(null); }} className="btn-ghost">{t('common.cancel')}</button>
                        <button onClick={handleEdit} className="btn-primary">{t('common.save')}</button>
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
                                                value={`${window.location.origin}/wedding-invitation/#/${tenant.domain_slug}?guestid=${selectedGuest.invitation_code}`}
                                                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-3 pr-20 text-xs text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gold-500/20 transition-all shadow-sm group-hover:border-gold-300"
                                                onClick={(e) => e.currentTarget.select()}
                                            />
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`${window.location.origin}/wedding-invitation/#/${tenant.domain_slug}?guestid=${selectedGuest.invitation_code}`);
                                                    toast.success(t('common.copied'));
                                                }}
                                                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-gold-50 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 hover:bg-gold-100 dark:hover:bg-gold-900/50 rounded-lg text-[11px] font-bold transition-all border border-gold-200 dark:border-gold-800"
                                            >
                                                {t('common.copy')}
                                            </button>
                                        </div>
                                        
                                        <button
                                            onClick={() => {
                                                window.open(`${window.location.origin}/wedding-invitation/#/${tenant.domain_slug}?guestid=${selectedGuest.invitation_code}`, '_blank');
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
                                            src={`/wedding-invitation/#/${tenant.domain_slug}?guestid=${selectedGuest.invitation_code}`}
                                            className="w-full h-full border-none opacity-90 group-hover:opacity-100 transition-opacity"
                                            title="Live Preview"
                                        />
                                        <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded backdrop-blur-md pointer-events-none">
                                            Live
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={showDeleteConfirm}
                onClose={() => { setShowDeleteConfirm(false); setDeleteTargetId(null); }}
                title={t('common.delete')}
                size="sm"
                footer={
                    <>
                        <button onClick={() => { setShowDeleteConfirm(false); setDeleteTargetId(null); }} className="btn-ghost">{t('common.cancel')}</button>
                        <button onClick={handleDeleteConfirm} className="btn-danger">{t('common.delete')}</button>
                    </>
                }
            >
                <p className="text-gray-600 dark:text-gray-300">
                    {t('guests.delete_confirm')}
                </p>
            </Modal>

            <GoogleContactModal 
                isOpen={showGoogleModal}
                onClose={() => setShowGoogleModal(false)}
                onImport={handleImportGoogleContacts}
            />

            <WhatsAppBlastModal 
                isOpen={showBlastModal}
                onClose={() => setShowBlastModal(false)}
                selectedGuests={selectedGuestsObjects}
                tenant={tenant}
            />
        </div>
    );
}
