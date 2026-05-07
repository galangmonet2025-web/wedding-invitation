import { useEffect, useState } from 'react';
import { paymentApi } from '@/core/api/endpoints';
import { Modal } from '@/shared/components/Modal';
import { PageLoader } from '@/shared/components/Loading';
import { usePlanStore } from '@/features/admin/store/planStore';
import type { MstPlanType, MstPlanFeature } from '@/types';
import toast from 'react-hot-toast';
import { 
    HiOutlinePencil, 
    HiOutlineRefresh, 
    HiOutlinePlus, 
    HiOutlineTrash, 
    HiOutlineSelector,
    HiOutlineCheck,
    HiOutlineX,
    HiOutlineRefresh as HiOutlineSpin,
    HiOutlineChevronRight
} from 'react-icons/hi';
import { useTranslation } from 'react-i18next';

// Dnd Kit Imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

function Switch({ checked, onChange, disabled }: SwitchProps) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                checked ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    checked ? 'translate-x-4' : 'translate-x-0'
                }`}
            />
        </button>
    );
}

interface SortableFeatureItemProps {
    feature: MstPlanFeature;
    onEdit: (f: MstPlanFeature) => void;
    onDelete: (id: string) => void;
    onToggleActive: (f: MstPlanFeature) => void;
    isUpdating?: boolean;
}

function SortableFeatureItem({ feature, onEdit, onDelete, onToggleActive, isUpdating }: SortableFeatureItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: feature.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
    };

    const isActive = String(feature.active) === 'true';

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            className={`flex items-center gap-3 p-3 bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700 rounded-2xl group transition-all ${isDragging ? 'shadow-2xl ring-2 ring-gold-500/50' : 'hover:shadow-md'} ${isUpdating ? 'opacity-50 pointer-events-none ring-1 ring-gold-500/20' : ''}`}
        >
            <div 
                {...attributes} 
                {...listeners} 
                className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gold-500 transition-colors"
            >
                <HiOutlineSelector className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${!isActive ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                    {feature.feature}
                </p>
            </div>

            <div className="flex items-center gap-3">
                {isUpdating ? (
                    <div className="flex items-center justify-center w-9 h-5">
                        <HiOutlineSpin className="w-4 h-4 animate-spin text-gold-500" />
                    </div>
                ) : (
                    <Switch 
                        checked={isActive} 
                        onChange={() => onToggleActive(feature)} 
                        disabled={isUpdating}
                    />
                )}
                
                <div className={`flex items-center gap-1 border-l border-gray-100 dark:border-gray-700 pl-2 ml-1 transition-opacity ${isUpdating ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button 
                        onClick={() => onEdit(feature)}
                        className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                        title="Edit"
                    >
                        <HiOutlinePencil className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => onDelete(feature.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        title="Hapus"
                    >
                        <HiOutlineTrash className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export function PlanConfigPage() {
    const { t } = useTranslation();
    const { plans, allFeatures, loading, fetchData, setAllFeatures } = usePlanStore();
    
    // Granular Loading States
    const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);
    const [updatingFeatureId, setUpdatingFeatureId] = useState<string | null>(null);
    const [addingToPlan, setAddingToPlan] = useState<string | null>(null);
    const [reorderingPlan, setReorderingPlan] = useState<string | null>(null);

    // Modals
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<MstPlanType | null>(null);
    const [planForm, setPlanForm] = useState<Partial<MstPlanType>>({});

    // Inline Feature Editing
    const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
    const [inlineFeatureValue, setInlineFeatureValue] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        fetchData();
    }, []);

    const handleSavePlan = async () => {
        if (!planForm.plan_type) return;
        setUpdatingPlan(planForm.plan_type);
        try {
            const res = await paymentApi.updatePlanType({
                plan_type: planForm.plan_type,
                guest_limit: Number(planForm.guest_limit),
                price: Number(planForm.price)
            }, { skipLoader: true });
            if (res.success) {
                toast.success('Paket diperbarui');
                setShowPlanModal(false);
                await fetchData(true, true);
            }
        } catch (error) {
            toast.error('Gagal update paket');
        } finally {
            setUpdatingPlan(null);
        }
    };

    const handleAddFeature = async (planId: string) => {
        if (!inlineFeatureValue.trim()) return;
        setUpdatingPlan(planId);
        
        const planFeats = allFeatures.filter(f => f.plan_id === planId);
        const maxOrder = Math.max(0, ...planFeats.map(f => Number(f.order_number) || 0));

        try {
            const res = await paymentApi.createPlanFeature({
                plan_id: planId as any,
                feature: inlineFeatureValue,
                order_number: maxOrder + 1,
                active: true
            }, { skipLoader: true });
            if (res.success) {
                toast.success('Fitur ditambahkan');
                setInlineFeatureValue('');
                setAddingToPlan(null);
                await fetchData(true, true);
            }
        } catch (error) {
            toast.error('Gagal tambah fitur');
        } finally {
            setUpdatingPlan(null);
        }
    };

    const handleUpdateFeature = async (id: string, updates: Partial<MstPlanFeature>) => {
        setUpdatingFeatureId(id);
        try {
            const res = await paymentApi.updatePlanFeature({ id, ...updates }, { skipLoader: true });
            if (res.success) {
                await fetchData(true, true);
            }
        } catch (error) {
            toast.error('Gagal update fitur');
        } finally {
            setUpdatingFeatureId(null);
        }
    };

    const handleDeleteFeature = async (id: string) => {
        if (!confirm('Hapus fitur ini?')) return;
        setUpdatingFeatureId(id);
        try {
            const res = await paymentApi.deletePlanFeature(id, { skipLoader: true });
            if (res.success) {
                toast.success('Fitur dihapus');
                await fetchData(true, true);
            }
        } catch (error) {
            toast.error('Gagal hapus fitur');
        } finally {
            setUpdatingFeatureId(null);
        }
    };

    const handleDragEnd = async (event: DragEndEvent, planId: string) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const planFeats = allFeatures.filter(f => f.plan_id === planId);
        const oldIndex = planFeats.findIndex(f => f.id === active.id);
        const newIndex = planFeats.findIndex(f => f.id === over.id);

        const newOrder = arrayMove(planFeats, oldIndex, newIndex);
        
        // Optimistic update
        const updatedAllFeatures = [...allFeatures];
        newOrder.forEach((item, index) => {
            const target = updatedAllFeatures.find(f => f.id === item.id);
            if (target) target.order_number = index + 1;
        });
        setAllFeatures(updatedAllFeatures);
        setReorderingPlan(planId);

        try {
            await paymentApi.bulkUpdatePlanFeatures(
                newOrder.map((f, i) => ({ id: f.id, order_number: i + 1 })),
                { skipLoader: true }
            );
            toast.success('Urutan diperbarui', { id: 'reorder' });
        } catch (error) {
            toast.error('Gagal simpan urutan');
            await fetchData(true, true);
        } finally {
            setReorderingPlan(null);
        }
    };

    if (loading && !plans.length) return <PageLoader />;

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-display font-bold text-gray-800 dark:text-white">
                        {t('sidebar.plan_config', 'Konfigurasi Paket')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Atur detail harga, limit, dan fitur unggulan layanan Digital Invitation
                    </p>
                </div>
                <button
                    onClick={() => fetchData(true)}
                    className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gold-500 text-gray-400 hover:text-gold-500 rounded-2xl transition-all shadow-sm"
                >
                    <HiOutlineRefresh className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {plans.map((plan) => {
                    const planFeatures = allFeatures
                        .filter(f => f.plan_id === plan.plan_type)
                        .sort((a, b) => Number(a.order_number) - Number(b.order_number));
                    
                    const isPlanUpdating = updatingPlan === plan.plan_type || reorderingPlan === plan.plan_type;

                    return (
                        <div 
                            key={plan.plan_type}
                            className={`bg-white dark:bg-wedding-dark-card rounded-[2.5rem] border border-gray-100 dark:border-gray-700 p-8 shadow-sm flex flex-col min-h-[600px] transition-all ${isPlanUpdating ? 'ring-2 ring-gold-500/30 shadow-lg scale-[1.01]' : ''}`}
                        >
                            {/* Plan Header */}
                            <div className="flex items-center justify-between mb-8">
                                <span className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${
                                    plan.plan_type === 'premium' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                    plan.plan_type === 'pro' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                    {plan.plan_type}
                                </span>
                                <div className="flex items-center gap-2">
                                    {isPlanUpdating && <HiOutlineSpin className="w-4 h-4 animate-spin text-gold-500" />}
                                    <button 
                                        onClick={() => {
                                            setSelectedPlan(plan);
                                            setPlanForm({ ...plan });
                                            setShowPlanModal(true);
                                        }}
                                        className="p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 text-gray-400 hover:text-gold-500 hover:bg-gold-50 transition-all border border-transparent hover:border-gold-200"
                                    >
                                        <HiOutlinePencil className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Price Section */}
                            <div className="mb-10 p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-display font-bold text-gray-800 dark:text-white">
                                        Rp {plan.price.toLocaleString('id-ID')}
                                    </span>
                                    <span className="text-gray-400 text-sm font-medium">/event</span>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                                    <span className="text-xs text-gray-400 font-medium">Limit Tamu</span>
                                    <span className="text-sm font-bold text-gray-700 dark:text-white">
                                        {plan.guest_limit === 999999 ? 'Unlimited' : `${plan.guest_limit.toLocaleString('id-ID')} Tamu`}
                                    </span>
                                </div>
                            </div>

                            {/* Features Section */}
                            <div className="flex-1 flex flex-col space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-black uppercase tracking-wider text-gray-400">Features</h3>
                                        {reorderingPlan === plan.plan_type && <HiOutlineSpin className="w-3 h-3 animate-spin text-gold-500" />}
                                    </div>
                                    <button 
                                        disabled={isPlanUpdating}
                                        onClick={() => {
                                            setAddingToPlan(addingToPlan === plan.plan_type ? null : plan.plan_type);
                                            setInlineFeatureValue('');
                                        }}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            addingToPlan === plan.plan_type 
                                            ? 'bg-gray-100 text-gray-400 dark:bg-gray-800' 
                                            : 'bg-gold-500 text-white shadow-gold-sm hover:bg-gold-600'
                                        }`}
                                    >
                                        {addingToPlan === plan.plan_type ? <HiOutlineX className="w-4 h-4" /> : <HiOutlinePlus className="w-4 h-4" />}
                                        {addingToPlan === plan.plan_type ? 'Batal' : 'Tambah'}
                                    </button>
                                </div>

                                {/* Add Feature Inline Form */}
                                {addingToPlan === plan.plan_type && (
                                    <div className="p-4 bg-gold-50/50 dark:bg-gold-900/10 border border-gold-200 dark:border-gold-900/30 rounded-2xl animate-slide-down shadow-inner">
                                        <div className="flex flex-col gap-3">
                                            <input 
                                                autoFocus
                                                type="text" 
                                                placeholder="Nama fitur..."
                                                value={inlineFeatureValue}
                                                onChange={e => setInlineFeatureValue(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAddFeature(plan.plan_type)}
                                                className="w-full text-sm bg-white dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-gold-500 shadow-sm px-4 py-2.5"
                                            />
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        setAddingToPlan(null);
                                                        setInlineFeatureValue('');
                                                    }}
                                                    className="flex-1 px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                >
                                                    Batal
                                                </button>
                                                <button 
                                                    onClick={() => handleAddFeature(plan.plan_type)}
                                                    disabled={!inlineFeatureValue.trim() || updatingPlan === plan.plan_type}
                                                    className="flex-[2] py-2 bg-gold-500 text-white rounded-xl text-xs font-bold hover:bg-gold-600 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2"
                                                >
                                                    {updatingPlan === plan.plan_type ? <HiOutlineSpin className="w-4 h-4 animate-spin" /> : <HiOutlineCheck className="w-4 h-4" />}
                                                    Simpan Fitur
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Features List with DnD */}
                                <div className="flex-1 space-y-2.5 relative">
                                    {reorderingPlan === plan.plan_type && (
                                        <div className="absolute inset-0 z-10 bg-white/10 dark:bg-black/10 backdrop-blur-[1px] rounded-xl" />
                                    )}
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={(e) => handleDragEnd(e, plan.plan_type)}
                                    >
                                        <SortableContext
                                            items={planFeatures.map(f => f.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {planFeatures.map((f) => (
                                                editingFeatureId === f.id ? (
                                                    <div key={f.id} className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl animate-fade-in shadow-sm">
                                                        <div className="flex flex-col gap-3">
                                                            <div className="relative">
                                                                <input 
                                                                    autoFocus
                                                                    type="text" 
                                                                    value={inlineFeatureValue}
                                                                    onChange={e => setInlineFeatureValue(e.target.value)}
                                                                    onKeyDown={e => {
                                                                        if (e.key === 'Enter') {
                                                                            handleUpdateFeature(f.id, { feature: inlineFeatureValue });
                                                                            setEditingFeatureId(null);
                                                                        }
                                                                        if (e.key === 'Escape') setEditingFeatureId(null);
                                                                    }}
                                                                    className="w-full text-sm bg-white dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-blue-500 shadow-sm px-4 py-2.5"
                                                                />
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    onClick={() => setEditingFeatureId(null)}
                                                                    className="p-2.5 rounded-xl bg-white dark:bg-gray-800 text-gray-400 hover:text-red-500 border border-gray-100 dark:border-gray-700 transition-all shadow-sm"
                                                                    title="Batal"
                                                                >
                                                                    <HiOutlineX className="w-5 h-5" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => {
                                                                        handleUpdateFeature(f.id, { feature: inlineFeatureValue });
                                                                        setEditingFeatureId(null);
                                                                    }}
                                                                    disabled={updatingFeatureId === f.id}
                                                                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-2"
                                                                >
                                                                    {updatingFeatureId === f.id ? <HiOutlineSpin className="w-4 h-4 animate-spin" /> : <HiOutlineCheck className="w-4 h-4" />}
                                                                    Update
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <SortableFeatureItem 
                                                        key={f.id} 
                                                        feature={f} 
                                                        isUpdating={updatingFeatureId === f.id}
                                                        onEdit={(feat) => {
                                                            setEditingFeatureId(feat.id);
                                                            setInlineFeatureValue(feat.feature);
                                                            setAddingToPlan(null);
                                                        }}
                                                        onDelete={handleDeleteFeature}
                                                        onToggleActive={(feat) => handleUpdateFeature(feat.id, { active: String(feat.active) === 'false' })}
                                                    />
                                                )
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                    
                                    {!planFeatures.length && !addingToPlan && (
                                        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-[2.5rem] bg-gray-50/30 dark:bg-transparent group hover:border-gold-300 transition-colors">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-300 mb-3 group-hover:text-gold-400 transition-colors">
                                                <HiOutlinePlus className="w-6 h-6" />
                                            </div>
                                            <p className="text-xs text-gray-400 font-medium tracking-wide">Belum ada fitur</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Plan Edit Modal */}
            <Modal
                isOpen={showPlanModal}
                onClose={() => setShowPlanModal(false)}
                title={`Edit Paket: ${selectedPlan?.plan_type?.toUpperCase()}`}
                footer={
                    <div className="flex gap-3">
                        <button onClick={() => setShowPlanModal(false)} className="btn-ghost flex-1">Batal</button>
                        <button 
                            onClick={handleSavePlan} 
                            disabled={!!updatingPlan}
                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                            {updatingPlan ? <HiOutlineSpin className="w-4 h-4 animate-spin" /> : 'Simpan Perubahan'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div>
                        <label className="label-field">Limit Tamu</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={planForm.guest_limit || ''}
                                onChange={(e) => setPlanForm({ ...planForm, guest_limit: parseInt(e.target.value) || 0 })}
                                className="input-field pr-20"
                                placeholder="0"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold uppercase">Tamu</div>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1 italic">
                            <HiOutlineChevronRight className="w-3 h-3" /> Gunakan 999999 untuk kuota tak terbatas
                        </p>
                    </div>
                    <div>
                        <label className="label-field">Harga Paket (Rp)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">Rp</span>
                            <input
                                type="text"
                                value={planForm.price ? planForm.price.toLocaleString('id-ID') : ''}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                                    setPlanForm({ ...planForm, price: val });
                                }}
                                className="input-field pl-12"
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
