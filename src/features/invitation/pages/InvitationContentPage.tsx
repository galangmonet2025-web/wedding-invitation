import { useEffect, useState, useMemo, useRef, forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parse } from 'date-fns';
import { useBlocker } from 'react-router-dom';
import { tenantApi, quotesApi } from '@/core/api/endpoints';
import { useInvitationContentStore } from '../store/invitationContentStore';
import { Modal } from '@/shared/components/Modal';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Button } from '@/shared/components/Button';
import { IconButton } from '@/shared/components/IconButton';
import { PageLoader } from '@/shared/components/Loading';
import type { InvitationContent, Theme, QuotesVariant } from '@/types';
import { useTranslation } from 'react-i18next';
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
    HiOutlineX,
    HiOutlineRefresh,
    HiOutlineCalendar,
    HiOutlineCheck,
    HiOutlineClock
} from 'react-icons/hi';
import type { TimelineItem } from '@/types';
import { useAuthStore } from '@/features/auth/store/authStore';
import { ProxyImage } from '@/shared/components/ProxyImage';
import { MapTutorialModal } from '../components/MapTutorialModal';
import { ImageUpload } from '@/shared/components/ImageUpload';
import { AutoTextarea } from '@/shared/components/AutoTextarea';
import { QrisUpload } from '@/shared/components/QrisUpload';
import { imageApi } from '@/core/api/imageApi';
import { useBackgroundTaskStore } from '@/shared/store/backgroundTaskStore';
import { useAdminHeaderActionStore } from '@/shared/store/adminHeaderActionStore';
import { useBasePath } from '@/shared/hooks/useBasePath';
import type { ImageRecord } from '@/types';
import { useThemeStore } from '@/features/admin/store/themeStore';
import { Lightbox } from '@/shared/components/Lightbox';


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
        <div
            className={`group rounded-2xl border bg-white dark:bg-gray-900 overflow-hidden transition-all duration-300
                ${isOpen
                    ? 'border-gold-200 dark:border-gold-900/40 shadow-lg shadow-gold-500/5 ring-1 ring-gold-100 dark:ring-gold-900/20'
                    : 'border-gray-100 dark:border-gray-800 shadow-sm hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-md'}`}
        >
            <button
                type="button"
                className="w-full flex items-center justify-between gap-3 text-left p-4 sm:p-5"
                onClick={() => onToggle(id)}
            >
                <div className="flex items-center gap-3.5 min-w-0">
                    <div
                        className={`grid place-items-center w-11 h-11 rounded-xl ${iconBg} ${iconColor} flex-shrink-0 transition-transform duration-300 group-hover:scale-105 ${isOpen ? 'scale-105' : ''}`}
                    >
                        {icon}
                    </div>
                    <h2 className="text-[15px] sm:text-base font-semibold text-gray-800 dark:text-white truncate tracking-tight">{title}</h2>
                </div>
                <div
                    className={`grid place-items-center w-8 h-8 rounded-full flex-shrink-0 transition-all duration-300
                        ${isOpen ? 'bg-gold-500 text-white rotate-180' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'}`}
                >
                    <HiOutlineChevronDown className="w-4 h-4" />
                </div>
            </button>
            {isOpen && (
                <div className="px-4 sm:px-5 pb-5 pt-1 space-y-4 animate-fade-in">
                    <div className="border-t border-dashed border-gray-100 dark:border-gray-800 pt-4 space-y-4">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};

// Robust ID equality. The Sheets backend can return IDs as numbers or with stray
// whitespace, so a strict `===` between tenant.theme_id and theme.id fails even
// when they're "the same" — which is why an already-selected theme showed no
// indicator on return to this page. Compare as trimmed strings.
const sameId = (a: any, b: any) =>
    a != null && b != null && String(a).trim() === String(b).trim();

export function InvitationContentPage() {
    const {
        content, 
        images, 
        loading, 
        hasLoadedContent, 
        hasLoadedImages,
        fetchContent, 
        fetchImages, 
        updateContent,
        setContent,
        deleteImage,
        bulkDeleteImages,
        addImage,
        removeImageLocally
    } = useInvitationContentStore();

    const { themes, fetchThemes } = useThemeStore();
    const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);

    // Master Quotes
    const [activeQuotes, setActiveQuotes] = useState<QuotesVariant[]>([]);
    const [selectedQuotesId, setSelectedQuotesId] = useState<string>('');
    const [customQuotesEnabled, setCustomQuotesEnabled] = useState(false);
    const [customQuotes, setCustomQuotes] = useState<Record<string, string>>({});
    const { tenant, updateTenant: updateAuthTenant } = useAuthStore();
    const [iframeKey, setIframeKey] = useState(0);
    const { t } = useTranslation();
    const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set(['mempelai', 'acara', 'hadiah', 'teks', 'cerita']));
    const [currentStep, setCurrentStep] = useState(1);
    const { tasks } = useBackgroundTaskStore();
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const [isDirty, setIsDirty] = useState(false);
    // Holds the latest autoSaveInBackground closure so the nav-blocker effect can
    // call it without a stale-closure / temporal-dead-zone problem.
    const autoSaveInBackgroundRef = useRef<(() => void) | null>(null);
    const isUploadingGallery = tasks.some(t => t.status === 'running' && t.id.startsWith('upload-gallery'));

    // Compute timelineItems from content.timeline_kisah
    const timelineItems = useMemo(() => {
        try {
            if (content?.timeline_kisah) {
                const parsed = JSON.parse(content.timeline_kisah);
                return Array.isArray(parsed) ? parsed : [];
            }
        } catch (e) {
            console.error("Failed to parse timeline JSON:", e);
        }
        return [];
    }, [content?.timeline_kisah]);

    const setTimelineItems = (items: any[]) => {
        setContent({ ...content, timeline_kisah: JSON.stringify(items) });
        setIsDirty(true);
    };

    // Navigation Blocker (internal routing). We no longer prompt the user —
    // instead we silently flush any pending edits in the background and let the
    // navigation proceed, matching the auto-save behaviour on step changes.
    const blocker = useBlocker(isDirty);

    useEffect(() => {
        if (blocker.state === 'blocked') {
            autoSaveInBackgroundRef.current?.();
            blocker.proceed?.();
        }
    }, [blocker.state]);



    // Browser Blocker (refresh/tab close)
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);


    const steps = [
        { id: 1, title: t('invitation_content.step_content_title'), subTitle: t('invitation_content.step_content_subtitle') },
        { id: 2, title: t('invitation_content.step_gallery_title'), subTitle: t('invitation_content.step_gallery_subtitle') },
        { id: 3, title: t('invitation_content.step_media_title'), subTitle: t('invitation_content.step_media_subtitle') },
        { id: 4, title: t('invitation_content.step_theme_title'), subTitle: t('invitation_content.step_theme_subtitle') },
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
    const [lightboxImageIndex, setLightboxImageIndex] = useState<number | null>(null);

    const openLightbox = (image: ImageRecord) => {
        const idx = images.findIndex(img => img.id === image.id);
        if (idx !== -1) setLightboxImageIndex(idx);
    };

    const closeLightbox = () => setLightboxImageIndex(null);

    // ---- Gallery bulk-delete selection ----
    const [gallerySelectionMode, setGallerySelectionMode] = useState(false);
    const [selectedGalleryIds, setSelectedGalleryIds] = useState<Set<string>>(new Set());
    // 'selected' deletes the checked photos; 'all' deletes every gallery photo.
    const [galleryBulkMode, setGalleryBulkMode] = useState<'selected' | 'all' | null>(null);

    const galleryImages = useMemo(() => images.filter(img => img.image_type === 'gallery'), [images]);

    const toggleGallerySelected = (id: string) => {
        setSelectedGalleryIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const allGallerySelected = galleryImages.length > 0
        && galleryImages.every(img => selectedGalleryIds.has(img.id));

    const toggleSelectAllGallery = () => {
        if (allGallerySelected) setSelectedGalleryIds(new Set());
        else setSelectedGalleryIds(new Set(galleryImages.map(img => img.id)));
    };

    const exitGallerySelectionMode = () => {
        setGallerySelectionMode(false);
        setSelectedGalleryIds(new Set());
    };

    const handleGalleryBulkDeleteConfirmed = () => {
        const ids = galleryBulkMode === 'all'
            ? galleryImages.map(img => img.id)
            : galleryImages.filter(img => selectedGalleryIds.has(img.id)).map(img => img.id);

        // Close the confirm dialog and exit selection mode IMMEDIATELY — the user
        // shouldn't have to wait for the (slow) Drive deletion to finish. The store
        // removes the photos optimistically and toasts on success/failure, so the
        // deletion runs entirely in the background.
        setGalleryBulkMode(null);
        exitGallerySelectionMode();

        if (ids.length === 0) return;
        void bulkDeleteImages(ids);
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

    // Force a fresh content fetch ONCE on mount so content.theme_id reflects the
    // Tenants sheet RIGHT NOW (the picker seeds its selection from it). Without the
    // force, a cached content from an earlier session — predating a theme change or
    // the backend adding theme_id — would leave the picker seeded from the stale
    // auth-store value. Mount-only so it can't clobber unsaved edits mid-session.
    useEffect(() => {
        fetchContent(true, tenant);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Tracks whether the selected theme has been seeded from the authoritative
    // fresh source (content.theme_id) OR a user click. Once true, the stale
    // auth-store seed below must NOT override it.
    const seededThemeRef = useRef(false);

    useEffect(() => {
        // Force a fresh fetch: the theme picker must reflect the CURRENT published
        // themes. The store caches via `hasLoaded`, so without force a session that
        // loaded the list before a theme was published (e.g. the playable game
        // themes) would keep showing the stale list until a hard reload.
        fetchThemes(true);
        fetchContent(false, tenant);
        fetchImages();

        // Provisional seed from the auth store (may be stale). Only until the fresh
        // content.theme_id lands (effect below) or the user picks a card.
        if (!seededThemeRef.current && tenant?.theme_id) setSelectedThemeId(tenant.theme_id);
    }, [tenant]);

    // Authoritative seed: content.theme_id is read straight from the Tenants sheet
    // by getInvitationContent, so it's always current. The auth store's
    // tenant.theme_id can be stale (impersonation, or a save in a prior session),
    // which is what left the picker pointing at the OLD theme (no checkmark).
    useEffect(() => {
        if (seededThemeRef.current) return;
        const freshThemeId = (content as any)?.theme_id;
        if (freshThemeId) {
            seededThemeRef.current = true;
            setSelectedThemeId(String(freshThemeId));
        }
    }, [content]);

    // Load active quotes (master + tenant own) and initialize selection
    useEffect(() => {
        let mounted = true;
        quotesApi.getActiveQuotes({ skipLoader: true } as any).then((res) => {
            if (!mounted || !res.success) return;
            const list = res.data || [];
            setActiveQuotes(list);

            // Determine initial selection: tenant.quotes_id -> default -> first
            const isDefault = (q: QuotesVariant) => q.flag_default_quotes === true || q.flag_default_quotes === 'TRUE' || q.flag_default_quotes === 'true';
            let initial = tenant?.quotes_id && list.find((q) => q.id === tenant.quotes_id);
            if (!initial) initial = list.find(isDefault);
            if (!initial) initial = list[0];

            if (initial) {
                setSelectedQuotesId(initial.id);
                // If the tenant's current quote is their own custom row, pre-fill custom editor
                const ownsCustom = !!tenant?.id && initial.tenant_id === tenant.id;
                if (ownsCustom) {
                    setCustomQuotesEnabled(true);
                    const c: Record<string, string> = {};
                    for (let i = 1; i <= 7; i++) {
                        c[`quote_${i}`] = (initial as any)[`quote_${i}`] || '';
                        c[`quote_by_${i}`] = (initial as any)[`quote_by_${i}`] || '';
                    }
                    setCustomQuotes(c);
                }
            }
        }).catch(() => {});
        return () => { mounted = false; };
    }, [tenant?.id]);

    // The quote object currently driving the preview / read-only table
    const selectedQuote = useMemo<Partial<QuotesVariant>>(() => {
        if (customQuotesEnabled) return customQuotes as Partial<QuotesVariant>;
        return activeQuotes.find((q) => q.id === selectedQuotesId) || {};
    }, [customQuotesEnabled, customQuotes, activeQuotes, selectedQuotesId]);

    // Live Preview Synchronization
    useEffect(() => {
        // Disable on mobile/tablet (less than 1024px) to save performance
        const isMobile = window.innerWidth < 1024;
        if (isMobile || !iframeRef.current || !content) return;

        const syncPreview = () => {
            if (iframeRef.current?.contentWindow) {
                const selectedThemeObj = themes.find(t => sameId(t.id, selectedThemeId));
                iframeRef.current.contentWindow.postMessage({
                    type: 'invitation-preview-update',
                    content: content,
                    images: images,
                    theme: selectedThemeObj,
                    quotes: selectedQuote
                }, '*');
            }
        };

        // Trigger on debounce (2 seconds after last change)
        const timeout = setTimeout(syncPreview, 2000);

        // Also trigger immediately when user leaves any input field
        const handleBlur = (e: FocusEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
                syncPreview();
            }
        };

        window.addEventListener('blur', handleBlur, true);

        return () => {
            clearTimeout(timeout);
            window.removeEventListener('blur', handleBlur, true);
        };
    }, [content, images, selectedThemeId, themes, selectedQuote]);



    // Core persistence: writes content + theme + quotes. Returns whether the
    // content write succeeded. Shared by the silent auto-save below.
    const persistAll = async (): Promise<boolean> => {
        if (!content || !tenant) return false;
        const success = await updateContent(content);

        // Save theme selection if changed. Compare against the FRESH content.theme_id
        // (from the Tenants sheet) first, falling back to the auth-store value — the
        // auth store can be stale, which would otherwise report a phantom change.
        const currentThemeId = (content as any)?.theme_id ?? tenant.theme_id;
        if (!sameId(selectedThemeId, currentThemeId)) {
            await tenantApi.updateTenant({
                id: tenant.id,
                theme_id: selectedThemeId || undefined
            });
            // Patch-merge (NOT {...tenant}): a later updateAuthTenant in this same
            // flow (e.g. quotes below) must not clobber the theme_id we just set.
            updateAuthTenant({ theme_id: selectedThemeId || undefined });
        }

        // Save quotes selection (custom upsert or master pick)
        try {
            if (customQuotesEnabled) {
                const res = await quotesApi.saveTenantQuotes({
                    custom: true,
                    ...customQuotes,
                } as any, { skipLoader: true } as any);
                if (res.success && res.data?.quotes_id) {
                    updateAuthTenant({ quotes_id: res.data.quotes_id });
                }
            } else if (selectedQuotesId && selectedQuotesId !== tenant.quotes_id) {
                const res = await quotesApi.saveTenantQuotes({
                    custom: false,
                    quotes_id: selectedQuotesId,
                } as any, { skipLoader: true } as any);
                if (res.success) {
                    updateAuthTenant({ quotes_id: selectedQuotesId });
                }
            }
        } catch (e) {
            console.error('Save quotes error:', e);
        }
        return success;
    };

    // Silent background auto-save. No loading UI; only surfaces a toast if the
    // save actually fails. Fired automatically when the user leaves a step that
    // has unsaved edits, so there's no "Save settings" button to forget.
    const autoSaveInBackground = () => {
        if (!isDirty || !content || !tenant) return;
        // Optimistically clear the dirty flag so navigation isn't blocked and we
        // don't double-fire; the actual write happens in the background.
        setIsDirty(false);
        (async () => {
            try {
                const success = await persistAll();
                if (success) {
                    setIframeKey(prev => prev + 1);
                } else {
                    toast.error(t('invitation_content.save_error', 'Gagal menyimpan perubahan'));
                    setIsDirty(true); // let a later navigation retry the save
                }
            } catch (error) {
                console.error('Auto-save error:', error);
                toast.error(t('invitation_content.save_error', 'Gagal menyimpan perubahan'));
                setIsDirty(true);
            }
        })();
    };

    // Keep the ref pointing at the latest closure for the nav-blocker effect.
    autoSaveInBackgroundRef.current = autoSaveInBackground;

    // Explicit "Selesai/Simpan" on the last step. Unlike the silent auto-save it
    // ALWAYS persists (even when isDirty is false but the selected theme differs
    // from what's stored) and gives the user visible loading/success feedback —
    // so clicking Save never looks like a no-op.
    const [finishing, setFinishing] = useState(false);
    const handleFinish = async () => {
        if (finishing || !content || !tenant) return;
        const themeChanged = !sameId(selectedThemeId, (content as any)?.theme_id ?? tenant.theme_id);
        // Nothing to write and theme unchanged → still confirm so it doesn't feel dead.
        if (!isDirty && !themeChanged) {
            toast.success(t('invitation_content.autosave_saved', 'Semua perubahan tersimpan'));
            return;
        }
        setFinishing(true);
        setIsDirty(false);
        toast.loading(t('invitation_content.saving', 'Menyimpan...'), { id: 'inv-save' });
        try {
            const success = await persistAll();
            if (success) {
                setIframeKey(prev => prev + 1);
                toast.success(t('invitation_content.save_success', 'Pengaturan berhasil disimpan'), { id: 'inv-save' });
            } else {
                setIsDirty(true);
                toast.error(t('invitation_content.save_error', 'Gagal menyimpan perubahan'), { id: 'inv-save' });
            }
        } catch (error) {
            console.error('Save error:', error);
            setIsDirty(true);
            toast.error(t('invitation_content.save_error', 'Gagal menyimpan perubahan'), { id: 'inv-save' });
        } finally {
            setFinishing(false);
        }
    };

    // Move between wizard steps, auto-saving any edits made on the current step
    // before switching. This replaces the old manual "Save settings" button.
    const goToStep = (next: number) => {
        if (next === currentStep) return;
        autoSaveInBackground();
        setCurrentStep(next);
    };

    const handleRefresh = async () => {
        toast.loading(t('invitation_content.refresh_loading'), { id: 'refresh-data' });
        await Promise.all([fetchContent(true), fetchImages(true)]);
        toast.success(t('invitation_content.refresh_success'), { id: 'refresh-data' });
    };

    // On the new /admin layout, inject the refresh button into the gold header
    // (next to "Buka Undangan"). On the legacy /private layout there's no such
    // slot, so we keep an in-page refresh button instead (see below).
    const base = useBasePath();
    const isAdminLayout = base === '/admin';
    const setHeaderAction = useAdminHeaderActionStore(s => s.setAction);
    useEffect(() => {
        if (!isAdminLayout) return;
        setHeaderAction(
            <button
                onClick={handleRefresh}
                disabled={loading}
                title={t('invitation_content.refresh_tooltip') as string}
                aria-label={t('invitation_content.refresh_tooltip') as string}
                className="admin-icon-btn"
            >
                <HiOutlineRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
        );
        return () => setHeaderAction(null);
    }, [loading, isAdminLayout]);

    const updateField = (field: keyof InvitationContent, value: any) => {
        setContent({ ...content, [field]: value });
        setIsDirty(true);
    };

    // Safe boolean parsing since DB might return 'TRUE' or boolean true
    const getBool = (val: any) => String(val).toLowerCase() === 'true';

    // Date formatting helpers
    const formatToDisplay = (dateStr: string) => {
        if (!dateStr) return '';
        if (dateStr.includes('/')) return dateStr;
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
    };

    const formatToValue = (displayStr: string) => {
        if (!displayStr) return '';
        // If already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(displayStr)) return displayStr;

        const digits = displayStr.replace(/\D/g, '');
        if (digits.length === 8) {
            const d = digits.substring(0, 2);
            const m = digits.substring(2, 4);
            const y = digits.substring(4, 8);
            return `${y}-${m}-${d}`;
        }
        return displayStr;
    };

    const handleDateChange = (field: keyof InvitationContent, displayVal: string) => {
        // As the user types, we keep the display format in the store temporarily?
        // No, let's keep the display format ONLY in the input and update the store when it's valid.
        // Actually, for simplicity, let's store the display format in the store 
        // and convert it just before saving in handleSave.
        updateField(field, displayVal);
    };

    const CustomDateInput = forwardRef(({ value, onClick, placeholder }: any, ref: any) => (
        <div className="relative cursor-pointer" onClick={onClick}>
            <input
                ref={ref}
                value={value}
                readOnly
                placeholder={placeholder}
                className="input-field pr-12 w-full cursor-pointer"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <HiOutlineCalendar className="w-5 h-5" />
            </div>
        </div>
    ));

    const DateInput = ({ value, onChange, placeholder = "DD/MM/YYYY" }: { value: string, onChange: (val: string) => void, placeholder?: string }) => {
        // value is YYYY-MM-DD
        const dateValue = useMemo(() => {
            if (!value) return null;
            const parsed = parse(value, 'yyyy-MM-dd', new Date());
            return isNaN(parsed.getTime()) ? null : parsed;
        }, [value]);

        return (
            <div className="relative premium-datepicker">
                <DatePicker
                    selected={dateValue}
                    onChange={(date: Date | null) => {
                        if (date) {
                            onChange(format(date, 'yyyy-MM-dd'));
                        } else {
                            onChange('');
                        }
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText={placeholder}
                    className="input-field pr-12 w-full"
                    autoComplete="off"
                    showYearDropdown
                    scrollableYearDropdown
                    yearDropdownItemNumber={15}
                    customInput={<CustomDateInput placeholder={placeholder} />}
                />
                <style>{`
                    .premium-datepicker .react-datepicker-wrapper {
                        width: 100%;
                    }
                    .premium-datepicker .react-datepicker {
                        font-family: inherit;
                        border-radius: 12px;
                        border: 1px solid #e5e7eb;
                        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                        overflow: hidden;
                    }
                    .premium-datepicker .react-datepicker__header {
                        background-color: #fff;
                        border-bottom: 1px solid #f3f4f6;
                        padding-top: 12px;
                    }
                    .premium-datepicker .react-datepicker__day--selected {
                        background-color: #d4af37 !important;
                        color: #fff !important;
                        border-radius: 8px;
                    }
                    .premium-datepicker .react-datepicker__day:hover {
                        background-color: #fefce8;
                        border-radius: 8px;
                    }
                    .premium-datepicker .react-datepicker__current-month {
                        color: #1f2937;
                        font-weight: 700;
                    }
                `}</style>
            </div>
        );
    };

    // Time input with a custom clock icon (native spinner/arrow is stripped in
    // CSS via .time-input-wrap). Clicking the icon opens the native picker.
    const TimeInput = ({ value, onChange, title }: { value: string; onChange: (val: string) => void; title?: string }) => {
        const ref = useRef<HTMLInputElement>(null);
        const openPicker = () => {
            const el = ref.current as (HTMLInputElement & { showPicker?: () => void }) | null;
            if (!el) return;
            try { el.showPicker?.(); } catch { /* showPicker unsupported — the field itself is still tappable */ }
            el.focus();
        };
        return (
            <div className="time-input-wrap flex-1">
                <input
                    ref={ref}
                    type="time"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="input-field shadow-none"
                    title={title}
                />
                <HiOutlineClock className="time-input-icon w-5 h-5" onClick={openPicker} />
            </div>
        );
    };

    const isInitialLoading = !hasLoadedContent || !content;
    if (loading && isInitialLoading) return <PageLoader />;
    if (!content) return <PageLoader />;

    return (
        <div className="space-y-6 animate-fade-in w-full max-w-[1600px] mx-auto pb-20">
            {/* On /admin the refresh action lives in the header (injected via the
                header-action store), so this top row is only rendered on the
                legacy /private layout, where it just holds the refresh button. */}
            {!isAdminLayout && (
                <div className="flex items-center justify-end">
                    <IconButton
                        onClick={handleRefresh}
                        title={t('invitation_content.refresh_tooltip')}
                        spinning={loading}
                        icon={<HiOutlineRefresh className="w-5 h-5" />}
                    />
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6">

                {/* LEFT PANE: Form Settings */}
                <div className="w-full lg:w-[70%] flex-shrink-0 flex flex-col gap-6 pb-20">
                    {/* Stepper Header */}
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-5 py-5 shadow-sm overflow-hidden">
                        {/* Soft gold glow accent */}
                        <div className="pointer-events-none absolute -top-16 -right-10 w-40 h-40 bg-gold-400/10 rounded-full blur-3xl" />

                        {/* Current-step label + progress count (mobile shows this in place of per-step labels) */}
                        <div className="flex items-end justify-between mb-4 sm:hidden">
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-600">{t('common.step', 'Langkah')} {currentStep}/{steps.length}</p>
                                <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{steps[currentStep - 1]?.title}</p>
                            </div>
                        </div>

                        <div className="relative flex items-center justify-between">
                            {steps.map((step, idx) => {
                                const isActive = currentStep === step.id;
                                const isDone = currentStep > step.id;
                                return (
                                    <div key={step.id} className="flex items-center flex-1 last:flex-none">
                                        <div
                                            onClick={() => goToStep(step.id)}
                                            className="flex flex-col items-center gap-2 cursor-pointer group"
                                        >
                                            <div className={`relative w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-300
                                                    ${isActive ? 'bg-gradient-to-br from-gold-400 to-gold-600 text-white shadow-lg shadow-gold-500/30 scale-105' :
                                                    isDone ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'}`}>
                                                {isDone ? (
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : step.id}
                                                {isActive && <span className="absolute inset-0 rounded-2xl ring-4 ring-gold-200/50 dark:ring-gold-900/30 animate-pulse" />}
                                            </div>
                                            <div className="hidden sm:flex flex-col items-center text-center max-w-[110px]">
                                                <span className={`text-xs font-bold leading-tight transition-colors ${isActive ? 'text-gold-600' : isDone ? 'text-emerald-600' : 'text-gray-500'}`}>{step.title}</span>
                                                <span className="text-[10px] text-gray-400 mt-0.5 font-medium leading-tight">{step.subTitle}</span>
                                            </div>
                                        </div>
                                        {idx < steps.length - 1 && (
                                            <div className="flex-1 h-1 mx-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                                <div className={`h-full rounded-full bg-emerald-500 transition-all duration-500 ${isDone ? 'w-full' : 'w-0'}`} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Step Content Content */}
                    <div className="flex flex-col gap-6 animate-fade-in w-full min-h-[500px]">

                        {/* STEP 1: ISI KONTEN */}
                        {currentStep === 1 && (
                            <div className="space-y-6 animate-slide-up content-form-compact">
                                <AccordionItem id="mempelai" isOpen={openAccordions.has('mempelai')} onToggle={toggleAccordion} icon={<HiOutlineUserGroup className="w-5 h-5" />} iconBg="bg-rose-50 dark:bg-rose-900/20" iconColor="text-rose-600" title={t('invitation_content.couple_info')}>
                                    <div className="space-y-6">
                                        {/* ================= MEMPELAI UTAMA ================= */}
                                        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-4">
                                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('invitation_content.main_couple_data')}</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="label-field">{t('invitation_content.groom_full_name')}</label>
                                                    <input type="text" value={content.groom_name || ''} onChange={(e) => updateField('groom_name', e.target.value)} className="input-field" placeholder="e.g. Romeo" />
                                                </div>
                                                <div>
                                                    <label className="label-field">{t('invitation_content.bride_full_name')}</label>
                                                    <input type="text" value={content.bride_name || ''} onChange={(e) => updateField('bride_name', e.target.value)} className="input-field" placeholder="e.g. Juliet" />
                                                </div>
                                                <div>
                                                    <label className="label-field">{t('invitation_content.groom_nickname')}</label>
                                                    <input type="text" value={content.groom_nickname || ''} onChange={(e) => updateField('groom_nickname', e.target.value)} className="input-field" placeholder="e.g. Romi" />
                                                </div>
                                                <div>
                                                    <label className="label-field">{t('invitation_content.bride_nickname')}</label>
                                                    <input type="text" value={content.bride_nickname || ''} onChange={(e) => updateField('bride_nickname', e.target.value)} className="input-field" placeholder="e.g. Juli" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="label-field">{t('auth.religion_label')}</label>
                                                    <select value={content.religion || ''} onChange={(e) => updateField('religion', e.target.value)} className="select-field">
                                                        <option value="" disabled>{t('auth.religion_placeholder')}</option>
                                                        <option value="Islam">Islam</option>
                                                        <option value="Kristen Protestan">Kristen Protestan</option>
                                                        <option value="Katolik">Katolik</option>
                                                        <option value="Hindu">Hindu</option>
                                                        <option value="Buddha">Buddha</option>
                                                        <option value="Konghucu">Konghucu</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ================= SOCIAL MEDIA ================= */}
                                        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('invitation_content.social_media_links')}</p>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded text-gold-500 focus:ring-gold-500"
                                                        checked={getBool(content.flag_tampilkan_sosial_media_mempelai)}
                                                        onChange={(e) => updateField('flag_tampilkan_sosial_media_mempelai', e.target.checked)}
                                                    />
                                                    <span className="text-xs font-medium text-gray-500">{t('invitation_content.show_label')}</span>
                                                </label>
                                            </div>
                                            {getBool(content.flag_tampilkan_sosial_media_mempelai) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                                                    <div>
                                                        <label className="label-field">{t('invitation_content.groom_ig')}</label>
                                                        <input type="text" value={content.account_media_sosial_laki_laki || ''} onChange={(e) => updateField('account_media_sosial_laki_laki', e.target.value)} className="input-field" prefix="@" />
                                                    </div>
                                                    <div>
                                                        <label className="label-field">{t('invitation_content.bride_ig')}</label>
                                                        <input type="text" value={content.account_media_sosial_perempuan || ''} onChange={(e) => updateField('account_media_sosial_perempuan', e.target.value)} className="input-field" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* ================= PARENTS ================= */}
                                        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('invitation_content.parents_name')}</p>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded text-gold-500 focus:ring-gold-500"
                                                        checked={getBool(content.flag_tampilkan_nama_orang_tua)}
                                                        onChange={(e) => updateField('flag_tampilkan_nama_orang_tua', e.target.checked)}
                                                    />
                                                    <span className="text-xs font-medium text-gray-500">{t('invitation_content.show_label')}</span>
                                                </label>
                                            </div>
                                            {getBool(content.flag_tampilkan_nama_orang_tua) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                                                    <div className="space-y-3">
                                                        <p className="text-xs font-bold text-gray-400 uppercase">{t('invitation_content.groom_parents')}</p>
                                                        <input type="text" value={content.nama_bapak_laki_laki || ''} onChange={(e) => updateField('nama_bapak_laki_laki', e.target.value)} className="input-field text-sm" placeholder={t('invitation_content.father_name')} />
                                                        <input type="text" value={content.nama_ibu_laki_laki || ''} onChange={(e) => updateField('nama_ibu_laki_laki', e.target.value)} className="input-field text-sm" placeholder={t('invitation_content.mother_name')} />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <p className="text-xs font-bold text-gray-400 uppercase">{t('invitation_content.bride_parents')}</p>
                                                        <input type="text" value={content.nama_bapak_perempuan || ''} onChange={(e) => updateField('nama_bapak_perempuan', e.target.value)} className="input-field text-sm" placeholder={t('invitation_content.father_name')} />
                                                        <input type="text" value={content.nama_ibu_perempuan || ''} onChange={(e) => updateField('nama_ibu_perempuan', e.target.value)} className="input-field text-sm" placeholder={t('invitation_content.mother_name')} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </AccordionItem>

                                <AccordionItem id="acara" isOpen={openAccordions.has('acara')} onToggle={toggleAccordion} icon={<HiOutlineMap className="w-5 h-5" />} iconBg="bg-blue-50 dark:bg-blue-900/20" iconColor="text-blue-600" title={t('invitation_content.location_info')}>
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
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('invitation_content.different_location_note')}</span>
                                            </label>

                                            {/* Event Dates & Times */}
                                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-4">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('invitation_content.wedding_schedule')}</p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="label-field">{t('invitation_content.akad_date')}</label>
                                                        <DateInput value={content.tanggal_akad || ''} onChange={(val) => updateField('tanggal_akad', val)} />
                                                    </div>
                                                    <div>
                                                        <label className="label-field">{t('invitation_content.resepsi_date')}</label>
                                                        <DateInput value={content.wedding_date || ''} onChange={(val) => updateField('wedding_date', val)} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-3">
                                                        <label className="label-field mb-0">{t('invitation_content.akad_time')}</label>
                                                        <div className="flex items-center gap-2">
                                                            <TimeInput value={content.jam_awal_akad || ''} onChange={(val) => updateField('jam_awal_akad', val)} title={t('invitation_content.start_time')} />
                                                            <span className="text-gray-400">-</span>
                                                            <TimeInput value={content.jam_akhir_akad || ''} onChange={(val) => updateField('jam_akhir_akad', val)} title={t('invitation_content.end_time')} />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label className="label-field mb-0">{t('invitation_content.resepsi_time')}</label>
                                                        <div className="flex items-center gap-2">
                                                            <TimeInput value={content.jam_awal_resepsi || ''} onChange={(val) => updateField('jam_awal_resepsi', val)} title={t('invitation_content.start_time')} />
                                                            <span className="text-gray-400">-</span>
                                                            <TimeInput value={content.jam_akhir_resepsi || ''} onChange={(val) => updateField('jam_akhir_resepsi', val)} title={t('invitation_content.end_time')} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-3">
                                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('invitation_content.akad_location')}</p>
                                                    <div>
                                                        <label className="label-field">{t('invitation_content.place_name')}</label>
                                                        <input type="text" value={content.nama_lokasi_akad || ''} onChange={(e) => updateField('nama_lokasi_akad', e.target.value)} className="input-field" placeholder={t('invitation_content.place_name_placeholder_akad')} />
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="label-field">{t('invitation_content.address_info')}</label>
                                                            <AutoTextarea value={content.keterangan_lokasi_akad || ''} onChange={(e) => updateField('keterangan_lokasi_akad', e.target.value)} className="input-field" minRows={2} placeholder={t('invitation_content.address_placeholder_akad')} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <label className="label-field mb-0">{t('invitation_content.maps_link')}</label>
                                                                <button
                                                                    type="button"
                                                                    title={t('invitation_content.open_maps')}
                                                                    onClick={() => window.open('https://www.google.com/maps', '_blank')}
                                                                    className="text-xs flex items-center gap-1 text-gold-600 hover:text-gold-700 font-medium bg-gold-50 px-2.5 py-1 rounded-md transition-colors"
                                                                >
                                                                    <HiOutlineMap className="w-3.5 h-3.5" /> {t('invitation_content.open_maps')}
                                                                </button>
                                                            </div>
                                                            <input type="url" value={content.akad_map || ''} onChange={(e) => updateField('akad_map', e.target.value)} className="input-field" placeholder="https://maps.app.goo.gl/..." />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowTutorialModal(true)}
                                                                className="mt-2 text-[10px] inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg font-bold transition-all border border-blue-100/50 shadow-sm"
                                                            >
                                                                <HiOutlineVideoCamera className="w-3.5 h-3.5" /> {t('invitation_content.how_to_get_maps')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {getBool(content.flag_lokasi_akad_dan_resepsi_berbeda) && (
                                                    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-3">
                                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('invitation_content.resepsi_location')}</p>
                                                        <div>
                                                            <label className="label-field">{t('invitation_content.place_name')}</label>
                                                            <input type="text" value={content.nama_lokasi_resepsi || ''} onChange={(e) => updateField('nama_lokasi_resepsi', e.target.value)} className="input-field" placeholder={t('invitation_content.place_name_placeholder_resepsi')} />
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="label-field">{t('invitation_content.address_info')}</label>
                                                                <AutoTextarea value={content.keterangan_lokasi_resepsi || ''} onChange={(e) => updateField('keterangan_lokasi_resepsi', e.target.value)} className="input-field" minRows={2} placeholder={t('invitation_content.address_placeholder_resepsi')} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <label className="label-field mb-0">{t('invitation_content.maps_link')}</label>
                                                                    <button
                                                                        type="button"
                                                                        title={t('invitation_content.open_maps')}
                                                                        onClick={() => window.open('https://www.google.com/maps', '_blank')}
                                                                        className="text-xs flex items-center gap-1 text-gold-600 hover:text-gold-700 font-medium bg-gold-50 px-2.5 py-1 rounded-md transition-colors"
                                                                    >
                                                                        <HiOutlineMap className="w-3.5 h-3.5" /> {t('invitation_content.open_maps')}
                                                                    </button>
                                                                </div>
                                                                <input type="url" value={content.resepsi_map || ''} onChange={(e) => updateField('resepsi_map', e.target.value)} className="input-field" placeholder="https://maps.app.goo.gl/..." />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowTutorialModal(true)}
                                                                    className="mt-2 text-[10px] inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg font-bold transition-all border border-blue-100/50 shadow-sm"
                                                                >
                                                                    <HiOutlineVideoCamera className="w-3.5 h-3.5" /> {t('invitation_content.how_to_get_maps')}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </AccordionItem>

                                <AccordionItem id="hadiah" isOpen={openAccordions.has('hadiah')} onToggle={toggleAccordion} icon={<HiOutlineCreditCard className="w-5 h-5" />} iconBg="bg-gold-50 dark:bg-gold-900/20" iconColor="text-gold-600" title={t('invitation_content.gift_info')}>
                                    <div className="space-y-6">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-gray-100 dark:border-gray-800 w-fit">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 dark:bg-gray-900 dark:border-gray-700"
                                                    checked={getBool(content.tampilkan_amplop_online)}
                                                    onChange={(e) => updateField('tampilkan_amplop_online', e.target.checked)}
                                                />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('invitation_content.enable_digital_envelope')}</span>
                                            </label>

                                            {getBool(content.tampilkan_amplop_online) && (
                                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-gray-100 dark:border-gray-800 w-fit">
                                                    <input
                                                        type="checkbox"
                                                        className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 dark:bg-gray-900 dark:border-gray-700"
                                                        checked={getBool(content.flag_pakai_2_rekening)}
                                                        onChange={(e) => updateField('flag_pakai_2_rekening', e.target.checked)}
                                                    />
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('invitation_content.use_2_accounts')}</span>
                                                </label>
                                            )}
                                        </div>

                                        {getBool(content.tampilkan_amplop_online) && (
                                            <div className={`grid grid-cols-1 ${getBool(content.flag_pakai_2_rekening) ? 'md:grid-cols-2' : ''} gap-6 pt-2`}>
                                                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-3">
                                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('invitation_content.bank_account_1')}</p>
                                                    <div>
                                                        <label className="label-field">{t('invitation_content.bank_name')}</label>
                                                        <input type="text" value={content.nama_bank_1 || ''} onChange={(e) => updateField('nama_bank_1', e.target.value)} className="input-field" />
                                                    </div>
                                                    <div>
                                                        <label className="label-field">{t('invitation_content.account_holder')}</label>
                                                        <input type="text" value={content.nama_rekening_bank_1 || ''} onChange={(e) => updateField('nama_rekening_bank_1', e.target.value)} className="input-field" />
                                                    </div>
                                                    {!getBool(content.flag_pakai_qris_rekening_1) && (
                                                        <div>
                                                            <label className="label-field">{t('invitation_content.account_number')}</label>
                                                            <input type="text" value={content.nomor_rekening_bank_1 || ''} onChange={(e) => updateField('nomor_rekening_bank_1', e.target.value)} className="input-field font-mono" />
                                                            <p className="text-[10px] text-gray-500 mt-1 italic leading-tight">
                                                                {t('invitation_content.qris_note')}
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                                        <label className="flex items-center gap-2 cursor-pointer mb-3 w-fit">
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 rounded text-gold-500 focus:ring-gold-500 dark:bg-gray-900 dark:border-gray-700"
                                                                checked={getBool(content.flag_pakai_qris_rekening_1)}
                                                                onChange={(e) => updateField('flag_pakai_qris_rekening_1', e.target.checked)}
                                                            />
                                                            <span className="text-sm text-gray-700 dark:text-gray-300">{t('invitation_content.use_qris')}</span>
                                                        </label>
                                                        {getBool(content.flag_pakai_qris_rekening_1) && (
                                                            <div className="w-full">
                                                                <QrisUpload
                                                                    imageType="qris_1"
                                                                    title={t('invitation_content.upload_qris_1')}
                                                                    currentImageUrl={content.gambar_qris_rekening_1}
                                                                    onUploadSuccess={(url) => updateContent({ gambar_qris_rekening_1: url })}
                                                                    onDeleteSuccess={async () => await updateContent({ gambar_qris_rekening_1: '' })}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {getBool(content.flag_pakai_2_rekening) && (
                                                    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-3">
                                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('invitation_content.bank_account_2')}</p>
                                                        
                                                        <div className="space-y-3 pt-2">
                                                            <div>
                                                                <label className="label-field">{t('invitation_content.bank_name')}</label>
                                                                <input type="text" value={content.nama_bank_2 || ''} onChange={(e) => updateField('nama_bank_2', e.target.value)} className="input-field" />
                                                            </div>
                                                            <div>
                                                                <label className="label-field">{t('invitation_content.account_holder')}</label>
                                                                <input type="text" value={content.nama_rekening_bank_2 || ''} onChange={(e) => updateField('nama_rekening_bank_2', e.target.value)} className="input-field" />
                                                            </div>
                                                            {!getBool(content.flag_pakai_qris_rekening_2) && (
                                                                <div>
                                                                    <label className="label-field">{t('invitation_content.account_number')}</label>
                                                                    <input type="text" value={content.nomor_rekening_bank_2 || ''} onChange={(e) => updateField('nomor_rekening_bank_2', e.target.value)} className="input-field font-mono" />
                                                                    <p className="text-[10px] text-gray-500 mt-1 italic leading-tight">
                                                                        {t('invitation_content.qris_note')}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            
                                                            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                                                <label className="flex items-center gap-2 cursor-pointer mb-3 w-fit">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="w-4 h-4 rounded text-gold-500 focus:ring-gold-500 dark:bg-gray-900 dark:border-gray-700"
                                                                        checked={getBool(content.flag_pakai_qris_rekening_2)}
                                                                        onChange={(e) => updateField('flag_pakai_qris_rekening_2', e.target.checked)}
                                                                    />
                                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('invitation_content.use_qris')}</span>
                                                                </label>
                                                                {getBool(content.flag_pakai_qris_rekening_2) && (
                                                                    <div className="w-full">
                                                                        <QrisUpload
                                                                            imageType="qris_2"
                                                                            title={t('invitation_content.upload_qris_2')}
                                                                            currentImageUrl={content.gambar_qris_rekening_2}
                                                                            onUploadSuccess={(url) => updateContent({ gambar_qris_rekening_2: url })}
                                                                            onDeleteSuccess={async () => await updateContent({ gambar_qris_rekening_2: '' })}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
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
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('invitation_content.physical_gift')}</span>
                                            </label>

                                            {getBool(content.flag_kirim_hadiah_offline) && (
                                                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 space-y-4 animate-fade-in">
                                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('invitation_content.gift_address_title')}</p>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="label-field">{t('invitation_content.receiver_name')}</label>
                                                            <input type="text" value={content.nama_lokasi_kirim_hadiah_offline || ''} onChange={(e) => updateField('nama_lokasi_kirim_hadiah_offline', e.target.value)} className="input-field" placeholder={t('invitation_content.receiver_placeholder')} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <label className="label-field mb-0">{t('invitation_content.maps_link_optional')}</label>
                                                                <button
                                                                    type="button"
                                                                    title={t('invitation_content.open_maps')}
                                                                    onClick={() => window.open('https://www.google.com/maps', '_blank')}
                                                                    className="text-xs flex items-center gap-1 text-gold-600 hover:text-gold-700 font-medium bg-gold-50 px-2.5 py-1 rounded-md transition-colors"
                                                                >
                                                                    <HiOutlineMap className="w-3.5 h-3.5" /> {t('invitation_content.open_maps')}
                                                                </button>
                                                            </div>
                                                            <input type="url" value={content.map_kirim_hadiah_offline || ''} onChange={(e) => updateField('map_kirim_hadiah_offline', e.target.value)} className="input-field" placeholder="https://maps.app.goo.gl/..." />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowTutorialModal(true)}
                                                                className="mt-2 text-[10px] inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg font-bold transition-all border border-blue-100/50 shadow-sm"
                                                            >
                                                                <HiOutlineVideoCamera className="w-3.5 h-3.5" /> {t('invitation_content.how_to_get_maps')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="label-field">{t('invitation_content.full_address_label')}</label>
                                                        <AutoTextarea value={content.alamat_lokasi_kirim_hadiah_offline || ''} onChange={(e) => updateField('alamat_lokasi_kirim_hadiah_offline', e.target.value)} className="input-field" minRows={2} placeholder={t('invitation_content.full_address_placeholder')} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </AccordionItem>

                                <AccordionItem id="cerita" isOpen={openAccordions.has('cerita')} onToggle={toggleAccordion} icon={<HiOutlineHeart className="w-5 h-5" />} iconBg="bg-rose-50 dark:bg-rose-900/20" iconColor="text-rose-600" title={t('invitation_content.love_story_title')}>
                                    <div className="space-y-4">
                                        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-gray-100 dark:border-gray-800">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 dark:bg-gray-900 dark:border-gray-700"
                                                checked={getBool(content.flag_pakai_timeline_kisah)}
                                                onChange={(e) => updateField('flag_pakai_timeline_kisah', e.target.checked)}
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('invitation_content.include_love_story')}</span>
                                        </label>

                                        {getBool(content.flag_pakai_timeline_kisah) && (
                                            <div className="pt-4 space-y-4 border-t border-gray-100 dark:border-gray-800">
                                                {timelineItems.map((item, idx) => (
                                                    <div key={idx} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 relative group space-y-3">
                                                        <button
                                                            onClick={() => setTimelineItems(timelineItems.filter((_, i) => i !== idx))}
                                                            className="absolute top-3 right-3 text-gray-400 hover:text-red-500 bg-white dark:bg-gray-900 rounded p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title={t('invitation_content.remove_story')}
                                                        >
                                                            <HiOutlineTrash className="w-4 h-4" />
                                                        </button>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="label-field text-xs">{t('invitation_content.date')}</label>
                                                                <DateInput value={item.tanggal} onChange={(val) => {
                                                                    const newArr = [...timelineItems];
                                                                    newArr[idx].tanggal = val;
                                                                    setTimelineItems(newArr);
                                                                }} />
                                                            </div>
                                                            <div>
                                                                <label className="label-field text-xs">{t('invitation_content.story_title_label')}</label>
                                                                <input type="text" value={item.judul} onChange={(e) => {
                                                                    const newArr = [...timelineItems];
                                                                    newArr[idx].judul = e.target.value;
                                                                    setTimelineItems(newArr);
                                                                }} className="input-field text-sm" placeholder={t('invitation_content.first_meet_placeholder')} />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="label-field text-xs">{t('invitation_content.story_description_label')}</label>
                                                            <AutoTextarea value={item.deskripsi} onChange={(e) => {
                                                                const newArr = [...timelineItems];
                                                                newArr[idx].deskripsi = e.target.value;
                                                                setTimelineItems(newArr);
                                                            }} className="input-field text-sm" minRows={2} placeholder={t('invitation_content.love_story_placeholder')} />
                                                        </div>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => setTimelineItems([...timelineItems, { tanggal: '', judul: '', deskripsi: '' }])}
                                                    className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-500 hover:text-gold-500 hover:border-gold-300 dark:hover:border-gold-700 hover:bg-gold-50 dark:hover:bg-gold-900/10 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <HiOutlinePlus className="w-4 h-4" />
                                                    {t('invitation_content.add_story_event')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </AccordionItem>

                                <AccordionItem id="teks" isOpen={openAccordions.has('teks')} onToggle={toggleAccordion} icon={<HiOutlineChatAlt2 className="w-5 h-5" />} iconBg="bg-pink-50 dark:bg-pink-900/20" iconColor="text-pink-600" title={t('invitation_content.custom_text_title')}>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                            <div className="space-y-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input type="checkbox" className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 dark:bg-gray-900 dark:border-gray-700" checked={getBool(content.flag_pakai_kalimat_pembuka_custom)} onChange={(e) => updateField('flag_pakai_kalimat_pembuka_custom', e.target.checked)} />
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('invitation_content.use_custom_opening')}</span>
                                                </label>
                                                {getBool(content.flag_pakai_kalimat_pembuka_custom) && (
                                                    <AutoTextarea value={content.kalimat_pembuka_undangan || ''} onChange={(e) => updateField('kalimat_pembuka_undangan', e.target.value)} className="input-field" minRows={3} placeholder={t('invitation_content.opening_placeholder')} />
                                                )}
                                            </div>
                                            <div className="space-y-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input type="checkbox" className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 dark:bg-gray-900 dark:border-gray-700" checked={getBool(content.flag_pakai_kalimat_penutup_custom)} onChange={(e) => updateField('flag_pakai_kalimat_penutup_custom', e.target.checked)} />
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('invitation_content.use_custom_closing')}</span>
                                                </label>
                                                {getBool(content.flag_pakai_kalimat_penutup_custom) && (
                                                    <AutoTextarea value={content.kalimat_penutup_undangan || ''} onChange={(e) => updateField('kalimat_penutup_undangan', e.target.value)} className="input-field" minRows={3} placeholder={t('invitation_content.closing_placeholder')} />
                                                )}
                                            </div>
                                            <div>
                                                <label className="label-field">{t('invitation_content.quote_label')}</label>
                                                <AutoTextarea value={content.custom_kalimat_1 || ''} onChange={(e) => updateField('custom_kalimat_1', e.target.value)} className="input-field" minRows={3} placeholder={t('invitation_content.quote_placeholder')} />
                                            </div>
                                            <div>
                                                <label className="label-field">{t('invitation_content.welcome_text_label')}</label>
                                                <AutoTextarea value={content.custom_kalimat_2 || ''} onChange={(e) => updateField('custom_kalimat_2', e.target.value)} className="input-field" minRows={3} placeholder={t('invitation_content.welcome_text_placeholder')} />
                                            </div>
                                            <div>
                                                <label className="label-field">{t('invitation_content.protocol_text_label')}</label>
                                                <AutoTextarea value={content.custom_kalimat_3 || ''} onChange={(e) => updateField('custom_kalimat_3', e.target.value)} className="input-field" minRows={3} placeholder={t('invitation_content.protocol_text_placeholder')} />
                                            </div>
                                            <div>
                                                <label className="label-field">{t('invitation_content.footer_text_label')}</label>
                                                <AutoTextarea value={content.custom_kalimat_4 || ''} onChange={(e) => updateField('custom_kalimat_4', e.target.value)} className="input-field" minRows={3} placeholder={t('invitation_content.footer_text_placeholder')} />
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
                                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{t('invitation_content.gallery_title')}</h2>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-6">{t('invitation_content.gallery_description')}</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {(() => {
                                            const activeTheme = themes.find(t => sameId(t.id, selectedThemeId));
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
                                                                    onUploadSuccess={addImage}
                                                                    onDeleteSuccess={removeImageLocally}
                                                                    onClick={openLightbox}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                    {typesList.includes('gallery') && (
                                                        <div className="col-span-full mt-6 border-t border-gray-100 dark:border-gray-800 pt-6">
                                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                                                                <h3 className="text-md font-semibold text-gray-800 dark:text-white">{t('invitation_content.album_photo')}</h3>
                                                                {(() => {
                                                                    const maxGallery = tenant?.plan_type === 'premium' ? 15 : tenant?.plan_type === 'pro' ? 10 : 5;
                                                                    const currentCount = images.filter(img => img.image_type === 'gallery').length;
                                                                    return (
                                                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${currentCount >= maxGallery ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30'}`}>
                                                                            {currentCount} / {maxGallery} {t('invitation_content.photos')} ({t('invitation_content.plan_label')} {tenant?.plan_type || 'basic'})
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </div>

                                                            {/* Bulk-delete toolbar */}
                                                            {galleryImages.length > 0 && (
                                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                                                                    <span className="text-[11px] text-gray-500">
                                                                        {gallerySelectionMode
                                                                            ? `${selectedGalleryIds.size} / ${galleryImages.length} dipilih`
                                                                            : `${galleryImages.length} foto`}
                                                                    </span>
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        {!gallerySelectionMode ? (
                                                                            <>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setGallerySelectionMode(true)}
                                                                                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                                                >
                                                                                    <HiOutlineCheck className="w-3.5 h-3.5" /> Pilih
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setGalleryBulkMode('all')}
                                                                                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                                                                >
                                                                                    <HiOutlineTrash className="w-3.5 h-3.5" /> Hapus Semua
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={toggleSelectAllGallery}
                                                                                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                                                >
                                                                                    <HiOutlineCheck className="w-3.5 h-3.5" /> {allGallerySelected ? 'Batal Pilih Semua' : 'Pilih Semua'}
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={selectedGalleryIds.size === 0}
                                                                                    onClick={() => setGalleryBulkMode('selected')}
                                                                                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-red-600 text-white border border-red-600 hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                                                >
                                                                                    <HiOutlineTrash className="w-3.5 h-3.5" /> Hapus Terpilih ({selectedGalleryIds.size})
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={exitGallerySelectionMode}
                                                                                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                                                >
                                                                                    <HiOutlineX className="w-3.5 h-3.5" /> Batal
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                                                {images.filter(img => img.image_type === 'gallery').map(img => (
                                                                    gallerySelectionMode ? (
                                                                        <div
                                                                            key={img.id}
                                                                            onClick={() => toggleGallerySelected(img.id)}
                                                                            className={`relative group rounded-xl overflow-hidden border-2 cursor-pointer transition-all aspect-square ${selectedGalleryIds.has(img.id) ? 'border-red-500 ring-2 ring-red-400/40' : 'border-gray-200 dark:border-gray-700'}`}
                                                                            title="Klik untuk memilih"
                                                                        >
                                                                            <ProxyImage src={img.cdn_url} alt={img.file_name} className="w-full h-full object-cover" />
                                                                            <div className={`absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded-md flex items-center justify-center shadow transition-colors ${selectedGalleryIds.has(img.id) ? 'bg-red-600 text-white' : 'bg-white/90 dark:bg-black/70 border border-gray-300 dark:border-gray-600'}`}>
                                                                                {selectedGalleryIds.has(img.id) && <HiOutlineCheck className="w-4 h-4" />}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div key={img.id} className="relative group">
                                                                            <ImageUpload
                                                                                imageType="gallery"
                                                                                title={t('invitation_content.gallery_label')}
                                                                                currentImage={img}
                                                                                onUploadSuccess={() => { }}
                                                                                onDeleteSuccess={removeImageLocally}
                                                                                onClick={openLightbox}
                                                                                aspectRatio="square"
                                                                            />
                                                                        </div>
                                                                    )
                                                                ))}
                                                                {(() => {
                                                                    if (gallerySelectionMode) return null;
                                                                    const maxGallery = tenant?.plan_type === 'premium' ? 15 : tenant?.plan_type === 'pro' ? 10 : 5;
                                                                    const currentCount = images.filter(img => img.image_type === 'gallery').length;
                                                                    const remainingCount = maxGallery - currentCount;
                                                                    return currentCount < maxGallery ? (
                                                                        <ImageUpload
                                                                            imageType="gallery"
                                                                            title={t('invitation_content.add_album_photo')}
                                                                            allowMultiple={true}
                                                                            maxFiles={remainingCount}
                                                                            onUploadSuccess={addImage}
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
                            <div className="space-y-6 animate-slide-up content-form-compact">
                                {/* SECTION: MEDIA & AUDIO */}
                                <div className="card p-6 border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                                            <HiOutlineMusicNote className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{t('invitation_content.music_background')}</h2>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="label-field">{t('invitation_content.music_url_label')}</label>
                                        <input type="text" autoComplete="off" value={content.link_backsound_music || ''} onChange={(e) => updateField('link_backsound_music', e.target.value)} className="input-field" placeholder="https://youtube.com/watch?v=..." />
                                        <p className="text-[10px] text-gray-400 mt-1">{t('invitation_content.music_url_note')}</p>
                                    </div>
                                </div>

                                {/* SECTION: LIVE STREAMING */}
                                <div className="card p-6 border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500">
                                            <HiOutlineVideoCamera className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{t('invitation_content.live_streaming')}</h2>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-gray-100 dark:border-gray-800">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 dark:bg-gray-900 dark:border-gray-700"
                                                checked={getBool(content.flag_pakai_live_streaming)}
                                                onChange={(e) => updateField('flag_pakai_live_streaming', e.target.checked)}
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('invitation_content.enable_live_streaming')}</span>
                                        </label>

                                        {getBool(content.flag_pakai_live_streaming) && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                                                <div>
                                                    <label className="label-field">{t('invitation_content.streaming_platform')}</label>
                                                    <input type="text" autoComplete="off" value={content.platform_live_streaming || ''} onChange={(e) => updateField('platform_live_streaming', e.target.value)} className="input-field" placeholder="YouTube" />
                                                </div>
                                                <div>
                                                    <label className="label-field">{t('invitation_content.streaming_link')}</label>
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
                                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{t('invitation_content.select_theme_title')}</h2>
                                    </div>
                                    <div className="flex flex-col gap-8 w-full">
                                        {(() => {
                                            const filteredThemes = themes.filter(theme => {
                                                // NOTE: a theme ABOVE the tenant's plan (e.g. premium theme on a
                                                // pro tenant) is intentionally NOT shown here, even if it's the
                                                // tenant's currently-assigned theme. The public invitation still
                                                // renders it (backend resolves by theme_id, no plan filter); it just
                                                // isn't offered as a choice — so such a tenant sees no selected card.

                                                // Filter out drafts
                                                const isDraft = typeof theme.flag_draft === 'boolean' ? theme.flag_draft : String(theme.flag_draft).toLowerCase() === 'true';
                                                if (isDraft) return false;

                                                // Filter based on plan type. Normalize both sides (trim + lowercase):
                                                // Sheet-sourced plan strings can carry stray casing/whitespace
                                                // (e.g. "Premium"), which would make a real premium tenant fall
                                                // through to the basic branch and hide every pro/premium theme —
                                                // including the playable game themes.
                                                if (!tenant) return false;
                                                const tenantPlan = String(tenant.plan_type ?? '').trim().toLowerCase();
                                                const themePlan = String(theme.plan_type ?? '').trim().toLowerCase();
                                                if (tenantPlan === 'premium') return true;
                                                if (tenantPlan === 'pro') return themePlan === 'basic' || themePlan === 'pro';
                                                return themePlan === 'basic';
                                            });

                                            if (filteredThemes.length === 0) {
                                                return <p className="text-gray-500 text-sm">{t('invitation_content.no_theme_available', { plan: tenant?.plan_type })}</p>;
                                            }

                                            // Group themes by style_category
                                            const groupedThemes = filteredThemes.reduce((acc, theme) => {
                                                const category = theme.style_category || 'Lainnya';
                                                if (!acc[category]) acc[category] = [];
                                                acc[category].push(theme);
                                                return acc;
                                            }, {} as Record<string, typeof filteredThemes>);

                                            return Object.entries(groupedThemes).map(([category, catThemes]) => (
                                                <div key={category} className="space-y-3">
                                                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 pb-2 uppercase text-xs tracking-wider">
                                                        {category}
                                                    </h3>
                                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                                        {catThemes.map(theme => (
                                                            <div
                                                                key={theme.id}
                                                                onClick={() => {
                                                                    if (sameId(theme.id, selectedThemeId)) return;
                                                                    // Lock the seed so a later content refetch can't
                                                                    // override the user's fresh choice.
                                                                    seededThemeRef.current = true;
                                                                    setSelectedThemeId(theme.id);
                                                                    // Mark dirty so the theme change is actually
                                                                    // persisted (autoSaveInBackground/persistAll are
                                                                    // gated on isDirty; without this the Save/Selesai
                                                                    // button no-ops on a theme-only change).
                                                                    setIsDirty(true);
                                                                }}
                                                                className={`cursor-pointer rounded-xl border-2 transition-all duration-200 overflow-hidden group
                                                                        ${sameId(selectedThemeId, theme.id) ? 'border-gold-500 shadow-lg shadow-gold-500/20 transform -translate-y-1' : 'border-gray-200 dark:border-gray-700 hover:border-gold-300 dark:hover:border-gold-700'}`}
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
                                                                    {sameId(selectedThemeId, theme.id) && (
                                                                        <div className="absolute inset-0 bg-gold-500/10 flex items-center justify-center">
                                                                            <div className="bg-gold-500 text-white p-2 rounded-full shadow-lg">
                                                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                                </svg>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="p-2 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex flex-col justify-between h-[60px]">
                                                                    <h3 className="font-semibold text-xs text-gray-800 dark:text-white truncate" title={theme.name}>{theme.name}</h3>
                                                                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded 
                                                                        ${theme.plan_type === 'basic' ? 'bg-gray-100 text-gray-600' :
                                                                            theme.plan_type === 'pro' ? 'bg-blue-100 text-blue-600' :
                                                                                'bg-gold-100 text-gold-600'}`}>
                                                                        {theme.plan_type}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>

                                {/* QUOTES PICKER */}
                                <div className="card p-6 border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg text-rose-600">
                                            <HiOutlineChatAlt2 className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{t('invitation_content.quotes_title', 'Pilih Quotes')}</h2>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="label-field">{t('invitation_content.quotes_select', 'Pilihan Quotes')}</label>
                                            <select
                                                value={selectedQuotesId}
                                                onChange={(e) => { setSelectedQuotesId(e.target.value); setIsDirty(true); }}
                                                disabled={customQuotesEnabled}
                                                className="select-field disabled:opacity-60"
                                            >
                                                {activeQuotes.length === 0 && <option value="">{t('invitation_content.quotes_empty', 'Belum ada quotes tersedia')}</option>}
                                                {activeQuotes.map((q) => (
                                                    <option key={q.id} value={q.id}>
                                                        {q.title}{q.religion_enum ? ` — ${q.religion_enum}` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded text-gold-600 focus:ring-gold-500 accent-gold-600"
                                                checked={customQuotesEnabled}
                                                onChange={(e) => {
                                                    const enabled = e.target.checked;
                                                    // When turning custom on for the first time, seed from the selected master quote
                                                    if (enabled && Object.keys(customQuotes).length === 0) {
                                                        const base = activeQuotes.find((q) => q.id === selectedQuotesId);
                                                        if (base) {
                                                            const seed: Record<string, string> = {};
                                                            for (let i = 1; i <= 7; i++) {
                                                                seed[`quote_${i}`] = (base as any)[`quote_${i}`] || '';
                                                                seed[`quote_by_${i}`] = (base as any)[`quote_by_${i}`] || '';
                                                            }
                                                            setCustomQuotes(seed);
                                                        }
                                                    }
                                                    setCustomQuotesEnabled(enabled);
                                                    setIsDirty(true);
                                                }}
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('invitation_content.quotes_custom', 'Buat quotes sendiri (custom)')}</span>
                                        </label>

                                        {/* Quotes list. Renders per-row Quote + Penulis fields.
                                            Desktop (sm+): side-by-side table columns.
                                            Mobile (<sm): stacked cards — Quote on top, Penulis below. */}
                                        {(() => {
                                            const renderQuote = (i: number) => customQuotesEnabled ? (
                                                <AutoTextarea
                                                    minRows={2}
                                                    value={customQuotes[`quote_${i}`] || ''}
                                                    onChange={(e) => { setCustomQuotes(prev => ({ ...prev, [`quote_${i}`]: e.target.value })); setIsDirty(true); }}
                                                    className="input-field text-sm"
                                                    placeholder={t('invitation_content.quotes_quote_placeholder', 'Isi quote...') as string}
                                                />
                                            ) : (
                                                <span className="text-gray-700 dark:text-gray-200">{(selectedQuote as any)[`quote_${i}`] || <span className="text-gray-300 dark:text-gray-600">—</span>}</span>
                                            );
                                            const renderBy = (i: number) => customQuotesEnabled ? (
                                                <input
                                                    type="text"
                                                    value={customQuotes[`quote_by_${i}`] || ''}
                                                    onChange={(e) => { setCustomQuotes(prev => ({ ...prev, [`quote_by_${i}`]: e.target.value })); setIsDirty(true); }}
                                                    className="input-field text-sm"
                                                    placeholder={t('invitation_content.quotes_by_placeholder', 'Penulis...') as string}
                                                />
                                            ) : (
                                                <span className="text-gray-600 dark:text-gray-300">{(selectedQuote as any)[`quote_by_${i}`] || <span className="text-gray-300 dark:text-gray-600">—</span>}</span>
                                            );

                                            return (
                                                <>
                                                    {/* Desktop table */}
                                                    <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                                    <th className="px-3 py-2 w-10">#</th>
                                                                    <th className="px-3 py-2">{t('invitation_content.quotes_quote', 'Quote')}</th>
                                                                    <th className="px-3 py-2 w-1/3">{t('invitation_content.quotes_by', 'Penulis / Sumber')}</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                                                                    <tr key={i} className="align-top">
                                                                        <td className="px-3 py-2 text-gray-400 font-medium">{i}</td>
                                                                        <td className="px-3 py-2">{renderQuote(i)}</td>
                                                                        <td className="px-3 py-2">{renderBy(i)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    {/* Mobile stacked cards — Quote on top, Penulis below */}
                                                    <div className="sm:hidden space-y-3">
                                                        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                                                            <div key={i} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 p-3 space-y-2.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="grid place-items-center w-6 h-6 rounded-full bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 text-xs font-bold flex-shrink-0">{i}</span>
                                                                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{t('invitation_content.quotes_quote', 'Quote')}</span>
                                                                </div>
                                                                {renderQuote(i)}
                                                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider pt-1">{t('invitation_content.quotes_by', 'Penulis / Sumber')}</p>
                                                                {renderBy(i)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Navigation Footer — edits are auto-saved on step change, so
                        the last step just finishes (also flushing any final edits). */}
                    <div className="flex items-center justify-between gap-3 p-4 sm:p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mt-auto">
                        <button
                            type="button"
                            disabled={currentStep === 1}
                            onClick={() => goToStep(currentStep - 1)}
                            className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border transition-all active:scale-95
                                ${currentStep === 1
                                    ? 'opacity-30 cursor-not-allowed border-gray-100 dark:border-gray-800 text-gray-400'
                                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'}`}
                        >
                            <HiOutlineChevronLeft className="w-5 h-5" />
                            {t('common.previous')}
                        </button>
                        <button
                            type="button"
                            disabled={finishing}
                            onClick={() => {
                                if (currentStep < 4) goToStep(currentStep + 1);
                                else handleFinish();
                            }}
                            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-gold-400 to-gold-600 shadow-lg shadow-gold-500/25 hover:shadow-gold-500/40 hover:brightness-105 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {currentStep < 4 ? (
                                <>
                                    {t('common.next')}
                                    <HiOutlineChevronRight className="w-5 h-5" />
                                </>
                            ) : finishing ? (
                                <>
                                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    {t('invitation_content.saving', 'Menyimpan...')}
                                </>
                            ) : (
                                <>
                                    <HiOutlineCheck className="w-5 h-5" />
                                    {t('invitation_content.finish', 'Selesai')}
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
                                    ref={iframeRef}
                                    src={`${window.location.origin}${import.meta.env.BASE_URL}#/${tenant.domain_slug}`}
                                    className="w-full h-full border-none pointer-events-auto"
                                    title="Invitation Preview"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm text-center px-6">
                                    {t('invitation_content.preview_not_available')}
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
            {lightboxImageIndex !== null && (
                <Lightbox
                    images={images.map(img => ({ 
                        url: img.cdn_url || img.drive_url,
                        file_name: img.file_name,
                        width: img.width,
                        height: img.height,
                        size_kb: img.size_kb
                    }))}
                    initialIndex={lightboxImageIndex}
                    onClose={closeLightbox}
                />
            )}

            {/* MODAL KONFIRMASI HAPUS FOTO GALERI (MASSAL) */}
            <ConfirmDialog
                isOpen={galleryBulkMode !== null}
                onClose={() => setGalleryBulkMode(null)}
                onConfirm={handleGalleryBulkDeleteConfirmed}
                title={galleryBulkMode === 'all' ? 'Hapus Semua Foto' : 'Hapus Foto Terpilih'}
                variant="danger"
                warningTitle="Konfirmasi Hapus"
                message={
                    galleryBulkMode === 'all'
                        ? <>Apakah Anda yakin ingin menghapus <b>SEMUA {galleryImages.length} foto</b> galeri? Foto akan dihapus permanen dari Google Drive di latar belakang dan tidak bisa dikembalikan.</>
                        : <>Apakah Anda yakin ingin menghapus <b>{selectedGalleryIds.size} foto</b> terpilih? Foto akan dihapus permanen dari Google Drive di latar belakang dan tidak bisa dikembalikan.</>
                }
                confirmLabel={galleryBulkMode === 'all' ? 'Ya, Hapus Semua' : `Ya, Hapus (${selectedGalleryIds.size})`}
            />

            {/* Unsaved-changes navigation prompt removed: edits now auto-save in
                the background when leaving a step or the page. */}
        </div>
    );
}
