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
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'
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

    // Plan-based accent colors
    const planId = feature.plan_id;
    const accentColor =
        planId === 'premium' ? 'purple' :
            planId === 'pro' ? 'blue' :
                'gold';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-2 p-2.5 rounded-xl group/feature transition-all duration-300 border shadow-sm ${isDragging ? 'shadow-2xl ring-2 ring-gold-500/50 z-50' : 'hover:shadow-md'
                } ${isUpdating ? 'opacity-50 pointer-events-none ring-1 ring-gold-500/20' : ''
                } ${accentColor === 'purple' ? 'bg-purple-50/30 dark:bg-purple-900/10 border-purple-100/50 dark:border-purple-800/20' :
                    accentColor === 'blue' ? 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-100/50 dark:border-blue-800/20' :
                        'bg-gold-50/30 dark:bg-gold-900/10 border-gold-100/50 dark:border-gold-800/20'
                }`}
        >
            <div
                {...attributes}
                {...listeners}
                className={`cursor-grab active:cursor-grabbing p-1 transition-colors tooltip tooltip-right ${accentColor === 'purple' ? 'text-purple-300 hover:text-purple-500' :
                        accentColor === 'blue' ? 'text-blue-300 hover:text-blue-500' :
                            'text-gold-300 hover:text-gold-500'
                    }`}
            >
                <HiOutlineSelector className="w-4 h-4" />
                <span className="tooltip-text">Geser urutan</span>
            </div>

            <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate transition-colors ${!isActive ? 'text-gray-400 line-through' :
                        accentColor === 'purple' ? 'text-purple-900 dark:text-purple-100' :
                            accentColor === 'blue' ? 'text-blue-900 dark:text-blue-100' :
                                'text-gray-700 dark:text-gray-200'
                    }`}>
                    {feature.feature}
                </p>
            </div>

            <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-1.5 mr-0.5 transition-all duration-300 ${isUpdating ? 'opacity-0 scale-95' : 'opacity-0 translate-x-2 group-hover/feature:opacity-100 group-hover/feature:translate-x-0'
                    }`}>
                    <button
                        onClick={() => onEdit(feature)}
                        className={`p-1.5 rounded-lg transition-colors tooltip tooltip-top ${accentColor === 'purple' ? 'text-purple-500 hover:bg-purple-100' :
                                accentColor === 'blue' ? 'text-blue-500 hover:bg-blue-100' :
                                    'text-gold-500 hover:bg-gold-100'
                            }`}
                    >
                        <HiOutlinePencil className="w-4 h-4" />
                        <span className="tooltip-text">Edit</span>
                    </button>
                    <button
                        onClick={() => onDelete(feature.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors tooltip tooltip-top"
                    >
                        <HiOutlineTrash className="w-4 h-4" />
                        <span className="tooltip-text">Hapus</span>
                    </button>
                </div>

                {isUpdating ? (
                    <div className="flex items-center justify-center w-8 h-4">
                        <HiOutlineSpin className="w-3.5 h-3.5 animate-spin text-gold-500" />
                    </div>
                ) : (
                    <Switch
                        checked={isActive}
                        onChange={() => onToggleActive(feature)}
                        disabled={isUpdating}
                    />
                )}
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

    // Delete Confirmation
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [featureToDelete, setFeatureToDelete] = useState<string | null>(null);

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

    const handleDeleteFeature = async () => {
        if (!featureToDelete) return;
        const id = featureToDelete;
        setUpdatingFeatureId(id);
        setShowDeleteModal(false);
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
            setFeatureToDelete(null);
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
                </div>
                <button
                    onClick={() => fetchData(true)}
                    className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gold-500 text-gray-400 hover:text-gold-500 rounded-2xl transition-all shadow-sm tooltip tooltip-bottom"
                >
                    <HiOutlineRefresh className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
                    <span className="tooltip-text">Refresh Data</span>
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
                            className={`relative group bg-white dark:bg-wedding-dark-card rounded-3xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm flex flex-col min-h-[500px] transition-all duration-500 hover:shadow-xl hover:border-gold-200/50 dark:hover:border-gold-500/30 ${isPlanUpdating ? 'ring-2 ring-gold-500/30 shadow-lg scale-[1.01]' : ''}`}
                        >
                            {/* Accent Top Line */}
                            <div className={`absolute top-0 left-8 right-8 h-1 rounded-b-full transition-all duration-500 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 -translate-y-1 ${plan.plan_type === 'premium' ? 'bg-purple-500 shadow-[0_4px_12px_rgba(168,85,247,0.4)]' :
                                    plan.plan_type === 'pro' ? 'bg-blue-500 shadow-[0_4px_12px_rgba(59,130,246,0.4)]' :
                                        'bg-gray-300 dark:bg-gray-600 shadow-sm'
                                }`} />

                            {/* Price Section */}
                            <div className={`mb-6 p-5 rounded-2xl border relative overflow-hidden group/price transition-all duration-500 shadow-sm ${plan.plan_type === 'premium' ? 'bg-gradient-to-br from-purple-500/15 via-purple-50/40 to-white dark:from-purple-500/20 dark:via-gray-800/50 dark:to-gray-900 border-purple-200 dark:border-purple-800/50' :
                                    plan.plan_type === 'pro' ? 'bg-gradient-to-br from-blue-500/15 via-blue-50/40 to-white dark:from-blue-500/20 dark:via-gray-800/50 dark:to-gray-900 border-blue-200 dark:border-blue-800/50' :
                                        'bg-gradient-to-br from-gold-500/15 via-gold-50/40 to-white dark:from-gold-500/20 dark:via-gray-800/50 dark:to-gray-900 border-gold-200 dark:border-gold-800/50'
                                }`}>
                                <div className={`absolute top-0 right-0 -mt-3 -mr-3 w-20 h-20 rounded-full blur-2xl transition-all duration-700 ${plan.plan_type === 'premium' ? 'bg-purple-500/25 group-hover/price:bg-purple-500/40' :
                                        plan.plan_type === 'pro' ? 'bg-blue-500/25 group-hover/price:bg-blue-500/40' :
                                            'bg-gold-500/25 group-hover/price:bg-gold-500/40'
                                    }`} />

                                {/* Integrated Header */}
                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm ${plan.plan_type === 'premium' ? 'bg-purple-500 text-white' :
                                            plan.plan_type === 'pro' ? 'bg-blue-500 text-white' :
                                                'bg-gold-500 text-white'
                                        }`}>
                                        {plan.plan_type}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {isPlanUpdating && <HiOutlineSpin className="w-3.5 h-3.5 animate-spin text-gold-500" />}
                                        <button
                                            onClick={() => {
                                                setSelectedPlan(plan);
                                                setPlanForm({ ...plan });
                                                setShowPlanModal(true);
                                            }}
                                            className="p-1.5 rounded-lg bg-white dark:bg-gray-800 text-gray-400 hover:text-gold-500 transition-all shadow-sm border border-gray-100 dark:border-gray-700 tooltip tooltip-top"
                                        >
                                            <HiOutlinePencil className="w-4 h-4" />
                                            <span className="tooltip-text">Edit Paket</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-0.5 relative z-10">
                                    <span className={`text-[9px] font-bold uppercase tracking-[0.15em] ${plan.plan_type === 'premium' ? 'text-purple-400' :
                                            plan.plan_type === 'pro' ? 'text-blue-400' :
                                                'text-gray-400'
                                        }`}>Harga Layanan</span>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-2xl font-display font-black text-gray-800 dark:text-white tracking-tight">
                                            Rp {plan.price.toLocaleString('id-ID')}
                                        </span>
                                        <span className="text-gray-400 text-[10px] font-medium italic">/event</span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-200/30 dark:border-gray-700/30 flex items-center justify-between relative z-10">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Kuota Tamu</span>
                                        <span className="text-xs font-bold text-gray-700 dark:text-white">
                                            {plan.guest_limit === 999999 ? 'Unlimited' : `${plan.guest_limit.toLocaleString('id-ID')} Tamu`}
                                        </span>
                                    </div>
                                    <div className={`p-1.5 rounded-lg transition-colors ${plan.plan_type === 'premium' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-500' :
                                            plan.plan_type === 'pro' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' :
                                                'bg-gold-50 dark:bg-gold-900/30 text-gold-500'
                                        }`}>
                                        <HiOutlineSelector className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>

                            {/* Features Section */}
                            <div className="flex-1 flex flex-col space-y-3">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-1 h-3 rounded-full ${plan.plan_type === 'premium' ? 'bg-purple-500' :
                                                plan.plan_type === 'pro' ? 'bg-blue-500' :
                                                    'bg-gold-500'
                                            }`} />
                                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Daftar Fitur</span>
                                        {reorderingPlan === plan.plan_type && <HiOutlineSpin className="w-2.5 h-2.5 animate-spin text-gold-500" />}
                                    </div>
                                    <button
                                        disabled={isPlanUpdating}
                                        onClick={() => {
                                            setAddingToPlan(addingToPlan === plan.plan_type ? null : plan.plan_type);
                                            setInlineFeatureValue('');
                                        }}
                                        className={`group/btn flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all duration-300 ${addingToPlan === plan.plan_type
                                                ? 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                                                : 'bg-white dark:bg-gray-800 text-gold-600 dark:text-gold-400 border border-gold-200 dark:border-gold-800 hover:bg-gold-500 hover:text-white hover:border-gold-500 shadow-sm active:scale-95'
                                            }`}
                                    >
                                        <div className={`transition-transform duration-300 ${addingToPlan === plan.plan_type ? 'rotate-90' : 'group-hover/btn:rotate-180'}`}>
                                            {addingToPlan === plan.plan_type ? <HiOutlineX className="w-3 h-3" /> : <HiOutlinePlus className="w-3 h-3" />}
                                        </div>
                                        <span>{addingToPlan === plan.plan_type ? 'Batal' : 'Tambah Fitur'}</span>
                                    </button>
                                </div>

                                {/* Add Feature Inline Form */}
                                {addingToPlan === plan.plan_type && (
                                    <div className={`p-3 border rounded-xl animate-slide-down shadow-inner transition-all duration-500 ${plan.plan_type === "premium" ? "bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-900/30" : plan.plan_type === "pro" ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30" : "bg-gold-50/50 dark:bg-gold-900/10 border-gold-200 dark:border-gold-900/30"}`}>
                                        <div className="flex flex-col gap-2">
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Nama fitur..."
                                                value={inlineFeatureValue}
                                                onChange={e => setInlineFeatureValue(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAddFeature(plan.plan_type)}
                                                className="w-full text-[11px] bg-white dark:bg-gray-900 border-none rounded-lg focus:ring-2 focus:ring-gold-500 shadow-sm px-3 py-1.5"
                                            />
                                            <button
                                                onClick={() => handleAddFeature(plan.plan_type)}
                                                disabled={!inlineFeatureValue.trim() || updatingPlan === plan.plan_type}
                                                className={`w-full py-1.5 text-white rounded-lg text-[10px] font-bold disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-1.5 ${plan.plan_type === 'premium' ? 'bg-purple-500 hover:bg-purple-600' :
                                                        plan.plan_type === 'pro' ? 'bg-blue-500 hover:bg-blue-600' :
                                                            'bg-gold-500 hover:bg-gold-600'
                                                    }`}
                                            >
                                                {updatingPlan === plan.plan_type ? <HiOutlineSpin className="w-3.5 h-3.5 animate-spin" /> : <HiOutlineCheck className="w-3.5 h-3.5" />}
                                                Simpan
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Features List with DnD */}
                                <div className="flex-1 space-y-2 relative">
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
                                                    <div className={`p-3 border rounded-xl animate-slide-down shadow-inner transition-all duration-500 mb-2 ${plan.plan_type === "premium" ? "bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-900/30" :
                                                            plan.plan_type === "pro" ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30" :
                                                                "bg-gold-50/50 dark:bg-gold-900/10 border-gold-200 dark:border-gold-900/30"
                                                        }`}>
                                                        <div className="flex flex-col gap-2">
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
                                                                className={`w-full text-[11px] bg-white dark:bg-gray-900 border-none rounded-lg focus:ring-2 shadow-sm px-3 py-1.5 ${plan.plan_type === 'premium' ? 'focus:ring-purple-500' :
                                                                        plan.plan_type === 'pro' ? 'focus:ring-blue-500' :
                                                                            'focus:ring-gold-500'
                                                                    }`}
                                                            />
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => setEditingFeatureId(null)}
                                                                    className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 transition-all text-[10px] font-bold"
                                                                >
                                                                    Batal
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        handleUpdateFeature(f.id, { feature: inlineFeatureValue });
                                                                        setEditingFeatureId(null);
                                                                    }}
                                                                    disabled={updatingFeatureId === f.id}
                                                                    className={`flex-1 py-1.5 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${plan.plan_type === 'premium' ? 'bg-purple-500 hover:bg-purple-600' :
                                                                            plan.plan_type === 'pro' ? 'bg-blue-500 hover:bg-blue-600' :
                                                                                'bg-gold-500 hover:bg-gold-600'
                                                                        }`}
                                                                >
                                                                    {updatingFeatureId === f.id ? <HiOutlineSpin className="w-3.5 h-3.5 animate-spin" /> : <HiOutlineCheck className="w-3.5 h-3.5" />}
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
                                                        onDelete={(id) => {
                                                            setFeatureToDelete(id);
                                                            setShowDeleteModal(true);
                                                        }}
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
                    <div className="flex justify-end gap-3 w-full">
                        <button onClick={() => setShowPlanModal(false)} className="btn-ghost px-5 py-1.5 text-sm">Batal</button>
                        <button
                            onClick={handleSavePlan}
                            disabled={!!updatingPlan}
                            className="btn-primary px-6 py-1.5 text-sm flex items-center justify-center gap-2"
                        >
                            {updatingPlan ? <HiOutlineSpin className="w-4 h-4 animate-spin" /> : 'Simpan Perubahan'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-5">
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

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Hapus Fitur Paket"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50">
                        <div className="flex gap-3 text-red-800 dark:text-red-400">
                            <HiOutlineTrash className="w-5 h-5 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-semibold text-base mb-1">Peringatan Penting!</p>
                                <p>Apakah Anda yakin ingin menghapus fitur ini?</p>
                                <p className="mt-2 text-xs opacity-80">Fitur ini akan dihapus dari paket dan tidak dapat dikembalikan.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setShowDeleteModal(false)} className="btn-ghost px-5 py-1.5 text-sm">Batal</button>
                        <button
                            onClick={handleDeleteFeature}
                            className="btn-danger py-1.5 px-6 text-sm"
                        >
                            Ya, Hapus Permanen
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
