import React, { useState, useEffect } from 'react';
import { HiOutlineUser, HiOutlineFlag } from 'react-icons/hi';
import { Modal } from '@/shared/components/Modal';

interface SimulationModalProps {
    isOpen: boolean;
    onClose: () => void;
    mockGuestData: {
        nama_tamu: string;
        kode_tamu: string;
        is_sudah_isi_ucapan: boolean;
        is_sudah_kirim_hadiah: boolean;
        is_sudah_isi_konfirmasi_kehadiran: boolean;
        is_link_umum: boolean;
    };
    onDataChange: (data: any) => void;
}

export const SimulationModal: React.FC<SimulationModalProps> = ({ isOpen, onClose, mockGuestData, onDataChange }) => {
    // Use local state to prevent freezing the parent page during typing
    const [localData, setLocalData] = useState(mockGuestData);

    // Sync local state when modal opens
    useEffect(() => {
        if (isOpen) {
            setLocalData(mockGuestData);
        }
    }, [isOpen, mockGuestData]);

    if (!isOpen) return null;

    const updateField = (field: string, value: any) => {
        const newData = { ...localData, [field]: value };
        setLocalData(newData);
        
        // For checkboxes, we can update immediately as they don't cause "typing lag"
        if (typeof value === 'boolean') {
            onDataChange(newData);
        }
    };

    const handleApply = () => {
        onDataChange(localData);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Simulasi Data Undangan"
            size="md"
            footer={
                <button 
                    onClick={handleApply}
                    className="px-6 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-gold-500/20 transition-all active:scale-95"
                >
                    Selesai
                </button>
            }
        >
            <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-gold-600 uppercase tracking-widest mb-1">
                        <HiOutlineUser className="w-4 h-4" /> Informasi Tamu
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 ml-1">Nama Tamu ({"{{nama_tamu}}"})</label>
                        <input 
                            type="text" 
                            value={localData.nama_tamu} 
                            onChange={e => updateField('nama_tamu', e.target.value)}
                            onBlur={() => onDataChange(localData)}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-gold-500 outline-none transition-all text-sm"
                            placeholder="Contoh: Bpk. Ahmad Fauzi"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 ml-1">Kode Tamu ({"{{kode_undangan}}"})</label>
                        <input 
                            type="text" 
                            value={localData.kode_tamu} 
                            onChange={e => updateField('kode_tamu', e.target.value)}
                            onBlur={() => onDataChange(localData)}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-gold-500 outline-none transition-all text-sm"
                            placeholder="GUEST-001"
                        />
                    </div>
                </div>

                {/* Flags / Status */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-gold-600 uppercase tracking-widest mb-2">
                        <HiOutlineFlag className="w-4 h-4" /> Status & Kondisi
                    </div>
                    
                    {[
                        { label: 'Sudah Isi Ucapan', key: 'is_sudah_isi_ucapan', code: 'is_sudah_isi_ucapan' },
                        { label: 'Sudah Kirim Hadiah', key: 'is_sudah_kirim_hadiah', code: 'is_sudah_kirim_hadiah' },
                        { label: 'Sudah RSVP', key: 'is_sudah_isi_konfirmasi_kehadiran', code: 'is_sudah_isi_konfirmasi_kehadiran' },
                        { label: 'Link Umum', key: 'is_link_umum', code: 'is_link_umum_and_not_for_spesific_guest' },
                    ].map((item) => (
                        <label key={item.key} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gold-50/30 dark:hover:bg-gray-700/50 cursor-pointer transition-colors group">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-tight group-hover:text-gold-600 transition-colors">{item.label}</span>
                                <span className="text-[9px] text-gray-400 font-mono tracking-tighter">{"{{"}{item.code}{"}}"}</span>
                            </div>
                            <div className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={(localData as any)[item.key]} 
                                    onChange={e => updateField(item.key, e.target.checked)} 
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold-500 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gold-500"></div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>
        </Modal>
    );
};
