import { useState } from 'react';
import { Modal } from '@/shared/components/Modal';
import { HiOutlineUpload, HiOutlineTrash, HiOutlineExclamationCircle } from 'react-icons/hi';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import type { CreateGuestRequest, GuestStatus } from '@/types';
import { useGuestStore } from '../store/guestStore';

interface GoogleContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (contacts: CreateGuestRequest[]) => Promise<{ successCount: number; failedItems: CreateGuestRequest[] }>;
}

interface EditableContact extends CreateGuestRequest {
    id: string; // Temporary ID for table reconciliation
}

import { useBackgroundTaskStore } from '@/shared/store/backgroundTaskStore';

export function GoogleContactModal({ isOpen, onClose, onImport }: GoogleContactModalProps) {
    const { loading: isApiStoreSaving } = useGuestStore();
    const { tasks } = useBackgroundTaskStore();
    const isBackgroundSaving = tasks.some(t => t.status === 'running' && t.id.startsWith('bulk-guest'));
    const isSaving = isApiStoreSaving || isBackgroundSaving;

    const [contacts, setContacts] = useState<EditableContact[]>([]);

    const [isUploaded, setIsUploaded] = useState(false);
    const [failedInfoVisible, setFailedInfoVisible] = useState(false);
    const [activeTab, setActiveTab] = useState<'upload' | 'tutorial'>('upload');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const mappedData: EditableContact[] = results.data.map((row: any, index) => {
                    // Mapping columns based on typical Google CSV headers
                    // Mapping names: First Name, Middle Name, Last Name
                    const firstName = row['First Name'] || row['Given Name'] || '';
                    const middleName = row['Middle Name'] || row['Additional Name'] || '';
                    const lastName = row['Last Name'] || row['Family Name'] || '';
                    
                    const name = [firstName, middleName, lastName].filter(Boolean).join(' ') || row['Name'] || 'Tanpa Nama';
                    
                    // Mapping phones: Phone 1 - Value
                    const phone = row['Phone 1 - Value'] || row['Mobile Phone'] || '';

                    return {
                        id: `temp-${index}`,
                        name,
                        phone,
                        category: 'Friends',
                        status: 'pending' as GuestStatus,
                        number_of_guests: 1
                    };
                }).filter(c => c.phone || c.name !== 'Tanpa Nama');

                if (mappedData.length === 0) {
                    toast.error('Tidak ada data kontak yang valid ditemukan di file CSV');
                    return;
                }

                setContacts(mappedData);
                setIsUploaded(true);
                toast.success(`${mappedData.length} kontak berhasil dibaca`);
            },
            error: (error) => {
                console.error('CSV Parsing Error:', error);
                toast.error('Gagal membaca file CSV');
            }
        });
        
        // Reset input
        e.target.value = '';
    };

    const updateField = (index: number, field: keyof EditableContact, value: any) => {
        const next = [...contacts];
        next[index] = { ...next[index], [field]: value };
        setContacts(next);
    };

    const deleteRow = (id: string) => {
        setContacts(contacts.filter(c => c.id !== id));
    };

    const handleSave = async () => {
        const finalData = contacts.map(({ id, ...guest }) => guest);
        const { successCount, failedItems } = await onImport(finalData);
        
        if (failedItems.length === 0) {
            // Full success
            onClose();
            setIsUploaded(false);
            setContacts([]);
            setFailedInfoVisible(false);
        } else {
            // Reconciliation: keep only failed items
            const newContacts: EditableContact[] = failedItems.map((c, i) => ({
                ...c,
                id: `fail-${i}-${Date.now()}`
            }));
            setContacts(newContacts);
            setFailedInfoVisible(true);
            
            if (successCount > 0) {
                toast.success(`${successCount} tamu tersimpan, ${failedItems.length} gagal.`);
            } else {
                toast.error(`Semua data (${failedItems.length}) gagal disimpan.`);
            }
        }
    };

    const resetModal = () => {
        setIsUploaded(false);
        setContacts([]);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={resetModal}
            title="Import Google Contacts (CSV)"
            size="2xl"
            footer={
                <div className="flex justify-between items-center w-full">
                    <div className="flex flex-col items-start">
                        <p className="text-sm text-gray-500">
                            {contacts.length} baris data
                        </p>
                        {isBackgroundSaving && (
                            <p className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                Data sedang diproses di latar belakang...
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={resetModal} className="btn-ghost" disabled={isSaving}>Batal</button>
                        {isUploaded && (
                            <button 
                                onClick={handleSave} 
                                className="btn-primary flex items-center gap-2"
                                disabled={contacts.length === 0 || isSaving}
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        {isBackgroundSaving ? 'Memproses...' : 'Menyimpan...'}
                                    </>
                                ) : (
                                    'Simpan ke Database'
                                )}
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            {!isUploaded ? (
                <div className="space-y-6">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-100 dark:border-gray-700">
                        <button 
                            onClick={() => setActiveTab('upload')}
                            className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'upload' ? 'border-gold-500 text-gold-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            Upload File
                        </button>
                        <button 
                            onClick={() => setActiveTab('tutorial')}
                            className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'tutorial' ? 'border-gold-500 text-gold-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            Panduan Impor
                        </button>
                    </div>

                    {activeTab === 'upload' ? (
                        <div className="py-8 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
                            <div className="w-20 h-20 bg-gold-50 dark:bg-gold-900/20 text-gold-600 rounded-full flex items-center justify-center shadow-inner">
                                <HiOutlineUpload className="w-10 h-10" />
                            </div>
                            <div className="max-w-md">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Upload Google Contacts CSV</h3>
                                <p className="text-sm text-gray-500 mt-2">
                                    Ekspor kontak Anda dari Google Contacts dalam format **Google CSV**, lalu unggah di sini untuk memprosesnya.
                                </p>
                            </div>
                            
                            <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all group">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <HiOutlineUpload className="w-8 h-8 mb-2 text-gray-400 group-hover:text-gold-500 transition-colors" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Klik untuk pilih file CSV</p>
                                </div>
                                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                            </label>

                            <div className="flex items-start gap-3 text-left bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-xs text-blue-700 dark:text-blue-400">
                                <HiOutlineExclamationCircle className="w-5 h-5 shrink-0" />
                                <p>
                                    Sistem akan secara otomatis mengambil kolom <strong>First Name</strong>, <strong>Middle Name</strong>, <strong>Last Name</strong>, dan <strong>Phone 1 - Value</strong>. Anda bisa mengedit datanya di tahap selanjutnya.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="py-4 space-y-8 animate-fade-in pb-10 max-w-2xl mx-auto">
                            <div className="space-y-6">
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Cara Ekspor Kontak Google</h3>
                                    <p className="text-sm text-gray-500">Ikuti langkah-langkah di bawah ini untuk mendapatkan file CSV yang benar.</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-8 border border-gray-100 dark:border-gray-700">
                                    <ol className="space-y-4">
                                        {[
                                            'Buka situs Google Contacts.',
                                            'Pilih kontak yang ingin diimpor (atau centang semua).',
                                            'Klik tombol "Ekspor" di menu sebelah kiri.',
                                            'Pilih format "Google CSV" (Penting!).',
                                            'Klik tombol Ekspor dan simpan filenya.',
                                        ].map((step, i) => (
                                            <li key={i} className="flex gap-4 text-base text-gray-600 dark:text-gray-400">
                                                <span className="flex-shrink-0 w-8 h-8 bg-gold-100 dark:bg-gold-900/40 text-gold-600 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                                                    {i + 1}
                                                </span>
                                                <span className="pt-1">{step}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                                <div className="flex justify-center pt-4">
                                    <a 
                                        href="https://contacts.google.com/" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="btn-primary flex items-center gap-3 px-8 py-3 rounded-xl shadow-lg shadow-gold-500/20"
                                    >
                                        Buka Google Contacts
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Error Info Alert */}
                    {failedInfoVisible && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 rounded-xl flex items-start gap-3 animate-fade-in">
                            <HiOutlineExclamationCircle className="w-5 h-5 text-red-500 shrink-0" />
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-red-800 dark:text-red-400">Beberapa data gagal disimpan</h4>
                                <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                                    Data yang muncul di tabel di bawah adalah data yang <strong>gagal disimpan</strong>. 
                                    Mohon cek kembali format nama atau nomor teleponnya, lalu coba simpan kembali.
                                </p>
                            </div>
                            <button 
                                onClick={() => setFailedInfoVisible(false)}
                                className="text-red-400 hover:text-red-500 p-1"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                    )}

                    <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm transition-all">
                        <div className="max-h-[500px] overflow-y-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 z-10 border-b border-gray-100 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Nama Lengkap</th>
                                        <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Nomor Telepon</th>
                                        <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Kategori</th>
                                        <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-20">Jml. Tamu</th>
                                        <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {contacts.map((contact, idx) => (
                                        <tr key={contact.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text"
                                                    className="w-full bg-transparent border-none focus:ring-1 focus:ring-gold-500 rounded p-1 text-gray-800 dark:text-white"
                                                    value={contact.name}
                                                    onChange={(e) => updateField(idx, 'name', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text"
                                                    className="w-full bg-transparent border-none focus:ring-1 focus:ring-gold-500 rounded p-1 text-gray-800 dark:text-white"
                                                    value={contact.phone}
                                                    onChange={(e) => updateField(idx, 'phone', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <select
                                                    className="w-full bg-transparent border-none focus:ring-1 focus:ring-gold-500 rounded p-1 text-gray-800 dark:text-white cursor-pointer"
                                                    value={contact.category}
                                                    onChange={(e) => updateField(idx, 'category', e.target.value)}
                                                >
                                                    <option value="Family">Family</option>
                                                    <option value="Friends">Friends</option>
                                                    <option value="Work">Work</option>
                                                    <option value="VIP">VIP</option>
                                                </select>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    className="w-full bg-transparent border-none focus:ring-1 focus:ring-gold-500 rounded p-1 text-center text-gray-800 dark:text-white"
                                                    value={contact.number_of_guests}
                                                    onChange={(e) => updateField(idx, 'number_of_guests', parseInt(e.target.value) || 1)}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <button 
                                                    onClick={() => deleteRow(contact.id)}
                                                    className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                >
                                                    <HiOutlineTrash className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 italic">
                        * Semua data di atas bisa diedit langsung sebelum diklik Simpan.
                    </p>
                </div>
            )}
        </Modal>
    );
}
