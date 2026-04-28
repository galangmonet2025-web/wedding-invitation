import React, { useState, useEffect } from 'react';
import { HiOutlineX, HiOutlineUser, HiOutlineFlag } from 'react-icons/hi';

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gold-50/50 dark:bg-gold-900/10">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🧪</span>
                        <div>
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider">Simulasi Data Undangan</h3>
                            <p className="text-[10px] text-gray-500 uppercase font-medium">Preview Simulation Mode</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 transition-colors"
                    >
                        <HiOutlineX className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
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
                                <div className="relative inline-flex items-center">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={(localData as any)[item.key]} 
                                        onChange={e => updateField(item.key, e.target.checked)} 
                                    />
                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-gold-500"></div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <button 
                        onClick={handleApply}
                        className="px-6 py-2 bg-gold-500 hover:bg-gold-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-gold-500/20 transition-all active:scale-95"
                    >
                        Selesai
                    </button>
                </div>
            </div>
        </div>
    );
};
