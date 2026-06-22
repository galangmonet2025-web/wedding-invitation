import { useState, useEffect, useRef, useCallback } from 'react';
import { themeApi, tenantApi, publicApi } from '@/core/api/endpoints';
import imageCompression from 'browser-image-compression';
import { Theme, PlanType, Tenant, InvitationContent, ImageRecord, ThemeAssetMedia } from '@/types';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineSave, HiOutlineEye, HiOutlineInformationCircle, HiOutlineRefresh, HiOutlineX, HiOutlineTrash, HiOutlineUpload, HiCheck } from 'react-icons/hi';
import { Button } from '@/shared/components/Button';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Lightbox } from '@/shared/components/Lightbox';
import toast from 'react-hot-toast';
import { ThemeGuideModal } from '../components/ThemeGuideModal';
import { AiThemeModal } from '../components/AiThemeModal';
import { SimulationModal } from '../components/SimulationModal';
import { parseTemplate } from '@/utils/templateParser';
import Editor from '@monaco-editor/react';
import { imageApi } from '@/core/api/imageApi';
import { ProxyImage, fetchProxyImageBase64, setCachedImage, getCachedImage } from '@/shared/components/ProxyImage';
import html2canvas from 'html2canvas';
import { useThemeStore } from '../store/themeStore';
import { useTenantStore } from '../store/tenantStore';
import { usePreviewStore } from '../store/previewStore';
import { useBackgroundTaskStore } from '@/shared/store/backgroundTaskStore';
import sampleStory1 from '@/assets/img/sample_story_1.jpg';
import sampleStory2 from '@/assets/img/sample_story_2.jpg';
import sampleStory3 from '@/assets/img/sample_story_3.jpg';
import defaultFrame from '@/assets/img/frame.png';

const isValidImageUrl = (url: any): boolean => {
    if (!url || typeof url !== 'string') return false;
    const cleanUrl = url.includes('|') ? url.split('|')[1] : url;
    if (!cleanUrl) return false;
    const trimmed = cleanUrl.trim();
    if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null' || trimmed === 'none' || trimmed === 'default') return false;
    if (trimmed.startsWith('[object')) return false;
    return true;
};

const getDriveId = (url: string): string | null => {
    if (!url) return null;
    const cleanUrl = url.includes('|') ? url.split('|')[1] : url;
    if (!cleanUrl) return null;
    if (cleanUrl.match(/^[a-zA-Z0-9_-]{25,45}$/)) return cleanUrl; // Raw Drive ID
    let match = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    match = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    match = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    return null;
};

const resolveProxyUrl = (src: string): string => {
    if (!src) return '';
    const cleanSrc = src.includes('|') ? src.split('|')[1] : src;
    if (!cleanSrc) return '';
    if (cleanSrc.includes('action=imageProxy') || cleanSrc.startsWith('data:')) {
        return cleanSrc;
    }
    const driveId = getDriveId(cleanSrc);
    if (driveId) {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        return `${baseUrl}?action=imageProxy&id=${driveId}`;
    }
    return cleanSrc;
};

const extractDriveId = (url: string) => {
    if (!url) return null;
    const match = url.match(/[?&]id=([^&]+)/);
    return match ? match[1] : null;
};

// Robustly parse the theme.asset_media_list field (may arrive as array or JSON string)
const parseAssetMediaList = (raw: any): ThemeAssetMedia[] => {
    let list = raw || [];
    if (typeof list === 'string') {
        try { list = JSON.parse(list); } catch { list = []; }
    }
    return Array.isArray(list) ? list : [];
};

// Validate & normalize a YouTube URL; returns null if it is not a YouTube link.
const parseYoutubeUrl = (url: string): string | null => {
    if (!url) return null;
    const trimmed = url.trim();
    const re = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]{6,}/i;
    return re.test(trimmed) ? trimmed : null;
};

// Validate a theme code: lowercase letters, digits, dash & underscore only;
// no spaces/uppercase/other chars; and it must NOT be all digits (full-alphabet is fine).
// Returns an error message (Indonesian) or '' when valid. Empty string is treated as valid (code optional).
const validateThemeCode = (raw: string): string => {
    if (!raw) return '';
    if (/\s/.test(raw)) return 'Kode tidak boleh mengandung spasi.';
    if (/[A-Z]/.test(raw)) return 'Kode tidak boleh mengandung huruf besar.';
    if (!/^[a-z0-9_-]+$/.test(raw)) return 'Kode hanya boleh berisi huruf kecil, angka, tanda hubung (-), dan garis bawah (_).';
    if (/^[0-9]+$/.test(raw)) return 'Kode tidak boleh berupa angka semua.';
    return '';
};

export function ThemeEditorPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const isNew = !id || id === 'new';
    const isNewTheme = isNew;
    const copiedTheme: Theme | null = location.state?.copiedTheme || null;
    const { themes, addTheme, updateTheme, fetchThemes } = useThemeStore();
    const { tenants: allTenants, fetchTenants } = useTenantStore();
    const previewStore = usePreviewStore();
    const { addTask, updateTask } = useBackgroundTaskStore();

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false);
    const [showDataBinding, setShowDataBinding] = useState(true);
    const [showCover, setShowCover] = useState(true);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [showPreview, setShowPreview] = useState(() => {
        const saved = localStorage.getItem('theme-editor-show-preview');
        return saved !== 'false';
    });
    // Split ratio between editor (left) and live preview (right) on desktop:
    //  - 'desktop'  : editor lebih kecil dari preview (40 / 60)
    //  - 'balanced' : sama lebar (50 / 50) — kondisi default
    //  - 'mobile'   : editor lebih besar dari preview (60 / 40)
    const [layoutMode, setLayoutMode] = useState<'desktop' | 'balanced' | 'mobile'>(() => {
        const saved = localStorage.getItem('theme-editor-layout-mode');
        return saved === 'desktop' || saved === 'mobile' ? saved : 'balanced';
    });
    const [isCapturing, setIsCapturing] = useState(false);
    const [isPreviewUpdating, setIsPreviewUpdating] = useState(false);
    const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [isPreviewDragging, setIsPreviewDragging] = useState(false);
    const [pendingPreviewFile, setPendingPreviewFile] = useState<File | null>(null);
    const [pendingPreviewBase64, setPendingPreviewBase64] = useState<string | null>(null);
    const [initialPreviewImage, setInitialPreviewImage] = useState('');

    // Logo-like management states for preview image
    const [uploadingPreview, setUploadingPreview] = useState(false);
    const [deletingPreview, setDeletingPreview] = useState(false);
    const [showDeletePreviewModal, setShowDeletePreviewModal] = useState(false);
    const [showReplacePreviewModal, setShowReplacePreviewModal] = useState(false);
    const [pendingReplacePreviewFile, setPendingReplacePreviewFile] = useState<File | null>(null);


    // Form and Editor State
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState('');
    const [planType, setPlanType] = useState<PlanType>('basic');
    const [styleCategory, setStyleCategory] = useState('Lainnya');
    const [previewImage, setPreviewImage] = useState('');
    const [htmlCode, setHtmlCode] = useState('<!-- Tambahkan tombol dengan id="btn-open-invitation" di cover -->\n<div class="wedding-theme">\n  <h1>{{bride_name}} & {{groom_name}}</h1>\n  <button id="btn-open-invitation">Buka Undangan</button>\n</div>');
    const [cssCode, setCssCode] = useState('.wedding-theme {\n  text-align: center;\n  padding: 50px;\n}');
    const [jsCode, setJsCode] = useState('console.log("Theme Loaded!");');
    const [flagDraft, setFlagDraft] = useState(true);
    const [flagUseSystemActionButton, setFlagUseSystemActionButton] = useState(true);
    const [imageTypes, setImageTypes] = useState<string[]>([]);

    // Static theme asset media (images/videos that belong to the theme design itself)
    const [assetMediaList, setAssetMediaList] = useState<ThemeAssetMedia[]>([]);
    const [uploadingAsset, setUploadingAsset] = useState(false);
    // Codes currently being deleted — a Set so multiple assets can delete concurrently,
    // each keeping its own loading overlay until that delete truly finishes.
    const [deletingAssetCodes, setDeletingAssetCodes] = useState<Set<string>>(new Set());
    // Bulk-delete selection: when selectionMode is on, each asset card shows a checkbox
    // and the user can delete several (or all) assets at once via the serial queue.
    const [assetSelectionMode, setAssetSelectionMode] = useState(false);
    const [selectedAssetCodes, setSelectedAssetCodes] = useState<Set<string>>(new Set());
    // Bulk-delete confirmation modal: 'selected' deletes the checked assets, 'all' deletes every asset.
    const [bulkDeleteMode, setBulkDeleteMode] = useState<'selected' | 'all' | null>(null);
    const [isAssetDragging, setIsAssetDragging] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    // Which dropzone is currently "active" for paste (Ctrl+V). Set by clicking a box.
    const [activePasteZone, setActivePasteZone] = useState<'preview' | 'asset' | null>(null);
    // Lightbox state for viewing full images (asset grid + preview image)
    const [lightboxImages, setLightboxImages] = useState<{ url: string; caption?: string }[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const assetImageInputRef = useRef<HTMLInputElement>(null);
    const assetVideoInputRef = useRef<HTMLInputElement>(null);
    // Re-entrancy guard so a duplicate paste/drop can't upload the same files twice
    const assetUploadingRef = useRef(false);
    // Always-current asset list (avoids stale closures during serial deletes) +
    // a promise chain that serializes asset deletes one at a time.
    const assetMediaListRef = useRef<ThemeAssetMedia[]>([]);
    const assetDeleteQueueRef = useRef<Promise<void>>(Promise.resolve());
    // Debounce for persisting asset_media_list: rapid uploads/deletes collapse into a
    // single updateTheme call to stay well under the backend rate limit.
    const assetPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const assetPersistLatestRef = useRef<ThemeAssetMedia[] | null>(null);
    // Refs to the dropzone elements so clicking focuses them (enabling Ctrl+V paste)
    const previewDropRef = useRef<HTMLDivElement>(null);
    const assetDropRef = useRef<HTMLDivElement>(null);
    const previewFileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
    const [activeTabPanel, setActiveTabPanel] = useState<'editor' | 'settings'>('editor');
    const [guideActiveTab, setGuideActiveTab] = useState<'guide' | 'variables' | 'logic'>('guide');
    const [mockGuestData, setMockGuestData] = useState({
        nama_tamu: 'Nama Tamu Undangan',
        kode_tamu: 'GUEST-001',
        is_sudah_isi_ucapan: false,
        is_sudah_kirim_hadiah: false,
        is_sudah_isi_konfirmasi_kehadiran: false,
        is_link_umum: false,
    });

    // Refs for code to keep updatePreview stable
    const htmlCodeRef = useRef(htmlCode);
    const cssCodeRef = useRef(cssCode);
    const jsCodeRef = useRef(jsCode);
    // Ref to the latest updatePreview so early effects can trigger a refresh
    const updatePreviewRef = useRef<(force?: boolean) => void>(() => {});

    useEffect(() => { htmlCodeRef.current = htmlCode; }, [htmlCode]);
    useEffect(() => { cssCodeRef.current = cssCode; }, [cssCode]);
    useEffect(() => { jsCodeRef.current = jsCode; }, [jsCode]);

    // AI Theme Upload Handler
    const fileInputRef = useRef<HTMLInputElement>(null);

    const convertHtmlToHandlebars = (html: string): string => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Convert data-var
        doc.querySelectorAll('[data-var]').forEach(el => {
            const varName = el.getAttribute('data-var');
            el.removeAttribute('data-var');
            if (el.tagName === 'A' && (!el.getAttribute('href') || el.getAttribute('href') === '#' || el.getAttribute('href') === '')) {
                el.setAttribute('href', `{{${varName}}}`);
            } else {
                el.innerHTML = `{{${varName}}}`;
            }
        });

        // Convert data-img
        doc.querySelectorAll('[data-img]').forEach(el => {
            const varName = el.getAttribute('data-img');
            el.removeAttribute('data-img');
            el.setAttribute('src', `{{${varName}}}`);
        });

        // Convert data-bg
        doc.querySelectorAll('[data-bg]').forEach(el => {
            const varName = el.getAttribute('data-bg');
            el.removeAttribute('data-bg');
            const htmlEl = el as HTMLElement;
            const currentBg = htmlEl.style.backgroundImage;
            if (currentBg && currentBg.includes('url(')) {
                htmlEl.style.backgroundImage = currentBg.replace(/url\(['"]?[^)]+['"]?\)/gi, `url("{{${varName}}}")`);
            } else {
                htmlEl.style.backgroundImage = `url("{{${varName}}}")`;
            }
        });

        // Convert data-loop (Reverse order to handle nesting)
        const loopNodes = Array.from(doc.querySelectorAll('[data-loop]'));
        for (let i = loopNodes.length - 1; i >= 0; i--) {
            const el = loopNodes[i];
            const loopVar = el.getAttribute('data-loop');
            el.removeAttribute('data-loop');
            if (el.children.length > 0) {
                const template = el.children[0].outerHTML;
                el.innerHTML = `\n{{#each ${loopVar}}}\n${template}\n{{/each}}\n`;
            } else {
                const template = el.innerHTML;
                el.innerHTML = `\n{{#each ${loopVar}}}\n${template}\n{{/each}}\n`;
            }
        }

        // Convert data-if (Reverse order to handle nesting)
        const ifNodes = Array.from(doc.querySelectorAll('[data-if]'));
        for (let i = ifNodes.length - 1; i >= 0; i--) {
            const el = ifNodes[i];
            const condition = el.getAttribute('data-if');
            el.removeAttribute('data-if');
            const content = el.outerHTML;
            el.outerHTML = `\n{{#if ${condition}}}\n${content}\n{{/if}}\n`;
        }

        // Convert data-unless (Reverse order to handle nesting)
        const unlessNodes = Array.from(doc.querySelectorAll('[data-unless]'));
        for (let i = unlessNodes.length - 1; i >= 0; i--) {
            const el = unlessNodes[i];
            const condition = el.getAttribute('data-unless');
            el.removeAttribute('data-unless');
            const content = el.outerHTML;
            el.outerHTML = `\n{{#unless ${condition}}}\n${content}\n{{/unless}}\n`;
        }

        let resultHtml = doc.body ? doc.body.innerHTML : doc.documentElement.innerHTML;
        return resultHtml.trim();
    };

    const processRawCode = (codes: { html?: string; css?: string; js?: string }) => {
        let processedCount = 0;
        let lastType = '';

        if (codes.css) {
            setCssCode(codes.css);
            processedCount++;
            lastType = 'css';
        }
        if (codes.js) {
            let cleanJs = codes.js.replace(/<script[^>]*>/gi, '').replace(/<\/script>/gi, '');
            setJsCode(cleanJs);
            processedCount++;
            lastType = 'js';
        }
        if (codes.html) {
            try {
                const resultHtml = convertHtmlToHandlebars(codes.html);
                setHtmlCode(resultHtml);
                processedCount++;
                lastType = 'html';
            } catch (err) {
                console.error("Error parsing HTML:", err);
                toast.error("Gagal memproses kode HTML");
            }
        }

        if (processedCount > 0) {
            toast.success("Kode AI berhasil diterapkan!");
            setActiveTabPanel('editor');
            if (codes.html) setActiveTab('html');
            else if (codes.css) setActiveTab('css');
            else if (codes.js) setActiveTab('js');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        let rawHtml = '';
        let rawCss = '';
        let rawJs = '';

        for (const file of files) {
            const text = await file.text();
            const ext = file.name.split('.').pop()?.toLowerCase();

            if (ext === 'css') {
                rawCss = text;
            } else if (ext === 'js') {
                rawJs = text;
            } else if (ext === 'html') {
                rawHtml = text;
            }
        }

        processRawCode({ html: rawHtml, css: rawCss, js: rawJs });
        e.target.value = '';
    };

    // Preview iframe
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Preview state initialized from cache if available
    const [selectedPreviewTenantId, setSelectedPreviewTenantId] = useState<string>(previewStore.lastSelectedTenantId);
    const [previewContent, setPreviewContent] = useState<Partial<InvitationContent>>(previewStore.lastPreviewContent || {});
    const [previewImages, setPreviewImages] = useState<ImageRecord[]>(previewStore.lastPreviewImages || []);
    const [previewImagesB64, setPreviewImagesB64] = useState<Record<string, string>>(previewStore.lastPreviewImagesB64 || {});
    const [loadingPreview, setLoadingPreview] = useState(false);

    // One real tenant for preview context (derived from selection)
    const [previewTenant, setPreviewTenant] = useState<Tenant | null>(null);

    // WebsiteConfig branding for the preview (site_name, site_url, etc.) — same source as the live invitation page
    const [websiteConfig, setWebsiteConfig] = useState<any>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await publicApi.getWebsiteConfig();
                if (!cancelled && res.success) setWebsiteConfig(res.data);
            } catch (e) {
                console.error('Failed to load WebsiteConfig for theme preview:', e);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const loadData = async () => {
        try {
            // Background fetch tenants if not loaded
            fetchTenants();

            if (!isNewTheme) {
                // Ensure themes are loaded
                await fetchThemes();
                const theme = themes.find(t => t.id === id);

                if (theme) {
                    setName(theme.name);
                    setCode(theme.code || '');
                    setPlanType(theme.plan_type);
                    setStyleCategory(theme.style_category || 'Lainnya');
                    setPreviewImage(theme.preview_image || '');
                    setInitialPreviewImage(theme.preview_image || '');
                    setHtmlCode(theme.html_template || '');
                    setCssCode(theme.css_template || '');
                    setJsCode(theme.js_template || '');
                    setFlagDraft(theme.flag_draft !== false && theme.flag_draft !== 'false');
                    setFlagUseSystemActionButton(theme.flag_use_system_action_button !== false && theme.flag_use_system_action_button !== 'false');

                    // Robust image_types parsing
                    let imgTypes = theme.image_types || [];
                    if (typeof imgTypes === 'string') {
                        try { imgTypes = JSON.parse(imgTypes); } catch { imgTypes = []; }
                    }
                    setImageTypes(Array.isArray(imgTypes) ? imgTypes : []);
                    setAssetMediaList(parseAssetMediaList(theme.asset_media_list));
                } else {
                    // Try one more time by forcing fetch
                    await fetchThemes(true);
                    const refetchedTheme = useThemeStore.getState().themes.find(t => t.id === id);
                    if (refetchedTheme) {
                        setName(refetchedTheme.name);
                        setCode(refetchedTheme.code || '');
                        setPlanType(refetchedTheme.plan_type);
                        setStyleCategory(refetchedTheme.style_category || 'Lainnya');
                        setPreviewImage(refetchedTheme.preview_image || '');
                        setInitialPreviewImage(refetchedTheme.preview_image || '');
                        setHtmlCode(refetchedTheme.html_template || '');
                        setCssCode(refetchedTheme.css_template || '');
                        setJsCode(refetchedTheme.js_template || '');
                        setFlagDraft(refetchedTheme.flag_draft !== false && refetchedTheme.flag_draft !== 'false');
                        setFlagUseSystemActionButton(refetchedTheme.flag_use_system_action_button !== false && refetchedTheme.flag_use_system_action_button !== 'false');

                        // Robust image_types parsing
                        let imgTypes = refetchedTheme.image_types || [];
                        if (typeof imgTypes === 'string') {
                            try { imgTypes = JSON.parse(imgTypes); } catch { imgTypes = []; }
                        }
                        setImageTypes(Array.isArray(imgTypes) ? imgTypes : []);
                        setAssetMediaList(parseAssetMediaList(refetchedTheme.asset_media_list));
                    } else {
                        toast.error('Theme not found');
                        navigate('/private/themes');
                    }
                }
            } else if (copiedTheme) {
                // Pre-fill from copied theme
                setName(`${copiedTheme.name} (Copy)`);
                setCode('');
                setPlanType(copiedTheme.plan_type);
                setStyleCategory(copiedTheme.style_category || 'Lainnya');
                setPreviewImage(copiedTheme.preview_image || '');
                setHtmlCode(copiedTheme.html_template || '');
                setCssCode(copiedTheme.css_template || '');
                setJsCode(copiedTheme.js_template || '');
                setFlagDraft(true); // Default copies to draft
                setFlagUseSystemActionButton(copiedTheme.flag_use_system_action_button !== false && copiedTheme.flag_use_system_action_button !== 'false');

                // Robust image_types parsing
                let imgTypes = copiedTheme.image_types || [];
                if (typeof imgTypes === 'string') {
                    try { imgTypes = JSON.parse(imgTypes); } catch { imgTypes = []; }
                }
                setImageTypes(Array.isArray(imgTypes) ? imgTypes : []);
                // Copied theme starts with NO asset media — Drive files still belong to
                // the source theme; sharing references would break if either is deleted.
                setAssetMediaList([]);
            }
        } catch (err) {
            toast.error('Gagal memuat data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    // Handle tenant selection from store once loaded
    useEffect(() => {
        if (allTenants.length > 0 && !selectedPreviewTenantId) {
            setSelectedPreviewTenantId(allTenants[0].id);
            setPreviewTenant(allTenants[0]);
        } else if (allTenants.length > 0 && selectedPreviewTenantId) {
            const t = allTenants.find(x => x.id === selectedPreviewTenantId);
            if (t) setPreviewTenant(t);
        }
    }, [allTenants, selectedPreviewTenantId]);

    useEffect(() => {
        localStorage.setItem('theme-editor-show-preview', String(showPreview));
    }, [showPreview]);

    useEffect(() => {
        localStorage.setItem('theme-editor-layout-mode', layoutMode);
    }, [layoutMode]);

    // When the selected preview tenant changes, fetch their real content + images
    const loadTenantPreviewData = useCallback(async (tenantId: string, force = false) => {
        // Always fetch fresh data to ensure accurate preview
        // Removed store skip logic which caused stale/missing images

        const tenant = allTenants.find(t => t.id === tenantId);
        if (!tenant) return;

        setPreviewTenant(tenant);
        // Clear previous data immediately to prevent "stuck" data if fetch fails or is slow
        setPreviewContent({});
        setPreviewImages([]);
        setPreviewImagesB64({});

        setLoadingPreview(true);
        try {
            const res = await publicApi.getInvitation(tenant.domain_slug);
            if (res.success) {
                const content = res.data.content || {};
                const imgs: ImageRecord[] = res.data.images || [];
                setPreviewContent(content);
                setPreviewImages(imgs);

                // Pre-convert all proxy images to base64 for faster preview
                const b64map: Record<string, string> = {};
                await Promise.all(imgs.map(async (img) => {
                    if (img.cdn_url) {
                        try {
                            const proxiedUrl = resolveProxyUrl(img.cdn_url);
                            const b64 = await fetchProxyImageBase64(proxiedUrl);
                            b64map[img.image_type] = b64;
                            b64map[img.cdn_url] = b64;
                            if (proxiedUrl !== img.cdn_url) {
                                b64map[proxiedUrl] = b64;
                            }
                        } catch { }
                    }
                }));

                // Also pre-convert frame_balasan_instagram if present in content
                const rawFrame = content.frame_balasan_instagram;
                if (isValidImageUrl(rawFrame)) {
                    const proxiedUrl = resolveProxyUrl(rawFrame!);
                    try {
                        const b64 = await fetchProxyImageBase64(proxiedUrl);
                        b64map['frame_balasan_instagram'] = b64;
                        b64map[rawFrame!] = b64;
                        if (proxiedUrl !== rawFrame) {
                            b64map[proxiedUrl] = b64;
                        }
                    } catch (e) {
                        console.error('Failed to proxy frame_balasan_instagram:', e);
                    }
                }
                setPreviewImagesB64(b64map);

                // Save to store for next time
                previewStore.setPreviewData({
                    content,
                    images: imgs,
                    imagesB64: b64map,
                    tenantId
                });
            } else {
                // If failed (e.g. invitation not found), still save the empty state to store
                previewStore.setPreviewData({
                    content: {},
                    images: [],
                    imagesB64: {},
                    tenantId
                });
            }
        } catch (e) {
            console.error('Failed to load tenant preview data:', e);
            // On error, also update store to prevent returning to stuck state
            previewStore.setPreviewData({
                content: {},
                images: [],
                imagesB64: {},
                tenantId
            });
        } finally {
            setLoadingPreview(false);
        }
    }, [allTenants, previewStore]);

    useEffect(() => {
        if (selectedPreviewTenantId && allTenants.length > 0) {
            loadTenantPreviewData(selectedPreviewTenantId);
        }
    }, [selectedPreviewTenantId, allTenants]);

    // Prefetch base64 for image assets that aren't cached yet (e.g. when editing an
    // existing theme). This lets them render inside the preview iframe and refreshes
    // the preview once ready.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const toFetch = assetMediaList.filter(a => a.media_type === 'image' && a.media_cdn_url && !getCachedImage(a.media_cdn_url));
            if (toFetch.length === 0) return;
            await Promise.all(toFetch.map(async (a) => {
                try { await fetchProxyImageBase64(resolveProxyUrl(a.media_cdn_url)); } catch { }
                try { await fetchProxyImageBase64(a.media_cdn_url); } catch { }
            }));
            if (!cancelled) updatePreviewRef.current?.();
        })();
        return () => { cancelled = true; };
    }, [assetMediaList]);


    const handleCaptureScreenshot = async () => {
        if (!iframeRef.current) return;

        setIsCapturing(true);

        try {
            const iframe = iframeRef.current;
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

            if (!iframeDoc || !iframeDoc.body) {
                throw new Error("Konten pratinjau tidak dapat diakses.");
            }

            // Tambahkan delay kecil agar render stabil
            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(iframeDoc.documentElement, {
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                scale: 1,
            });

            const base64Full = canvas.toDataURL('image/jpeg', 0.8);
            const base64 = base64Full.split(',')[1];

            // 4. Upload to Drive immediately
            const uploadRes = await imageApi.uploadImage({
                tenant_id: 'system',
                image_type: 'theme_preview',
                file_name: `preview-${name.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'theme'}-${Date.now()}.jpg`,
                base64_data: base64,
                mime_type: 'image/jpeg',
                width: canvas.width,
                height: canvas.height,
                size_kb: Math.round((base64.length * 3) / 4 / 1024)
            }, { skipLoader: true } as any);

            if (uploadRes.success) {
                const finalPreviewUrl = uploadRes.data.cdn_url;
                setPreviewImage(finalPreviewUrl);
                setInitialPreviewImage(finalPreviewUrl);
                setPendingPreviewBase64(null);
                setPendingPreviewFile(null);
                toast.success('Screenshot berhasil diambil dan disimpan!');
            } else {
                throw new Error(uploadRes.message);
            }
        } catch (error: any) {
            console.error('Screenshot error:', error);
            toast.error('Gagal mengambil screenshot: ' + error.message);
        } finally {
            setIsCapturing(false);
        }
    };

    const processImageFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('File harus berupa gambar');
            return;
        }

        if (previewImage) {
            setPendingReplacePreviewFile(file);
            setShowReplacePreviewModal(true);
        } else {
            uploadPreview(file);
        }
    };

    const uploadPreview = async (file: File) => {
        setUploadingPreview(true);
        setShowReplacePreviewModal(false);
        try {
            // 1. Compress image
            const options = {
                maxSizeMB: 0.2,
                maxWidthOrHeight: 800,
                useWebWorker: true,
                fileType: 'image/webp'
            };
            const compressedFile = await imageCompression(file, options);

            // 2. Get dimensions
            const getDimensions = (): Promise<{ w: number, h: number }> => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve({ w: img.width, h: img.height });
                    img.src = URL.createObjectURL(compressedFile);
                });
            };
            const dims = await getDimensions();

            // 3. Convert to Base64
            const reader = new FileReader();
            const readerPromise = new Promise<string>((resolve) => {
                reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
            });
            reader.readAsDataURL(compressedFile);
            const base64 = await readerPromise;

            // 4. Upload to Drive
            const uploadRes = await imageApi.uploadImage({
                tenant_id: 'system',
                image_type: 'theme_preview',
                file_name: `preview-${name.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'theme'}-${Date.now()}.webp`,
                base64_data: base64,
                mime_type: 'image/webp',
                width: dims.w,
                height: dims.h,
                size_kb: Math.round(compressedFile.size / 1024)
            }, { skipLoader: true } as any);

            if (!uploadRes.success) throw new Error(uploadRes.message);

            const finalPreviewUrl = uploadRes.data.cdn_url;
            const oldPreviewUrl = previewImage;

            // 5. Update state and backend (if existing theme)
            if (!isNewTheme) {
                const currentTheme = themes.find(t => t.id === id);
                if (currentTheme) {
                    const payload = {
                        ...currentTheme,
                        preview_image: finalPreviewUrl
                    };
                    const res = await themeApi.updateTheme(payload, { skipLoader: true } as any);
                    if (!res.success) throw new Error(res.message);

                    updateTheme(id!, payload);
                }
            }

            // Cleanup old image if exists
            if (oldPreviewUrl) {
                const oldId = extractDriveId(oldPreviewUrl);
                if (oldId) {
                    try {
                        await imageApi.deleteImage(oldId, { skipLoader: true } as any);
                    } catch (e) {
                        console.error('Failed to delete old preview image:', e);
                    }
                }
            }

            setPreviewImage(finalPreviewUrl);
            setInitialPreviewImage(finalPreviewUrl);
            setPendingPreviewFile(null);
            setPendingPreviewBase64(null);

            toast.success('Gambar pratinjau diperbarui!');
        } catch (err: any) {
            console.error('Preview upload error:', err);
            const detailedMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Error tidak diketahui';
            toast.error('Gagal mengunggah pratinjau: ' + detailedMsg);
        } finally {
            setUploadingPreview(false);
            setPendingReplacePreviewFile(null);
        }
    };

    const handleDeletePreview = async () => {
        setDeletingPreview(true);
        setShowDeletePreviewModal(false);

        try {
            const oldPreviewUrl = previewImage;

            // 1. Update backend if existing theme
            if (!isNewTheme) {
                const currentTheme = themes.find(t => t.id === id);
                if (currentTheme) {
                    const payload = {
                        ...currentTheme,
                        preview_image: ''
                    };
                    const res = await themeApi.updateTheme(payload, { skipLoader: true } as any);
                    if (!res.success) throw new Error(res.message);

                    updateTheme(id!, payload);
                }
            }

            // 2. Delete from Drive
            if (oldPreviewUrl) {
                const oldId = extractDriveId(oldPreviewUrl);
                if (oldId) {
                    try {
                        await imageApi.deleteImage(oldId, { skipLoader: true } as any);
                    } catch (e) {
                        console.error('Failed to delete preview image from Drive:', e);
                    }
                }
            }

            // 3. Update State
            setPreviewImage('');
            setInitialPreviewImage('');
            setPendingPreviewFile(null);
            setPendingPreviewBase64(null);

            toast.success('Gambar pratinjau berhasil dihapus');
        } catch (err: any) {
            console.error('Preview delete error:', err);
            const detailedMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Error tidak diketahui';
            toast.error('Gagal menghapus gambar: ' + detailedMsg);
        } finally {
            setDeletingPreview(false);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) processImageFile(file);
                break;
            }
        }
    };

    // ---- Theme Asset Media (static images/videos belonging to the theme) ----

    // Auto-generate the next media_code per type (image_1, image_2 / video_1, ...).
    // Codes are NOT renumbered on delete, so derive from the highest existing index.
    const nextAssetCode = (list: ThemeAssetMedia[], type: 'image' | 'video') => {
        const max = list
            .filter(a => a.media_type === type)
            .reduce((m, a) => {
                const n = parseInt(String(a.media_code).split('_')[1] || '0', 10);
                return Number.isFinite(n) && n > m ? n : m;
            }, 0);
        return `${type}_${max + 1}`;
    };

    // Persist ONLY the asset_media_list column to the backend immediately, without
    // touching any other theme field (html/css/js/name/etc). Because updateTheme on
    // the backend only writes fields that are sent, this keeps asset data in sync with
    // Drive the moment a user uploads/deletes an asset — so leaving without "Save"
    // never orphans Drive files. New (unsaved) themes have no id yet, so their assets
    // are persisted together with the first full Save instead.
    const persistAssetMediaList = async (list: ThemeAssetMedia[]) => {
        if (isNewTheme || !id) return; // new theme: assets go in with the first Save
        try {
            const res = await themeApi.updateTheme({ id, asset_media_list: list } as any, { skipLoader: true } as any);
            if (res.success) {
                updateTheme(id, { asset_media_list: list }); // keep local store cache in sync
            } else {
                toast.error('Gagal menyimpan asset: ' + (res.message || ''));
            }
        } catch (err: any) {
            console.error('Persist asset_media_list failed:', err);
            toast.error('Gagal menyimpan asset ke server: ' + (err.message || 'Error'));
        }
    };

    // Debounced persist: coalesce rapid uploads/deletes into ONE updateTheme call.
    // Each action records the latest list and (re)schedules a single backend write
    // ~900ms after the last action — keeping request count low to avoid the rate limit.
    const persistAssetMediaListDebounced = (list: ThemeAssetMedia[]) => {
        if (isNewTheme || !id) return;
        assetPersistLatestRef.current = list;
        if (assetPersistTimerRef.current) clearTimeout(assetPersistTimerRef.current);
        assetPersistTimerRef.current = setTimeout(() => {
            const latest = assetPersistLatestRef.current;
            assetPersistLatestRef.current = null;
            assetPersistTimerRef.current = null;
            if (latest) persistAssetMediaList(latest);
        }, 900);
    };

    const fileToBase64 = (file: File | Blob): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const handleAssetImageUpload = async (files: FileList | File[]) => {
        const arr = Array.from(files);
        if (arr.length === 0) return;
        // Re-entrancy guard: if an upload is already running (e.g. paste fired twice),
        // ignore this call so the same files aren't uploaded again.
        if (assetUploadingRef.current) return;
        assetUploadingRef.current = true;
        setUploadingAsset(true);

        // Register a background task so progress shows in the header indicator + modal,
        // mirroring the gallery upload flow (ImageUpload.tsx).
        const total = arr.length;
        const taskId = `upload-theme-asset-${Date.now()}`;
        addTask({ id: taskId, name: total > 1 ? `Upload ${total} Asset Tema` : 'Upload Asset Tema', total });
        const failedFiles: string[] = [];

        // Work on a local working copy so sequential codes stay sequential within this batch
        let working = [...assetMediaList];
        let success = 0;
        let failCount = 0;
        try {
            for (const file of arr) {
                if (!file.type.startsWith('image/')) {
                    toast.error(`"${file.name}" bukan gambar.`);
                    failCount++;
                    failedFiles.push(file.name);
                    updateTask(taskId, { failCount, failedFiles, progress: Math.round(((success + failCount) / total) * 100) });
                    continue;
                }
                if (file.size > 5 * 1024 * 1024) {
                    toast.error(`"${file.name}" terlalu besar (Max 5MB).`);
                    failCount++;
                    failedFiles.push(file.name);
                    updateTask(taskId, { failCount, failedFiles, progress: Math.round(((success + failCount) / total) * 100) });
                    continue;
                }

                const isPng = file.type === 'image/png';
                let uploadBlob: File | Blob = file;
                let mimeType = file.type;
                let extension = (file.name.split('.').pop() || '').toLowerCase();

                // Compress everything to WebP EXCEPT PNG (keep PNG to preserve transparency)
                if (!isPng) {
                    uploadBlob = await imageCompression(file, {
                        maxSizeMB: 0.5,
                        maxWidthOrHeight: 1920,
                        useWebWorker: true,
                        fileType: 'image/webp'
                    });
                    mimeType = 'image/webp';
                    extension = 'webp';
                } else {
                    mimeType = 'image/png';
                    extension = 'png';
                }

                const base64 = await fileToBase64(uploadBlob);
                const code = nextAssetCode(working, 'image');
                const safeName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.' + extension;

                const res = await imageApi.uploadImage({
                    tenant_id: 'system',
                    image_type: 'theme_asset',
                    file_name: safeName,
                    base64_data: base64,
                    mime_type: mimeType
                }, { skipLoader: true } as any);

                if (res.success && res.data) {
                    // Cache the full data URL keyed by the cdn_url so ProxyImage (grid) and
                    // the live preview can show the asset instantly without a network fetch.
                    if (res.data.cdn_url) {
                        setCachedImage(res.data.cdn_url, `data:${mimeType};base64,${base64}`);
                    }
                    working = [...working, {
                        media_type: 'image',
                        media_cdn_url: res.data.cdn_url,
                        media_name: file.name,
                        media_size: String(Math.round((uploadBlob as Blob).size / 1024)),
                        media_extension: extension,
                        media_id: res.data.drive_file_id,
                        media_code: code
                    }];
                    setAssetMediaList(working);
                    success++;
                } else {
                    toast.error(`Gagal upload "${file.name}": ${res.message || ''}`);
                    failCount++;
                    failedFiles.push(file.name);
                }
                updateTask(taskId, { successCount: success, failCount, failedFiles, progress: Math.round(((success + failCount) / total) * 100) });
            }
            if (success > 0) {
                toast.success(`${success} gambar asset berhasil diupload!`);
                persistAssetMediaListDebounced(working); // persist once (debounced) to limit requests
            }
            updateTask(taskId, {
                successCount: success,
                failCount,
                failedFiles,
                progress: 100,
                status: failCount === 0 ? 'success' : 'error',
                details: `Selesai: ${success} berhasil, ${failCount} gagal` + (failCount > 0 ? ` (Gagal: ${failedFiles.join(', ')})` : '')
            });
        } catch (err: any) {
            console.error('Asset image upload error:', err);
            toast.error('Gagal mengunggah asset: ' + (err.message || 'Error'));
            updateTask(taskId, { status: 'error', progress: 100, details: 'Error: ' + (err.message || 'gagal mengunggah') });
        } finally {
            setUploadingAsset(false);
            assetUploadingRef.current = false;
        }
    };

    const handleAssetVideoUpload = async (file: File) => {
        if (!file.type.startsWith('video/')) return toast.error('File harus berupa video.');
        if (file.size > 10 * 1024 * 1024) return toast.error('Ukuran video maksimal 10MB.');
        if (assetUploadingRef.current) return;
        assetUploadingRef.current = true;

        setUploadingAsset(true);
        const taskId = `upload-theme-asset-video-${Date.now()}`;
        addTask({ id: taskId, name: 'Upload Video Asset Tema', total: 1 });
        try {
            const base64 = await fileToBase64(file);
            const extension = (file.name.split('.').pop() || 'mp4').toLowerCase();
            const code = nextAssetCode(assetMediaList, 'video');
            const safeName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.' + extension;

            const res = await imageApi.uploadImage({
                tenant_id: 'system',
                image_type: 'theme_asset',
                file_name: safeName,
                base64_data: base64,
                mime_type: file.type
            }, { skipLoader: true } as any);

            if (res.success && res.data) {
                const newList = [...assetMediaList, {
                    media_type: 'video' as const,
                    media_cdn_url: res.data.cdn_url,
                    media_name: file.name,
                    media_size: String(Math.round(file.size / 1024)),
                    media_extension: extension,
                    media_id: res.data.drive_file_id,
                    media_code: code
                }];
                setAssetMediaList(newList);
                toast.success('Video asset berhasil diupload!');
                persistAssetMediaListDebounced(newList);
                updateTask(taskId, { successCount: 1, progress: 100, status: 'success', details: 'Selesai: 1 berhasil' });
            } else {
                toast.error('Gagal upload video: ' + (res.message || ''));
                updateTask(taskId, { failCount: 1, failedFiles: [file.name], progress: 100, status: 'error', details: 'Gagal: ' + (res.message || '') });
            }
        } catch (err: any) {
            console.error('Asset video upload error:', err);
            toast.error('Gagal mengunggah video: ' + (err.message || 'Error'));
            updateTask(taskId, { failCount: 1, failedFiles: [file.name], progress: 100, status: 'error', details: 'Error: ' + (err.message || 'gagal') });
        } finally {
            setUploadingAsset(false);
            assetUploadingRef.current = false;
        }
    };

    const handleAddYoutubeAsset = async () => {
        const url = parseYoutubeUrl(youtubeUrl);
        if (!url) return toast.error('Link YouTube tidak valid.');
        const code = nextAssetCode(assetMediaList, 'video');
        const newList = [...assetMediaList, {
            media_type: 'video' as const,
            media_cdn_url: url,
            media_name: url,
            media_size: '',
            media_extension: 'youtube',
            media_id: '',
            media_code: code
        }];
        setAssetMediaList(newList);
        setYoutubeUrl('');
        toast.success(`Video YouTube ditambahkan sebagai ${code}`);
        persistAssetMediaListDebounced(newList);
    };

    const handleDeleteAsset = (asset: ThemeAssetMedia) => {
        // Show the overlay immediately (so the user sees it on every clicked item),
        // then enqueue the actual delete. Deletes run ONE AT A TIME via a queue —
        // this prevents the race where parallel deletes each persisted a different
        // (and sometimes empty) list while a Drive delete was still in flight, which
        // left orphaned files in Drive + Images. Sequential = each Drive delete
        // finishes and the list is persisted with the correct survivors before the
        // next delete starts.
        setDeletingAssetCodes(prev => new Set(prev).add(asset.media_code));
        enqueueAssetDelete(asset);
    };

    // Serial queue for asset deletes. Each job: delete the Drive file (awaited to
    // completion), then atomically remove it from the list and persist the EXACT
    // surviving list. assetMediaListRef holds the always-current list so we never
    // persist a stale/empty snapshot.
    const runAssetDeleteJob = async (asset: ThemeAssetMedia) => {
        try {
            // Drive-backed assets must finish their backend delete before we drop
            // them from the persisted list. Retry once on transient failure; only
            // remove from the list if Drive deletion actually succeeded — otherwise
            // keep the entry so it isn't orphaned.
            let driveOk = true;
            if (asset.media_id) {
                driveOk = false;
                for (let attempt = 0; attempt < 2 && !driveOk; attempt++) {
                    try {
                        const res = await imageApi.deleteImage(asset.media_id, { skipLoader: true } as any);
                        driveOk = !!(res && res.success);
                    } catch (e) {
                        console.error('Failed to delete asset from Drive (attempt ' + (attempt + 1) + '):', e);
                    }
                }
            }

            if (!driveOk) {
                toast.error(`Gagal menghapus ${asset.media_code} dari penyimpanan. Coba lagi.`);
                return; // keep the asset in the list — do NOT create an orphan
            }

            // Remove from the live list (read from the ref so it reflects prior
            // deletes in this same queue), persist the exact survivors, and sync UI.
            const newList = assetMediaListRef.current.filter(a => a.media_code !== asset.media_code);
            assetMediaListRef.current = newList;
            setAssetMediaList(newList);
            toast.success(`Asset ${asset.media_code} dihapus`);
            persistAssetMediaListDebounced(newList);
        } finally {
            setDeletingAssetCodes(prev => {
                const next = new Set(prev);
                next.delete(asset.media_code);
                return next;
            });
        }
    };


    const enqueueAssetDelete = (asset: ThemeAssetMedia) => {
        // Chain onto the tail of the queue so jobs run strictly one after another.
        assetDeleteQueueRef.current = assetDeleteQueueRef.current
            .then(() => runAssetDeleteJob(asset))
            .catch(() => { /* a job's own try/finally handles its errors */ });
    };

    // ---- Bulk delete (selected / all) ----
    // Toggle one asset's checkbox in selection mode.
    const toggleAssetSelected = (code: string) => {
        setSelectedAssetCodes(prev => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code); else next.add(code);
            return next;
        });
    };

    // Are ALL non-deleting assets currently selected?
    const allAssetsSelected = assetMediaList.length > 0
        && assetMediaList.every(a => selectedAssetCodes.has(a.media_code));

    const toggleSelectAllAssets = () => {
        if (allAssetsSelected) {
            setSelectedAssetCodes(new Set());
        } else {
            setSelectedAssetCodes(new Set(assetMediaList.map(a => a.media_code)));
        }
    };

    // Leave selection mode and clear any checked items.
    const exitAssetSelectionMode = () => {
        setAssetSelectionMode(false);
        setSelectedAssetCodes(new Set());
    };

    // Confirmed bulk delete: ONE batch request to the backend trashes every Drive
    // file and removes their Images rows in a single sheet rewrite (instead of N
    // serial single-delete requests). Orphan safety is preserved end to end:
    //   - We only drop an asset from asset_media_list once its Drive file is
    //     CONFIRMED gone by the backend (it returns the exact ids it deleted).
    //   - YouTube/link assets have no media_id (no Drive file) and are removed
    //     locally without a backend call.
    //   - The whole job runs on the SAME serial queue as single deletes, so it can
    //     never race with an in-flight single delete or persist a stale list.
    const runBulkDeleteJob = async (targets: ThemeAssetMedia[]) => {
        try {
            // Split into Drive-backed (needs backend) vs. link-only (local removal).
            const driveBacked = targets.filter(a => a.media_id);
            const linkOnly = targets.filter(a => !a.media_id);

            // Codes that are safe to remove from the list once we're done.
            const removableCodes = new Set<string>(linkOnly.map(a => a.media_code));

            if (driveBacked.length) {
                const ids = driveBacked.map(a => a.media_id as string);
                let result: { deleted?: string[]; failed?: { id: string; reason: string }[] } | null = null;
                try {
                    const res = await imageApi.deleteImages(ids, { skipLoader: true } as any);
                    if (res && res.success) result = res.data;
                    else toast.error('Gagal menghapus asset: ' + (res?.message || ''));
                } catch (e: any) {
                    console.error('Batch asset delete failed:', e);
                    toast.error('Gagal menghapus asset: ' + (e?.message || 'Error'));
                }

                if (result) {
                    // Map the confirmed-deleted media_ids back to their media_codes so we
                    // remove EXACTLY the assets whose Drive file is gone (no orphans).
                    const deletedIds = new Set(result.deleted || []);
                    driveBacked.forEach(a => {
                        if (a.media_id && deletedIds.has(a.media_id)) removableCodes.add(a.media_code);
                    });
                    const failedCount = (result.failed || []).length;
                    if (failedCount > 0) {
                        toast.error(`${failedCount} asset gagal dihapus dari penyimpanan dan tetap dipertahankan.`);
                    }
                }
            }

            // Persist the exact survivors (read from the ref so concurrent single
            // deletes in this same queue are respected), then sync UI.
            if (removableCodes.size > 0) {
                const newList = assetMediaListRef.current.filter(a => !removableCodes.has(a.media_code));
                assetMediaListRef.current = newList;
                setAssetMediaList(newList);
                persistAssetMediaListDebounced(newList);
                toast.success(`${removableCodes.size} asset dihapus`);
            }
        } finally {
            // Clear the deleting overlay for every target we attempted.
            setDeletingAssetCodes(prev => {
                const next = new Set(prev);
                targets.forEach(a => next.delete(a.media_code));
                return next;
            });
        }
    };

    const handleBulkDeleteConfirmed = () => {
        const targets = bulkDeleteMode === 'all'
            ? [...assetMediaList]
            : assetMediaList.filter(a => selectedAssetCodes.has(a.media_code));

        // Skip items already mid-delete so we don't double-process them.
        const toDelete = targets.filter(a => !deletingAssetCodes.has(a.media_code));

        if (toDelete.length) {
            setDeletingAssetCodes(prev => {
                const next = new Set(prev);
                toDelete.forEach(a => next.add(a.media_code));
                return next;
            });
            // Chain onto the serial delete queue so it can't race single deletes.
            assetDeleteQueueRef.current = assetDeleteQueueRef.current
                .then(() => runBulkDeleteJob(toDelete))
                .catch(() => { /* runBulkDeleteJob handles its own errors */ });
        }

        setBulkDeleteMode(null);
        exitAssetSelectionMode();
    };

    // Open the lightbox showing all image assets, starting at the clicked one.
    const openAssetLightbox = (asset: ThemeAssetMedia) => {
        const imageAssets = assetMediaList.filter(a => a.media_type === 'image');
        const idx = imageAssets.findIndex(a => a.media_code === asset.media_code);
        setLightboxImages(imageAssets.map(a => ({ url: getCachedImage(a.media_cdn_url) || a.media_cdn_url, caption: `${a.media_name} ({{asset_${a.media_code}}})` })));
        setLightboxIndex(idx < 0 ? 0 : idx);
        setLightboxOpen(true);
    };

    // Open the lightbox for the single theme preview image.
    const openPreviewLightbox = () => {
        if (!previewImage) return;
        setLightboxImages([{ url: getCachedImage(previewImage) || previewImage, caption: 'Gambar Pratinjau Tema' }]);
        setLightboxIndex(0);
        setLightboxOpen(true);
    };

    // Drag-drop / paste entry for the asset dropzone: route images & videos to the
    // right handler (pasted clipboard content can only be images).
    const handleAssetDrop = (files: FileList | File[]) => {
        const arr = Array.from(files);
        if (arr.length === 0) return;
        const images = arr.filter(f => f.type.startsWith('image/'));
        const videos = arr.filter(f => f.type.startsWith('video/'));
        if (images.length) handleAssetImageUpload(images);
        videos.forEach(v => handleAssetVideoUpload(v));
        if (!images.length && !videos.length) toast.error('File harus gambar atau video.');
    };

    const handleAssetPaste = (e: { clipboardData: DataTransfer | null }) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const files: File[] = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const f = items[i].getAsFile();
                if (f) files.push(f);
            }
        }
        if (files.length) handleAssetImageUpload(files);
    };

    // Global Ctrl+V handler: routes the pasted image to whichever dropzone the user
    // last clicked (preview vs asset media). Using a window listener avoids the
    // unreliable focus/onPaste behaviour of plain <div>s. The ref keeps the closure
    // fresh without re-registering the listener every render.
    const pasteRouterRef = useRef<(e: ClipboardEvent) => void>(() => {});
    useEffect(() => {
        pasteRouterRef.current = (e: ClipboardEvent) => {
            if (!activePasteZone) return;
            const hasImage = Array.from(e.clipboardData?.items || []).some(it => it.type.indexOf('image') !== -1);
            if (!hasImage) return;
            if (activePasteZone === 'preview') {
                const item = Array.from(e.clipboardData!.items).find(it => it.type.indexOf('image') !== -1);
                const file = item?.getAsFile();
                if (file) processImageFile(file);
            } else {
                handleAssetPaste({ clipboardData: e.clipboardData });
            }
        };
    });
    useEffect(() => {
        const onPaste = (e: ClipboardEvent) => pasteRouterRef.current(e);
        window.addEventListener('paste', onPaste);

        // Prevent the browser's default "open dropped file in tab" behaviour, which
        // otherwise navigates away and makes an in-app drop look like it did nothing.
        const preventDefaultDrag = (e: DragEvent) => {
            const target = e.target as HTMLElement;
            if (target && target.closest('[data-theme-dropzone]')) return; // let our zones handle it
            e.preventDefault();
        };
        window.addEventListener('dragover', preventDefaultDrag);
        window.addEventListener('drop', preventDefaultDrag);

        return () => {
            window.removeEventListener('paste', onPaste);
            window.removeEventListener('dragover', preventDefaultDrag);
            window.removeEventListener('drop', preventDefaultDrag);
        };
    }, []);

    const handleSave = async (isDraft: boolean) => {
        if (!name.trim()) return toast.error('Theme Name is required');

        const codeErr = validateThemeCode(code);
        if (codeErr) {
            setCodeError(codeErr);
            return toast.error('Kode Tema tidak valid: ' + codeErr);
        }

        // Code must be unique across themes (skip the theme being edited itself).
        if (code.trim()) {
            const dup = themes.some(t => (t.code || '').trim().toLowerCase() === code.trim().toLowerCase() && t.id !== id);
            if (dup) {
                const msg = 'Kode Tema "' + code.trim() + '" sudah dipakai tema lain.';
                setCodeError(msg);
                return toast.error(msg);
            }
        }

        // A full Save already writes asset_media_list, so cancel any pending debounced
        // asset persist to avoid a redundant duplicate request.
        if (assetPersistTimerRef.current) {
            clearTimeout(assetPersistTimerRef.current);
            assetPersistTimerRef.current = null;
            assetPersistLatestRef.current = null;
        }

        // Proactive Google Sheets Cell Character Limit Validation
        const MAX_CELL_CHARS = 550000;
        if (htmlCode.length > MAX_CELL_CHARS) {
            return toast.error(`Gagal menyimpan: Ukuran kode HTML terlalu besar (${htmlCode.length.toLocaleString('id-ID')} karakter). Batas maksimal yang didukung adalah 550.000 karakter (karena dibagi ke kolom ekstra). Harap sederhanakan atau kompres kode HTML Anda.`, { duration: 10000 });
        }
        if (cssCode.length > MAX_CELL_CHARS) {
            return toast.error(`Gagal menyimpan: Ukuran kode CSS terlalu besar (${cssCode.length.toLocaleString('id-ID')} karakter). Batas maksimal yang didukung adalah 550.000 karakter (karena dibagi ke kolom ekstra). Harap kurangi kode CSS, atau pindahkan style ke berkas eksternal.`, { duration: 10000 });
        }
        if (jsCode.length > MAX_CELL_CHARS) {
            return toast.error(`Gagal menyimpan: Ukuran kode JS terlalu besar (${jsCode.length.toLocaleString('id-ID')} karakter). Batas maksimal yang didukung adalah 550.000 karakter (karena dibagi ke kolom ekstra). Harap sederhanakan kode JS Anda.`, { duration: 10000 });
        }

        setSaving(true);
        const loadingToast = toast.loading('Menyimpan tema...');

        try {
            let finalPreviewUrl = previewImage;

            // Handle pending upload if any
            if (pendingPreviewFile || pendingPreviewBase64) {
                let base64 = pendingPreviewBase64;
                let mimeType = 'image/jpeg';
                let fileName = `preview-${name.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'theme'}-${Date.now()}.jpg`;

                if (pendingPreviewFile) {
                    const reader = new FileReader();
                    const readerPromise = new Promise<string>((resolve) => {
                        reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
                    });
                    reader.readAsDataURL(pendingPreviewFile);
                    base64 = await readerPromise;
                    mimeType = pendingPreviewFile.type;
                    fileName = `preview-${name.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'theme'}-${Date.now()}.${pendingPreviewFile.name.split('.').pop()}`;
                }

                if (base64) {
                    const uploadRes = await imageApi.uploadImage({
                        tenant_id: 'system',
                        image_type: 'theme_preview',
                        file_name: fileName,
                        base64_data: base64,
                        mime_type: mimeType
                    });

                    if (uploadRes.success) {
                        finalPreviewUrl = uploadRes.data.cdn_url;
                    } else {
                        throw new Error('Gagal mengunggah gambar pratinjau: ' + uploadRes.message);
                    }
                }
            }

            const payload = {
                name,
                code,
                plan_type: planType,
                style_category: styleCategory,
                preview_image: finalPreviewUrl,
                html_template: htmlCode,
                css_template: cssCode,
                js_template: jsCode,
                flag_draft: isDraft,
                flag_use_system_action_button: flagUseSystemActionButton,
                image_types: imageTypes,
                asset_media_list: assetMediaList
            };

            if (isNew) {
                const res = await themeApi.createTheme(payload);
                if (res.success) {
                    toast.success('Theme created successfully', { id: loadingToast });
                    addTheme(res.data); // Update local cache
                    setFlagDraft(isDraft);
                    setInitialPreviewImage(finalPreviewUrl);
                    // Redirect back to theme management list on new theme creation
                    navigate('/private/themes');
                } else {
                    toast.error(res.message, { id: loadingToast });
                }
            } else {
                const res = await themeApi.updateTheme({ id: id!, ...payload });
                if (res.success) {
                    // Check if we need to delete old image
                    if (initialPreviewImage && initialPreviewImage !== finalPreviewUrl) {
                        const oldId = extractDriveId(initialPreviewImage);
                        if (oldId) {
                            try {
                                await imageApi.deleteImage(oldId);
                            } catch (e) {
                                console.error('Failed to delete old preview image:', e);
                            }
                        }
                    }

                    toast.success('Theme saved successfully', { id: loadingToast });
                    updateTheme(id!, payload); // Update local cache
                    setFlagDraft(isDraft);

                    // Update initial state to new URL
                    setInitialPreviewImage(finalPreviewUrl);

                    // Clear pending states after successful save
                    setPendingPreviewFile(null);
                    setPendingPreviewBase64(null);
                    setPreviewImage(finalPreviewUrl);
                }
                else toast.error(res.message, { id: loadingToast });
            }
        } catch (error: any) {
            console.error('Error saving theme:', error);
            
            // Extract the most detailed message possible from the server response or exception
            let errMsg = 'Gagal menyimpan tema';
            if (error.response?.data?.message) {
                errMsg = error.response.data.message;
            } else if (error.response?.data?.error) {
                errMsg = error.response.data.error;
            } else if (typeof error.response?.data === 'string' && error.response.data.trim()) {
                errMsg = error.response.data.trim();
            } else if (error.message) {
                errMsg = error.message;
            }
            
            // Format network / timeout failures with size context.
            const isTimeout = error.code === 'ECONNABORTED' || errMsg.toLowerCase().includes('timeout');
            if (isTimeout) {
                const totalChars = htmlCode.length + cssCode.length + jsCode.length;
                errMsg = `Waktu tunggu habis (Timeout) saat menyimpan. Kode Anda besar (${totalChars.toLocaleString('id-ID')} karakter) sehingga penyimpanan ke server memakan waktu lama. Coba simpan ulang. Detail: ${errMsg}`;
            } else if (errMsg.toLowerCase().includes('network') || errMsg.toLowerCase().includes('fetch') || !error.response) {
                const totalChars = htmlCode.length + cssCode.length + jsCode.length;
                // Per-template limit is 550.000 karakter (backend memecah ke 11 kolom @50.000).
                errMsg = `Kesalahan Jaringan (Network Error). Pastikan tiap bagian (HTML/CSS/JS) tidak melebihi 550.000 karakter. Total kode saat ini: ${totalChars.toLocaleString('id-ID')} karakter. Detail: ${errMsg}`;
            }
            
            toast.error(errMsg, { id: loadingToast, duration: 10000 });
        } finally {
            setSaving(false);
        }
    };

    const updatePreview = useCallback((force = false) => {
        if (!iframeRef.current || isPreviewUpdating) return;

        // Clear any pending update
        if (updateTimerRef.current) clearTimeout(updateTimerRef.current);

        setIsPreviewUpdating(true); // Mark as updating immediately to disable buttons

        // Set timer for debounced update
        updateTimerRef.current = setTimeout(() => {
            if (!iframeRef.current) {
                setIsPreviewUpdating(false);
                return;
            }
            const doc = iframeRef.current.contentWindow?.document;
            if (!doc) {
                setIsPreviewUpdating(false);
                return;
            }

            try {

                // Dummy tenant data mapped just like in InvitationPage
                const t = previewTenant || {
                    bride_name: 'Fiona',
                    bride_nickname: 'Fiona',
                    groom_name: 'Galang',
                    groom_nickname: 'Galang',
                    religion: 'Islam',
                    wedding_date: '2026-10-20',
                    wedding_date_iso: '2026-10-20'
                };

                let finalHtml = htmlCodeRef.current;
                let activeBacksound = '';

                if (showDataBinding) {
                    const c = previewContent;
                    const imgs = previewImagesB64;

                    // Helper to get real image URL or fallback to a dummy
                    const dummies = [
                        'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop',
                        'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop',
                        'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=800&auto=format&fit=crop',
                        'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=800&auto=format&fit=crop'
                    ];
                    const realImg = (type: string, fallbackIdx = 0) => {
                        if (imgs[type]) return imgs[type];
                        const imgRec = previewImages.find(i => i.image_type === type);
                        if (imgRec && imgRec.cdn_url) return imgRec.cdn_url;
                        return dummies[fallbackIdx % dummies.length];
                    };

                    const getFrameImg = () => {
                        if (imgs['frame_balasan_instagram']) return imgs['frame_balasan_instagram'];
                        const imgRec = previewImages.find(i => i.image_type === 'frame_balasan_instagram');
                        if (imgRec && imgRec.cdn_url) return resolveProxyUrl(imgRec.cdn_url);
                        if (isValidImageUrl(c.frame_balasan_instagram)) return resolveProxyUrl(c.frame_balasan_instagram!);
                        return defaultFrame;
                    };

                    let timeline: any[] = [];
                    try { timeline = c.timeline_kisah ? JSON.parse(c.timeline_kisah) : []; } catch { }

                    const galleryImgs = previewImages
                        .filter(img => img.image_type === 'gallery')
                        .map(img => ({ url: imgs[img.cdn_url] || img.cdn_url || '', caption: img.file_name || '' }));

                    const cGalleries = c.galleries || [];
                    const activeGalleries = cGalleries.length > 0 ? cGalleries : galleryImgs;

                    const getBool = (val: any) => {
                        if (typeof val === 'boolean') return val;
                        if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
                        if (typeof val === 'number') return val === 1;
                        return !!val;
                    };

                    const mockData: Record<string, any> = {
                        bride_name: t.bride_name || 'Fiona',
                        bride_nickname: t.bride_nickname || 'Fiona',
                        groom_name: t.groom_name || 'Galang',
                        groom_nickname: t.groom_nickname || 'Galang',
                        religion: t.religion || 'Islam',
                        wedding_date: t.wedding_date ? new Date(t.wedding_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Senin, 10 Agustus 2026',
                        wedding_date_iso: t.wedding_date || '2026-08-10',
                        tanggal_akad: c.tanggal_akad ? new Date(c.tanggal_akad).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Minggu, 9 Agustus 2026',
                        jam_akad: `${c.jam_awal_akad || '08:00'} - ${c.jam_akhir_akad || 'Selesai'}`,
                        jam_resepsi: `${c.jam_awal_resepsi || '11:00'} - ${c.jam_akhir_resepsi || '14:00'}`,
                        nama_lokasi_akad: c.nama_lokasi_akad || 'Masjid Istiqlal',
                        keterangan_lokasi_akad: c.keterangan_lokasi_akad || 'Jl. Taman Wijaya Kusuma',
                        akad_map: c.akad_map || '#',
                        tanggal_resepsi: t.wedding_date ? new Date(t.wedding_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Senin, 10 Agustus 2026',
                        nama_lokasi_resepsi: c.nama_lokasi_resepsi || 'Gedung Serbaguna',
                        keterangan_lokasi_resepsi: c.keterangan_lokasi_resepsi || 'Jl. Sudirman No 10',
                        resepsi_map: c.resepsi_map || '#',
                        nama_bapak_laki_laki: c.nama_bapak_laki_laki || 'Bpk. Ahmad',
                        nama_ibu_laki_laki: c.nama_ibu_laki_laki || 'Ibu Siti',
                        nama_bapak_perempuan: c.nama_bapak_perempuan || 'Bpk. Budi',
                        nama_ibu_perempuan: c.nama_ibu_perempuan || 'Ibu Ani',
                        ig_laki_laki: c.account_media_sosial_laki_laki || 'galang',
                        ig_perempuan: c.account_media_sosial_perempuan || 'fiona',
                        guest_name: mockGuestData.nama_tamu,
                        nama_tamu: mockGuestData.nama_tamu,
                        kode_undangan: mockGuestData.kode_tamu,
                        is_sudah_isi_ucapan: mockGuestData.is_sudah_isi_ucapan,
                        is_sudah_kirim_hadiah: mockGuestData.is_sudah_kirim_hadiah,
                        is_sudah_isi_konfirmasi_kehadiran: mockGuestData.is_sudah_isi_konfirmasi_kehadiran,
                        flag_konfirmasi_kehadiran_dari_tamu: mockGuestData.is_sudah_isi_konfirmasi_kehadiran,
                        is_link_umum_and_not_for_spesific_guest: mockGuestData.is_link_umum,
                        flag_sudah_isi_ucapan: mockGuestData.is_sudah_isi_ucapan,
                        flag_sudah_kirim_hadiah: mockGuestData.is_sudah_kirim_hadiah,
                        kalimat_pembuka: c.kalimat_pembuka_undangan || 'Dengan memohon rahmat dan ridho Allah SWT...',
                        kalimat_penutup: c.kalimat_penutup_undangan || 'Merupakan suatu kehormatan dan kebahagiaan bagi kami...',
                        quote: c.custom_kalimat_1 || 'Dan di antara tanda-tanda kekuasaan-Nya...',
                        quote_by: 'QS. Ar-Rum: 21',
                        quote_1: c.custom_kalimat_1 || 'Dan di antara tanda-tanda kekuasaan-Nya...',
                        quote_2: 'Maka nikmat Tuhanmu manakah yang kamu dustakan?',
                        quote_3: '', quote_4: '', quote_5: '', quote_6: '', quote_7: '',
                        quote_by_1: 'QS. Ar-Rum: 21',
                        quote_by_2: 'QS. Ar-Rahman: 13',
                        quote_by_3: '', quote_by_4: '', quote_by_5: '', quote_by_6: '', quote_by_7: '',
                        custom_kalimat_1: c.custom_kalimat_1 || '',
                        custom_kalimat_2: c.custom_kalimat_2 || '',
                        custom_kalimat_3: c.custom_kalimat_3 || '',
                        custom_kalimat_4: c.custom_kalimat_4 || '',
                        bank_1: c.nama_bank_1 || 'BCA',
                        rek_1: c.nomor_rekening_bank_1 || '1234567890',
                        nama_rek_1: c.nama_rekening_bank_1 || t.groom_name || 'Galang',
                        flag_pakai_qris_rekening_1: getBool(c.flag_pakai_qris_rekening_1),
                        gambar_qris_rekening_1: imgs['qris_1'] || previewImages.find(i => i.image_type === 'qris_1')?.cdn_url || c.gambar_qris_rekening_1 || 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BCA-1234567890',

                        bank_2: c.nama_bank_2 || 'Mandiri',
                        rek_2: c.nomor_rekening_bank_2 || '0987654321',
                        nama_rek_2: c.nama_rekening_bank_2 || t.bride_name || 'Fiona',
                        flag_pakai_qris_rekening_2: getBool(c.flag_pakai_qris_rekening_2),
                        gambar_qris_rekening_2: imgs['qris_2'] || previewImages.find(i => i.image_type === 'qris_2')?.cdn_url || c.gambar_qris_rekening_2 || 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Mandiri-0987654321',
                        flag_pakai_2_rekening: getBool(c.flag_pakai_2_rekening),

                        link_backsound_music: c.link_backsound_music || '',
                        link_live_streaming: c.link_live_streaming || '',
                        platform_live_streaming: c.platform_live_streaming || 'YouTube',
                        flag_pakai_timeline_kisah: timeline.length > 0,
                        timeline_kisah: timeline.length > 0 ? timeline : [
                            { tanggal: 'Januari 2020', judul: 'Pertama Kali Bertemu', deskripsi: 'Kami bertemu dalam sebuah acara komunitas.' },
                            { tanggal: 'Maret 2022', judul: 'Memutuskan Bersama', deskripsi: 'Kami resmi berpacaran dan memiliki komitmen.' },
                            { tanggal: 'Desember 2024', judul: 'Lamaran', deskripsi: 'Momen berharga ketika dua keluarga bertemu.' }
                        ],
                        tampilkan_amplop_online: getBool(c.tampilkan_amplop_online),
                        flag_lokasi_akad_dan_resepsi_berbeda: c.flag_lokasi_akad_dan_resepsi_berbeda !== undefined ? getBool(c.flag_lokasi_akad_dan_resepsi_berbeda) : true,
                        flag_tampilkan_nama_orang_tua: c.flag_tampilkan_nama_orang_tua !== undefined ? getBool(c.flag_tampilkan_nama_orang_tua) : true,
                        flag_tampilkan_sosial_media_mempelai: c.flag_tampilkan_sosial_media_mempelai !== undefined ? getBool(c.flag_tampilkan_sosial_media_mempelai) : true,
                        flag_sudah_kirim_undangan_via_whatsapp: false,
                        is_fitur_gallery: activeGalleries.length > 0,
                        has_gallery: activeGalleries.length > 0,
                        galleries: activeGalleries.length > 0 ? activeGalleries : [
                            { url: dummies[0], caption: 'Prewedding 1' },
                            { url: dummies[1], caption: 'Prewedding 2' },
                            { url: dummies[2], caption: 'Prewedding 3' }
                        ],

                        // Instagram Story Reply Additional Feature (ADD_FTR_STORY_IG)
                        flag_pakai_additional_feature_story_balasan_instagram: c.flag_pakai_additional_feature_story_balasan_instagram !== undefined ? getBool(c.flag_pakai_additional_feature_story_balasan_instagram) : true,
                        frame_balasan_instagram: getFrameImg(),
                        link_balasan_instagram: c.link_balasan_instagram || 'https://instagram.com/direct/inbox/',
                        sample_story_1: sampleStory1,
                        sample_story_2: sampleStory2,
                        sample_story_3: sampleStory3,
                        is_fitur_cerita: true,
                        is_fitur_live_streaming: !!(c.flag_pakai_live_streaming),
                        live_streaming: { url: c.link_live_streaming || 'https://youtube.com', platform: c.platform_live_streaming || 'YouTube' },

                        // Gift Delivery Offline
                        flag_kirim_hadiah_offline: !!(c.flag_kirim_hadiah_offline),
                        nama_lokasi_kirim_hadiah_offline: c.nama_lokasi_kirim_hadiah_offline || 'Rumah Mempelai Wanita / Bpk. Sigit',
                        alamat_lokasi_kirim_hadiah_offline: c.alamat_lokasi_kirim_hadiah_offline || 'Jl. Sudirman No. 10, Jakarta',
                        map_kirim_hadiah_offline: c.map_kirim_hadiah_offline || 'https://maps.app.goo.gl/dummy',

                        // Standard photo variables (real base64 or dummy fallback)
                        photo_hero_cover: realImg('hero_cover', 0),
                        photo_groom_photo: realImg('groom_photo', 1),
                        photo_bride_photo: realImg('bride_photo', 2),
                        photo_background: realImg('background', 3) !== dummies[3] ? realImg('background', 3) : realImg('cover', 3),
                        photo_closing: realImg('closing', 0),
                        photo_story_photo: realImg('story_photo', 1),
                        photo_gallery: activeGalleries.length > 0 ? activeGalleries : [
                            { url: dummies[0] }, { url: dummies[1] }, { url: dummies[2] }
                        ],

                        // Wishes / Comments
                        wishes: [
                            {
                                guest_name: 'Bpk. Ridwan',
                                name: 'Bpk. Ridwan',
                                guest_message: 'Semoga menjadi keluarga yang sakinah, mawaddah, warahmah.',
                                message: 'Semoga menjadi keluarga yang sakinah, mawaddah, warahmah.',
                                guest_comment_time: '2 jam lalu',
                                created_at: new Date().toISOString(),
                                guest_initial: 'R'
                            },
                            {
                                guest_name: 'Sdr. Andi',
                                name: 'Sdr. Andi',
                                guest_message: 'Selamat menempuh hidup baru ya!',
                                message: 'Selamat menempuh hidup baru ya!',
                                guest_comment_time: '1 hari lalu',
                                created_at: new Date(Date.now() - 86400000).toISOString(),
                                guest_initial: 'A'
                            },
                            {
                                guest_name: 'Ibu Siti',
                                name: 'Ibu Siti',
                                guest_message: 'Barakallahu lakuma wa baraka alaikuma.',
                                message: 'Barakallahu lakuma wa baraka alaikuma.',
                                guest_comment_time: '13 Maret 2021',
                                created_at: '2021-03-13T10:00:00Z',
                                guest_initial: 'S'
                            }
                        ],
                        empty_wishes: false,
                        countdown_hari: 12,
                        countdown_jam: 5,
                        countdown_menit: 30,
                        countdown_detik: 45,

                        // Website Config Branding (from WebsiteConfig sheet, same as the live invitation page)
                        site_name: websiteConfig?.site_name || 'GalangMonet2025',
                        site_url: websiteConfig?.site_url || 'https://galangmonet2025.com',
                        site_logo: websiteConfig?.site_logo || 'https://galangmonet2025.com/logo.png',
                        tagline: websiteConfig?.tagline || 'Solusi Undangan Digital Modern',
                        site_description: websiteConfig?.site_description || 'Platform pembuatan undangan digital terbaik dengan fitur lengkap dan desain premium.',

                        // Social media configurations from WebsiteConfig (real values when available, else dummy)
                        flag_use_tiktok_webconfig: websiteConfig?.site_tiktok ? true : (c.flag_use_tiktok_webconfig !== undefined ? getBool(c.flag_use_tiktok_webconfig) : true),
                        flag_use_youtube_webconfig: websiteConfig?.site_youtube ? true : (c.flag_use_youtube_webconfig !== undefined ? getBool(c.flag_use_youtube_webconfig) : true),
                        flag_use_instagram_webconfig: websiteConfig?.site_instagram ? true : (c.flag_use_instagram_webconfig !== undefined ? getBool(c.flag_use_instagram_webconfig) : true),
                        flag_use_whatsapp_webconfig: websiteConfig?.contact_whatsapp ? true : (c.flag_use_whatsapp_webconfig !== undefined ? getBool(c.flag_use_whatsapp_webconfig) : true),
                        url_tiktok_webconfig: websiteConfig?.site_tiktok || c.url_tiktok_webconfig || 'https://tiktok.com/@galangmonet',
                        url_youtube_webconfig: websiteConfig?.site_youtube || c.url_youtube_webconfig || 'https://youtube.com/@galangmonet',
                        url_instagram_webconfig: websiteConfig?.site_instagram || c.url_instagram_webconfig || 'https://instagram.com/galangmonet',
                        url_whatsapp_webconfig: (websiteConfig?.contact_whatsapp ? `https://wa.me/${String(websiteConfig.contact_whatsapp).replace(/[^\d]/g, '').replace(/^0/, '62')}` : '') || c.url_whatsapp_webconfig || 'https://wa.me/628123456789',
                    };

                    // Inject dynamic image type variables (real base64 or dummy fallback)
                    if (Array.isArray(imageTypes)) {
                        imageTypes.forEach((key, index) => {
                            mockData[key] = imgs[key] || dummies[index % dummies.length];
                        });
                    }

                    // Inject static theme asset media variables ({{asset_image_1}}, {{asset_video_1}}, ...)
                    // Prefer the locally cached base64 (set on upload / prefetched on load) so the
                    // image renders inside the preview iframe; fall back to the proxy URL.
                    if (Array.isArray(assetMediaList)) {
                        assetMediaList.forEach((a) => {
                            const cached = a.media_type === 'image' ? getCachedImage(a.media_cdn_url) : null;
                            mockData[`asset_${a.media_code}`] = cached || a.media_cdn_url;
                        });
                    }

                    activeBacksound = mockData.link_backsound_music || '';
                    finalHtml = parseTemplate(htmlCodeRef.current, mockData);
                }

                // Construct HTML content to render inside iframe
                const iframeContent = `
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <!-- Google Fonts -->
                <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&display=swap" rel="stylesheet">
                <!-- UIkit V3 (Locked) -->
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/uikit@3.21.0/dist/css/uikit.min.css" />
                <script src="https://cdn.jsdelivr.net/npm/uikit@3.21.0/dist/js/uikit.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/uikit@3.21.0/dist/js/uikit-icons.min.js"></script>
                <!-- Bootstrap 5 (Locked) -->
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
                
                <style>
                    /* Reset body margin for iframe */
                    body { margin: 0; padding: 0; box-sizing: border-box; }
                    ${cssCodeRef.current}
                    ${!showCover ? `
                    #theme-cover { display: none !important; }
                    #main-content { display: block !important; }
                    ` : ''}
                </style>
            </head>
            <body>
                ${finalHtml}
                
                <script>
                    // Execute JS template content
                    try {
                        ${jsCodeRef.current}
                    } catch(e) {
                        console.error("Theme JS Error:", e);
                    }

                    // Mock QR Button for Preview
                    document.addEventListener('click', function(e) {
                        if (e.target.closest('#btn-show-qr')) {
                            e.preventDefault();
                            alert("Simulasi: Di halaman publik, ini akan menampilkan Modal QR Code Kehadiran Tamu.");
                        }

                        // Mock Submission Handlers for Preview
                        if (e.target.closest('#btn-submit-kehadiran')) {
                            e.preventDefault();
                            const btn = e.target.closest('#btn-submit-kehadiran');
                            if (btn.disabled) return;
                            
                            const originalText = btn.innerHTML;
                            btn.disabled = true;
                            btn.innerHTML = '<i class="ri-loader-4-line uk-animation-spin"></i> Mengirim...';
                            
                            setTimeout(() => {
                                btn.innerHTML = originalText;
                                btn.disabled = true;
                                const alertBox = document.getElementById('alert-submit-kehadiran');
                                if (alertBox) {
                                    alertBox.className = 'uk-margin-small-top uk-text-small uk-text-success';
                                    alertBox.innerHTML = '<i class="ri-checkbox-circle-line"></i> Simulasi: RSVP Berhasil Terkirim!';
                                }
                            }, 1000);
                        }

                        if (e.target.closest('#btn-submit-ucapan')) {
                            e.preventDefault();
                            const btn = e.target.closest('#btn-submit-ucapan');
                            if (btn.disabled) return;

                            const originalText = btn.innerHTML;
                            btn.disabled = true;
                            btn.innerHTML = '<i class="ri-loader-4-line uk-animation-spin"></i> Mengirim...';

                            setTimeout(() => {
                                btn.innerHTML = originalText;
                                btn.disabled = true;
                                const alertBox = document.getElementById('alert-submit-ucapan');
                                if (alertBox) {
                                    alertBox.className = 'uk-margin-small-top uk-text-small uk-text-success';
                                    alertBox.innerHTML = '<i class="ri-checkbox-circle-line"></i> Simulasi: Ucapan Berhasil Terkirim!';
                                }
                                // Clear inputs in simulation
                                const nameInput = document.getElementById('wish-name');
                                const msgInput = document.getElementById('wish-message');
                                if (nameInput) nameInput.value = '';
                                if (msgInput) msgInput.value = '';
                            }, 1000);
                        }
                    });

                    // Auto-disable rsvp-guests on decline (Universal mock logic)
                    document.addEventListener('input', function(e) {
                        if (e.target.id === 'rsvp-status') {
                            const guestsEl = document.getElementById('rsvp-guests');
                            if (guestsEl) {
                                if (e.target.value === 'declined') {
                                    guestsEl.value = '0';
                                    guestsEl.disabled = true;
                                } else {
                                    guestsEl.disabled = false;
                                    if (guestsEl.value === '0') guestsEl.value = '1';
                                }
                            }
                        }
                    });

                    // Prevent any form submission reloads in the preview
                    document.addEventListener('submit', function(e) {
                        e.preventDefault();
                    });

                    // Image Auto-Retry Logic (Fixed for failed QRIS/Gallery)
                    window.addEventListener('error', function(e) {
                        if (e.target.tagName === 'IMG') {
                            const img = e.target;
                            const retryCount = parseInt(img.dataset.retryCount || '0');
                            const maxRetries = 10;
                            
                            if (retryCount < maxRetries) {
                                // Add a subtle loading effect or placeholder if needed
                                img.style.opacity = '0.5';
                                
                                setTimeout(() => {
                                    img.dataset.retryCount = retryCount + 1;
                                    const baseSrc = img.src.split('?')[0];
                                    // Use cache-busting to force reload from server
                                    img.src = baseSrc + '?retry=' + Date.now();
                                    img.style.opacity = '1';
                                    console.log('[Preview] Retrying image load (' + (retryCount + 1) + '/' + maxRetries + '):', baseSrc);
                                }, 2000); // Retry every 2 seconds
                            } else {
                                console.error('[Preview] Image failed after ' + maxRetries + ' retries:', img.src);
                                img.style.border = '2px dashed red'; // Visual cue for failed images in editor
                            }
                        }
                    }, true);

                    ${!showCover ? `
                    // Auto-open invitation to bypass cover
                    setTimeout(() => {
                        const btn = document.getElementById('btn-open-invitation');
                        if (btn) btn.click();
                    }, 150);
                    ` : ''}
                </script>
            </body>
            </html>
        `;

                doc.open();
                doc.write(iframeContent);
                doc.close();
            } catch (err) {
                console.error('Preview update error:', err);
            } finally {
                setIsPreviewUpdating(false);
            }
        }, 300); // 300ms debounce
    }, [previewTenant, previewContent, previewImages, previewImagesB64, showDataBinding, showCover, imageTypes, assetMediaList, mockGuestData, websiteConfig]);

    // Keep the ref pointing at the latest updatePreview for early effects to call
    useEffect(() => { updatePreviewRef.current = updatePreview; }, [updatePreview]);

    // Mirror assetMediaList into a ref so the serial delete queue always reads the
    // current survivors (never a stale snapshot) when computing what to persist.
    useEffect(() => { assetMediaListRef.current = assetMediaList; }, [assetMediaList]);

    // Flush any pending debounced asset persist when leaving the editor, so assets
    // uploaded/deleted just before navigating away are never lost (no Drive orphans).
    useEffect(() => {
        return () => {
            if (assetPersistTimerRef.current) {
                clearTimeout(assetPersistTimerRef.current);
                assetPersistTimerRef.current = null;
                const latest = assetPersistLatestRef.current;
                assetPersistLatestRef.current = null;
                if (latest) persistAssetMediaList(latest); // fire-and-forget on unmount
            }
        };
    }, []);

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
        };
    }, []);

    // Auto-update preview when data finishing loading (initial load or tenant switch)
    useEffect(() => {
        if (!loading && !loadingPreview) {
            updatePreview();
        }
    }, [loading, loadingPreview, updatePreview]);

    const handleSaveRef = useRef(handleSave);
    const flagDraftRef = useRef(flagDraft);

    useEffect(() => {
        handleSaveRef.current = handleSave;
        flagDraftRef.current = flagDraft;
    }, [handleSave, flagDraft]);

    // Keyboard Shortcut (CTRL+S) for refreshing preview
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                updatePreview();
                toast.success('Pratinjau diperbarui!', { id: 'preview-update-toast' });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [updatePreview]);

    const handleEditorWillMount = (monaco: any) => {
        monaco.editor.defineTheme('monokai', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: '', background: '272822', foreground: 'f8f8f2' },
                { token: 'comment', foreground: '75715e' },
                { token: 'keyword', foreground: 'f92672' },
                { token: 'string', foreground: 'e6db74' },
                { token: 'number', foreground: 'ae81ff' },
                { token: 'regexp', foreground: 'fd971f' },
                { token: 'type', foreground: '66d9ef' },
                { token: 'class', foreground: 'a6e22e' },
                { token: 'function', foreground: 'a6e22e' },
                { token: 'variable', foreground: 'f8f8f2' },
            ],
            colors: {
                'editor.background': '#272822',
                'editor.foreground': '#f8f8f2',
                'editorCursor.foreground': '#f8f8f0',
                'editor.lineHighlightBackground': '#3e3d32',
                'editor.selectionBackground': '#49483e',
                'editorIndentGuide.background': '#464741',
                'editorIndentGuide.activeBackground': '#767771',
            }
        });
    };

    const handleEditorDidMount = (editor: any, monaco: any) => {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            updatePreview();
            toast.success('Pratinjau diperbarui!', { id: 'preview-update-toast' });
        });
    };

    const toggleFocusMode = async (enable: boolean) => {
        setIsFocusMode(enable);
        try {
            if (enable) {
                if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                }
            } else {
                if (document.fullscreenElement) {
                    await document.exitFullscreen();
                }
            }
        } catch (err) {
            console.error("Error attempting to toggle fullscreen:", err);
        }
    };

    // Listen for native Fullscreen exits (e.g. Esc key)
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                setIsFocusMode(false);
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Memuat Editor Tema...</div>;

    // Desktop split widths for editor (left) vs live preview (right) per layout mode.
    const editorWidthClass = !showPreview
        ? 'lg:w-full'
        : layoutMode === 'desktop' ? 'lg:w-1/4'   // editor lebih kecil (= preview saat mode mobile)
        : layoutMode === 'mobile' ? 'lg:w-3/4'    // editor lebih besar (preview kecil)
        : 'lg:w-1/2';                              // balanced
    const previewWidthClass =
        layoutMode === 'desktop' ? 'lg:w-3/4'
        : layoutMode === 'mobile' ? 'lg:w-1/4'
        : 'lg:w-1/2';

    const layoutOptions: { key: 'desktop' | 'balanced' | 'mobile'; icon: string; label: string }[] = [
        { key: 'desktop', icon: '🖥️', label: 'Desktop — editor lebih kecil dari preview' },
        { key: 'balanced', icon: '⬌', label: 'Side by side — editor & preview sama lebar' },
        { key: 'mobile', icon: '📱', label: 'Mobile — editor lebih besar dari preview' },
    ];

    return (
        <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col bg-gray-50 dark:bg-gray-900 -mx-4 -my-6 sm:-mx-6 lg:-mx-8">
            {/* Toolbar */}
            <div className="flex-none flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/private/themes')} className="p-2 -ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <HiOutlineArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-bold text-gray-800 dark:text-white">
                                {isNew ? 'Membuat Tema Baru' : 'Edit Tema'}
                            </h1>
                            {!isNew && (
                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${flagDraft
                                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                    : 'bg-green-100 text-green-800 border border-green-200'
                                    }`}>
                                    {flagDraft ? 'Draft' : 'Published'}
                                </span>
                            )}
                            <button
                                onClick={() => toggleFocusMode(true)}
                                className="ml-2 px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded transition-colors"
                            >
                                Focus Mode 🔲
                            </button>
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="ml-2 px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded transition-colors"
                            >
                                {showPreview ? 'Hide Preview 👁️' : 'Show Preview 👁️'}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">{name || 'Belum ada nama'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleSave(true)}
                        disabled={saving}
                        className="flex items-center gap-2 py-2 px-4 shadow-sm disabled:opacity-50 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
                    >
                        {saving ? '...' : (
                            <>
                                <HiOutlineSave className="w-4 h-4 text-gray-500" />
                                Simpan Draf
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="btn-primary flex items-center gap-2 py-2 px-4 shadow-md disabled:opacity-50"
                    >
                        {saving ? 'Menyimpan...' : (
                            <>
                                <HiOutlineSave className="w-4 h-4 text-white" />
                                Simpan & Publish
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Editor Split Area */}
            <div className={`flex flex-col lg:flex-row min-h-0 ${isFocusMode ? 'fixed inset-0 z-[100] bg-white dark:bg-gray-900 flex-1' : 'flex-1'}`}>
                {/* Left Panel (Editor / Settings) */}
                <div className={`w-full ${editorWidthClass} flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300`}>
                    <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 justify-between items-center">
                        <div className="flex flex-1">
                            <button
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTabPanel === 'editor' ? 'border-gold-500 text-gold-600 bg-white dark:bg-gray-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setActiveTabPanel('editor')}
                            >
                                <span className="flex justify-center items-center gap-2">&lt;/&gt; Code</span>
                            </button>
                            <button
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTabPanel === 'settings' ? 'border-gold-500 text-gold-600 bg-white dark:bg-gray-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setActiveTabPanel('settings')}
                            >
                                <span className="flex justify-center items-center gap-2">⚙️ Setup</span>
                            </button>
                            <button
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors border-transparent text-gray-500 hover:text-gray-700`}
                                onClick={() => setIsGuideOpen(true)}
                                title="Panduan Pembuatan Tema"
                            >
                                <span className="flex justify-center items-center gap-2"><HiOutlineInformationCircle className="w-5 h-5" /> Panduan</span>
                            </button>
                        </div>
                        {isFocusMode && (
                            <button
                                onClick={() => toggleFocusMode(false)}
                                className="px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                                ✖ Exit Focus Mode
                            </button>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 relative">
                        {/* Settings Panel */}
                        <div className={`flex-1 overflow-y-auto custom-scrollbar p-6 ${activeTabPanel === 'settings' ? 'block' : 'hidden'}`}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Tema *</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="input-field"
                                            placeholder="Contoh: Gold Ivy Template"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kode Tema</label>
                                        <input
                                            type="text"
                                            value={code}
                                            onChange={e => {
                                                // Auto-format while typing: lowercase + remove spaces.
                                                const next = e.target.value.toLowerCase().replace(/\s+/g, '');
                                                setCode(next);
                                                let err = validateThemeCode(next);
                                                if (!err && next.trim() && themes.some(t => (t.code || '').trim().toLowerCase() === next.trim() && t.id !== id)) {
                                                    err = 'Kode "' + next.trim() + '" sudah dipakai tema lain.';
                                                }
                                                setCodeError(err);
                                            }}
                                            className={`input-field ${codeError ? 'border-red-500 focus:ring-red-500' : ''}`}
                                            placeholder="Contoh: gold-ivy"
                                        />
                                        {codeError && (
                                            <p className="mt-1 text-xs text-red-500">{codeError}</p>
                                        )}
                                    </div>
                                </div>
                                {/* Paket + Kategori Gaya + Floating Action Button — satu baris di layar lebar */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                                    <div className="flex flex-col">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paket</label>
                                        <select
                                            value={planType}
                                            onChange={e => setPlanType(e.target.value as PlanType)}
                                            className="input-field"
                                        >
                                            <option value="basic">Basic</option>
                                            <option value="pro">Pro</option>
                                            <option value="premium">Premium</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kategori Gaya (Style)</label>
                                        <select
                                            value={styleCategory}
                                            onChange={e => setStyleCategory(e.target.value)}
                                            className="input-field"
                                        >
                                            <option value="Minimalist">Minimalist</option>
                                            <option value="Elegant">Elegant</option>
                                            <option value="Nature">Nature</option>
                                            <option value="Romantic">Romantic</option>
                                            <option value="Cultural">Cultural</option>
                                            <option value="Lainnya">Lainnya</option>
                                        </select>
                                    </div>

                                    <div className="flex flex-col">
                                        <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Floating Action Button
                                            <span className="tooltip tooltip-bottom cursor-help">
                                                <HiOutlineInformationCircle className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="tooltip-text w-64 whitespace-normal normal-case text-left leading-snug">
                                                    Jika aktif, undangan memakai 4 tombol mengambang bawaan sistem (Menu, QR Code, Musik, Scroll Up).
                                                </span>
                                            </span>
                                        </label>
                                        <label className="input-field flex items-center justify-between cursor-pointer">
                                            <span className="text-sm text-gray-600 dark:text-gray-300">{flagUseSystemActionButton ? 'Aktif' : 'Nonaktif'}</span>
                                            <span className="relative inline-flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={flagUseSystemActionButton}
                                                    onChange={e => setFlagUseSystemActionButton(e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold-500 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gold-500"></div>
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* ===== Pratinjau Tema + Asset Media (side by side) ===== */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 border-t border-gray-100 dark:border-gray-800 pt-4">

                                    {/* --- KIRI: Gambar Pratinjau Tema --- */}
                                    {!isNewTheme && (
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gambar Pratinjau Tema</label>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={isCapturing || uploadingPreview || deletingPreview}
                                                        onClick={handleCaptureScreenshot}
                                                        className="text-[10px] font-bold text-gold-600 hover:text-gold-700 flex items-center gap-1 uppercase tracking-wider transition-colors hover:scale-105 active:scale-95 disabled:opacity-50"
                                                    >
                                                        {isCapturing ? (
                                                            <>
                                                                <div className="w-3 h-3 border-2 border-gold-200 border-t-gold-600 rounded-full animate-spin" />
                                                                Capturing...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="ri-camera-lens-line"></i> Auto Screenshot
                                                            </>
                                                        )}
                                                    </button>
                                                    {previewImage && (
                                                        <button
                                                            type="button"
                                                            disabled={isCapturing || uploadingPreview || deletingPreview}
                                                            onClick={() => setShowDeletePreviewModal(true)}
                                                            className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 uppercase tracking-wider transition-colors disabled:opacity-50"
                                                        >
                                                            <HiOutlineTrash className="w-3 h-3" /> Hapus
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Single hidden file input for the preview box */}
                                            <input
                                                type="file"
                                                ref={previewFileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) processImageFile(file);
                                                    e.target.value = '';
                                                }}
                                            />
                                            <div
                                                ref={previewDropRef}
                                                data-theme-dropzone
                                                tabIndex={0}
                                                onClick={() => { setActivePasteZone('preview'); previewDropRef.current?.focus(); }}
                                                onFocus={() => setActivePasteZone('preview')}
                                                className={`relative group border-2 border-dashed rounded-2xl p-4 transition-all outline-none cursor-pointer overflow-hidden ${activePasteZone === 'preview' ? 'border-gold-500 ring-2 ring-gold-400/40 bg-gold-50/30' : isPreviewDragging ? 'border-gold-500 bg-gold-50/50' : 'border-gray-200 dark:border-gray-700 hover:border-gold-400'}`}
                                                onDragOver={(e) => { e.preventDefault(); setIsPreviewDragging(true); }}
                                                onDragLeave={() => setIsPreviewDragging(false)}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    setIsPreviewDragging(false);
                                                    const file = e.dataTransfer.files[0];
                                                    if (file) processImageFile(file);
                                                }}
                                            >
                                                {/* Loading Overlay */}
                                                {(uploadingPreview || deletingPreview) && (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/10 dark:bg-black/10 backdrop-blur-[2px] z-20">
                                                        <div className="w-8 h-8 border-4 border-gold-200 border-t-gold-500 rounded-full animate-spin mb-2" />
                                                        <p className="text-[10px] font-bold text-gold-600 dark:text-gold-400 uppercase tracking-tighter">
                                                            {deletingPreview ? 'Menghapus...' : 'Mengunggah...'}
                                                        </p>
                                                    </div>
                                                )}

                                                {previewImage ? (
                                                    <div className="relative group min-h-[120px] flex items-center justify-center">
                                                        <ProxyImage
                                                            src={previewImage}
                                                            alt="Preview"
                                                            className={`w-full h-48 rounded-xl object-cover border border-gray-100 dark:border-gray-700 shadow-sm transition-opacity ${(uploadingPreview || deletingPreview) ? 'opacity-30' : 'opacity-100'}`}
                                                        />

                                                        {!uploadingPreview && !deletingPreview && (
                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-center justify-center gap-2">
                                                                <p className="text-white text-xs font-bold uppercase">Klik area ini lalu Paste (Ctrl+V)</p>
                                                                <p className="text-gray-300 text-[10px]">Atau Drag & Drop ke sini</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.stopPropagation(); openPreviewLightbox(); }}
                                                                        className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-white/90 text-gray-800 hover:bg-white transition-colors"
                                                                    >
                                                                        <i className="ri-zoom-in-line"></i> Lihat Penuh
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.stopPropagation(); previewFileInputRef.current?.click(); }}
                                                                        className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-white/90 text-gray-800 hover:bg-white transition-colors"
                                                                    >
                                                                        <HiOutlineUpload className="w-3.5 h-3.5" /> Ganti Gambar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className={`flex flex-col items-center justify-center py-8 text-center transition-opacity ${(uploadingPreview || deletingPreview) ? 'opacity-30' : 'opacity-100'}`}>
                                                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3 text-gray-400 group-hover:text-gold-500 transition-colors">
                                                            <i className="ri-image-add-line text-2xl"></i>
                                                        </div>
                                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Klik area ini lalu Paste (Ctrl+V)</p>
                                                        <p className="text-[10px] text-gray-500 mt-1">Atau Drag & Drop ke sini</p>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); previewFileInputRef.current?.click(); }}
                                                            className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-300 border border-gold-200 dark:border-gold-800 hover:bg-gold-100 transition-colors"
                                                        >
                                                            <HiOutlineUpload className="w-3.5 h-3.5" /> Pilih Gambar
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Atau Input URL Manual</label>
                                                <input
                                                    type="text"
                                                    value={previewImage}
                                                    onChange={e => setPreviewImage(e.target.value)}
                                                    className="input-field mt-1 h-8 text-xs"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* --- KANAN: Asset Media Tema --- */}
                                    <div className={isNewTheme ? 'lg:col-span-2' : ''}>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asset Media Tema</label>
                                        <p className="text-xs text-gray-500 mb-3">
                                            Foto/video statis milik desain tema. Pakai di HTML dengan variabel{' '}
                                            <code>{'{{asset_image_1}}'}</code>, <code>{'{{asset_video_1}}'}</code>, dst.
                                            Gambar max 5MB (dikompres ke WebP, kecuali PNG dipertahankan). Video upload max 10MB, atau pakai link YouTube.
                                        </p>

                                        {/* Hidden inputs (image: multiple, video: single) */}
                                        <input
                                            type="file"
                                            ref={assetImageInputRef}
                                            className="hidden"
                                            accept="image/png, image/jpeg, image/webp"
                                            multiple
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files.length > 0) handleAssetImageUpload(e.target.files);
                                                e.target.value = '';
                                            }}
                                        />
                                        <input
                                            type="file"
                                            ref={assetVideoInputRef}
                                            className="hidden"
                                            accept="video/mp4, video/webm, video/ogg"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) handleAssetVideoUpload(f);
                                                e.target.value = '';
                                            }}
                                        />

                                        {/* Dropzone (drag & drop + paste + click) — same method as preview */}
                                        <div
                                            ref={assetDropRef}
                                            data-theme-dropzone
                                            tabIndex={0}
                                            onClick={() => { setActivePasteZone('asset'); assetDropRef.current?.focus(); }}
                                            onFocus={() => setActivePasteZone('asset')}
                                            className={`relative group border-2 border-dashed rounded-2xl p-4 transition-all outline-none cursor-pointer overflow-hidden ${activePasteZone === 'asset' ? 'border-gold-500 ring-2 ring-gold-400/40 bg-gold-50/30' : isAssetDragging ? 'border-gold-500 bg-gold-50/50' : 'border-gray-200 dark:border-gray-700 hover:border-gold-400'}`}
                                            onDragOver={(e) => { e.preventDefault(); setIsAssetDragging(true); }}
                                            onDragLeave={() => setIsAssetDragging(false)}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setIsAssetDragging(false);
                                                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleAssetDrop(e.dataTransfer.files);
                                            }}
                                        >
                                            {uploadingAsset && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/10 dark:bg-black/10 backdrop-blur-[2px] z-20">
                                                    <div className="w-8 h-8 border-4 border-gold-200 border-t-gold-500 rounded-full animate-spin mb-2" />
                                                    <p className="text-[10px] font-bold text-gold-600 dark:text-gold-400 uppercase tracking-tighter">Mengunggah...</p>
                                                </div>
                                            )}

                                            <div className={`flex flex-col items-center justify-center py-6 text-center transition-opacity ${uploadingAsset ? 'opacity-30' : 'opacity-100'}`}>
                                                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3 text-gray-400 group-hover:text-gold-500 transition-colors">
                                                    <i className="ri-image-add-line text-2xl"></i>
                                                </div>
                                                <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Klik area ini lalu Paste (Ctrl+V)</p>
                                                <p className="text-[10px] text-gray-500 mt-1">Atau Drag & Drop file ke sini — bisa banyak file</p>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); assetImageInputRef.current?.click(); }}
                                                        className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-300 border border-gold-200 dark:border-gold-800 hover:bg-gold-100 transition-colors"
                                                    >
                                                        <HiOutlineUpload className="w-3.5 h-3.5" /> Pilih Gambar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); assetVideoInputRef.current?.click(); }}
                                                        className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors"
                                                    >
                                                        <i className="ri-film-line"></i> Pilih Video
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* YouTube link input */}
                                        <div className="flex gap-2 mt-3">
                                            <input
                                                type="text"
                                                value={youtubeUrl}
                                                onChange={e => setYoutubeUrl(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddYoutubeAsset(); } }}
                                                placeholder="https://youtube.com/watch?v=... (link YouTube)"
                                                className="input-field text-xs"
                                            />
                                            <Button onClick={handleAddYoutubeAsset}>Tambah YouTube</Button>
                                        </div>

                                        {/* Bulk-delete toolbar */}
                                        {assetMediaList.length > 0 && (
                                            <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
                                                <span className="text-[11px] text-gray-500">
                                                    {assetSelectionMode
                                                        ? `${selectedAssetCodes.size} dari ${assetMediaList.length} dipilih`
                                                        : `${assetMediaList.length} asset`}
                                                </span>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {!assetSelectionMode ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => setAssetSelectionMode(true)}
                                                                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                            >
                                                                <i className="ri-checkbox-multiple-line"></i> Pilih
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setBulkDeleteMode('all')}
                                                                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                                            >
                                                                <HiOutlineTrash className="w-3.5 h-3.5" /> Hapus Semua
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={toggleSelectAllAssets}
                                                                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                            >
                                                                <HiCheck className="w-3.5 h-3.5" />
                                                                {allAssetsSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={selectedAssetCodes.size === 0}
                                                                onClick={() => setBulkDeleteMode('selected')}
                                                                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-red-600 text-white border border-red-600 hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                            >
                                                                <HiOutlineTrash className="w-3.5 h-3.5" /> Hapus Terpilih ({selectedAssetCodes.size})
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={exitAssetSelectionMode}
                                                                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                            >
                                                                <HiOutlineX className="w-3.5 h-3.5" /> Batal
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Asset grid */}
                                        <div className="mt-3">
                                            {assetMediaList.length === 0 ? (
                                                <span className="text-xs text-gray-400 italic">Belum ada asset media</span>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                    {assetMediaList.map(asset => {
                                                        const isDeleting = deletingAssetCodes.has(asset.media_code);
                                                        const isSelected = selectedAssetCodes.has(asset.media_code);
                                                        return (
                                                        <div key={asset.media_code} className={`relative group border rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800/50 transition-all ${assetSelectionMode && isSelected ? 'border-red-500 ring-2 ring-red-400/40' : 'border-gray-200 dark:border-gray-700'}`}>
                                                            <div
                                                                className={`relative aspect-square bg-gray-100 dark:bg-gray-900 flex items-center justify-center overflow-hidden ${assetSelectionMode ? 'cursor-pointer' : asset.media_type === 'image' ? 'cursor-zoom-in' : ''}`}
                                                                onClick={() => {
                                                                    if (isDeleting) return;
                                                                    if (assetSelectionMode) { toggleAssetSelected(asset.media_code); return; }
                                                                    if (asset.media_type === 'image') openAssetLightbox(asset);
                                                                }}
                                                                title={assetSelectionMode ? 'Klik untuk memilih' : asset.media_type === 'image' ? 'Klik untuk lihat gambar penuh' : undefined}
                                                            >
                                                                {asset.media_type === 'image' ? (
                                                                    <ProxyImage src={asset.media_cdn_url} alt={asset.media_name} className="w-full h-full object-cover" />
                                                                ) : asset.media_extension === 'youtube' ? (
                                                                    <i className="ri-youtube-fill text-4xl text-red-500"></i>
                                                                ) : (
                                                                    <i className="ri-film-fill text-4xl text-purple-400"></i>
                                                                )}

                                                                {/* Selection checkbox (selection mode only) */}
                                                                {assetSelectionMode && !isDeleting && (
                                                                    <div className={`absolute top-1.5 left-1.5 z-20 w-6 h-6 rounded-md flex items-center justify-center shadow transition-colors ${isSelected ? 'bg-red-600 text-white' : 'bg-white/90 dark:bg-black/70 border border-gray-300 dark:border-gray-600'}`}>
                                                                        {isSelected && <HiCheck className="w-4 h-4" strokeWidth={1} />}
                                                                    </div>
                                                                )}

                                                                {/* Deleting overlay — stays until the delete truly finishes */}
                                                                {isDeleting && (
                                                                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/55 backdrop-blur-[1px]">
                                                                        <div className="w-7 h-7 border-[3px] border-white/30 border-t-red-400 rounded-full animate-spin mb-1.5" />
                                                                        <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Menghapus...</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="p-2">
                                                                <button
                                                                    type="button"
                                                                    title="Klik untuk menyalin variabel"
                                                                    onClick={() => {
                                                                        navigator.clipboard?.writeText(`{{asset_${asset.media_code}}}`);
                                                                        toast.success(`Disalin: {{asset_${asset.media_code}}}`);
                                                                    }}
                                                                    className="w-full text-left font-mono text-[10px] font-bold text-gold-700 dark:text-gold-300 truncate hover:underline"
                                                                >
                                                                    {`{{asset_${asset.media_code}}}`}
                                                                </button>
                                                                <p className="text-[9px] text-gray-400 truncate">
                                                                    {asset.media_name}{asset.media_size ? ` • ${asset.media_size} KB` : ''}
                                                                </p>
                                                            </div>
                                                            {!assetSelectionMode && (
                                                                <button
                                                                    type="button"
                                                                    disabled={isDeleting}
                                                                    onClick={() => handleDeleteAsset(asset)}
                                                                    className="absolute top-1.5 right-1.5 z-20 w-7 h-7 rounded-full bg-white/90 dark:bg-black/70 text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow disabled:opacity-100"
                                                                    title="Hapus asset"
                                                                >
                                                                    {isDeleting
                                                                        ? <div className="w-3.5 h-3.5 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                                                                        : <HiOutlineTrash className="w-3.5 h-3.5" />}
                                                                </button>
                                                            )}
                                                        </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Editor Panel */}
                        <div className={`flex-1 flex flex-col min-h-0 bg-[#1e1e1e] ${activeTabPanel === 'editor' ? 'flex' : 'hidden'}`}>
                            {/* Editor Tabs */}
                            <div className="flex bg-[#2d2d2d] justify-between items-center">
                                <div className="flex">
                                    {(['html', 'css', 'js'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-4 py-2 text-xs font-mono border-t-2 flex items-center gap-2 transition-all ${activeTab === tab ? 'border-gold-500 bg-[#1e1e1e] text-white' : 'border-transparent text-gray-400 hover:bg-[#3d3d3d] hover:text-gray-200'}`}
                                        >
                                            <span>index.{tab}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="px-3">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        multiple
                                        accept=".html,.css,.js"
                                    />
                                    <button
                                        onClick={() => setIsAiModalOpen(true)}
                                        className="text-[11px] font-medium flex items-center gap-1.5 bg-[#444] hover:bg-gold-600 text-gray-200 hover:text-white px-3 py-1.5 rounded transition-colors tooltip tooltip-left"
                                        title="Panduan & Auto-Convert AI Theme"
                                    >
                                        <i className="ri-magic-line"></i> Generate tema dengan AI?
                                    </button>
                                </div>
                            </div>
                            {/* Editor Textarea */}
                            <div className="flex-1 w-full min-h-0">
                                <Editor
                                    height="100%"
                                    theme="monokai"
                                    beforeMount={handleEditorWillMount}
                                    onMount={handleEditorDidMount}
                                    path={`index.${activeTab === 'js' ? 'javascript' : activeTab}`}
                                    defaultLanguage={activeTab === 'js' ? 'javascript' : activeTab}
                                    value={activeTab === 'html' ? htmlCode : activeTab === 'css' ? cssCode : jsCode}
                                    onChange={(value: string | undefined) => {
                                        if (activeTab === 'html') setHtmlCode(value || '');
                                        else if (activeTab === 'css') setCssCode(value || '');
                                        else setJsCode(value || '');
                                    }}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        wordWrap: 'on',
                                        padding: { top: 16 },
                                        scrollBeyondLastLine: false,
                                        smoothScrolling: true,
                                        cursorBlinking: 'smooth',
                                        cursorSmoothCaretAnimation: 'on',
                                        formatOnPaste: true,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel (Live Preview) */}
                {showPreview && (
                    <div className={`w-full ${previewWidthClass} flex flex-col bg-gray-100 dark:bg-gray-900 border-t lg:border-t-0 border-gray-200 dark:border-gray-700 transition-all duration-300`}>
                        <div className="flex-none px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center bg-white dark:bg-gray-800 gap-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <HiOutlineEye className="w-4 h-4 text-gold-500" />
                                <span className="hidden sm:inline">Live Preview</span>
                                <button
                                    onClick={() => updatePreview()}
                                    disabled={loading || loadingPreview || isPreviewUpdating}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gold-600 transition-colors tooltip tooltip-bottom disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Refresh Preview"
                                >
                                    <HiOutlineRefresh className={`w-4 h-4 ${(loading || loadingPreview || isPreviewUpdating) ? 'animate-spin' : ''}`} />
                                </button>
                                <button
                                    onClick={() => setIsSimulationModalOpen(true)}
                                    className="p-1.5 hover:bg-gold-50 dark:hover:bg-gold-900/20 rounded-md text-gold-600 transition-colors tooltip tooltip-bottom border border-gold-100 dark:border-gold-800/50"
                                    title="Simulation Data (Tester)"
                                >
                                    <span className="text-lg leading-none">🧪</span>
                                </button>

                                {/* Layout size: editor vs live preview width ratio (desktop only).
                                    Placed here so it stays reachable inside Focus / fullscreen mode. */}
                                <div className="hidden lg:inline-flex items-center rounded-md border border-gray-200 dark:border-gray-600 overflow-hidden" title="Ukuran layout editor vs live preview">
                                    {layoutOptions.map(opt => (
                                        <button
                                            key={opt.key}
                                            onClick={() => setLayoutMode(opt.key)}
                                            title={opt.label}
                                            className={`px-2 py-1 text-xs leading-none transition-colors ${layoutMode === opt.key
                                                ? 'bg-gold-500 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                        >
                                            {opt.icon}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 pr-3 border-r border-gray-100 dark:border-gray-700">
                                    <label className="flex items-center gap-1.5 cursor-pointer tooltip tooltip-bottom" title="Tampilkan Halaman Cover Depan">
                                        <div className="relative inline-flex items-center">
                                            <input type="checkbox" className="sr-only peer" checked={showCover} onChange={() => setShowCover(!showCover)} />
                                            <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-gold-500"></div>
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase tracking-tighter ${!showCover ? 'text-gray-400' : 'text-gold-600'}`}>Cover</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer tooltip tooltip-bottom" title="Tampilkan data asli vs tag variabel">
                                        <div className="relative inline-flex items-center">
                                            <input type="checkbox" className="sr-only peer" checked={showDataBinding} onChange={() => setShowDataBinding(!showDataBinding)} />
                                            <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-gold-500"></div>
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase tracking-tighter ${!showDataBinding ? 'text-gray-400' : 'text-gold-600'}`}>Data</span>
                                    </label>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <select
                                        value={selectedPreviewTenantId}
                                        onChange={e => setSelectedPreviewTenantId(e.target.value)}
                                        className="text-xs border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-gold-400 max-w-[140px]"
                                        disabled={loadingPreview}
                                    >
                                        {allTenants.length === 0 && <option value="">Demo</option>}
                                        {allTenants.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.bride_name} & {t.groom_name}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => selectedPreviewTenantId && loadTenantPreviewData(selectedPreviewTenantId, true)}
                                        className="text-gray-400 hover:text-gold-500 transition-colors"
                                        title="Reload data tenant"
                                        disabled={loadingPreview}
                                    >
                                        <HiOutlineRefresh className={`w-4 h-4 ${loadingPreview ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* Full width preview wrapper */}
                        <div className="flex-1 overflow-auto p-0 flex items-center justify-center min-h-[400px]">
                            <div className="w-full h-full bg-white relative">
                                {/* Iframe for isolated styling */}
                                <iframe
                                    ref={iframeRef}
                                    className="w-full h-full border-0 bg-white"
                                    title="Theme Preview"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Guide Modal */}
            <ThemeGuideModal
                isOpen={isGuideOpen}
                onClose={() => setIsGuideOpen(false)}
                previewTenant={previewTenant}
                imageTypes={imageTypes}
                activeTab={guideActiveTab}
                onTabChange={setGuideActiveTab}
            />

            {/* AI Theme Modal */}
            <AiThemeModal
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
                onTriggerUpload={() => fileInputRef.current?.click()}
                onApplyCode={processRawCode}
            />

            {/* Simulation Modal */}
            <SimulationModal
                isOpen={isSimulationModalOpen}
                onClose={() => setIsSimulationModalOpen(false)}
                mockGuestData={mockGuestData}
                onDataChange={setMockGuestData}
            />

            {/* Modal Konfirmasi Hapus Pratinjau */}
            <ConfirmDialog
                isOpen={showDeletePreviewModal}
                onClose={() => setShowDeletePreviewModal(false)}
                onConfirm={handleDeletePreview}
                title="Hapus Gambar Pratinjau"
                variant="danger"
                warningTitle="Konfirmasi Hapus"
                message="Apakah Anda yakin ingin menghapus gambar pratinjau tema ini? Gambar juga akan dihapus permanen dari Google Drive."
                confirmLabel="Ya, Hapus Gambar"
                loading={deletingPreview}
            />

            {/* Modal Konfirmasi Hapus Asset (Massal) */}
            <ConfirmDialog
                isOpen={bulkDeleteMode !== null}
                onClose={() => setBulkDeleteMode(null)}
                onConfirm={handleBulkDeleteConfirmed}
                title={bulkDeleteMode === 'all' ? 'Hapus Semua Asset' : 'Hapus Asset Terpilih'}
                variant="danger"
                warningTitle="Konfirmasi Hapus"
                message={
                    bulkDeleteMode === 'all'
                        ? <>Apakah Anda yakin ingin menghapus <b>SEMUA {assetMediaList.length} asset</b> media tema ini? File juga akan dihapus permanen dari Google Drive dan tidak bisa dikembalikan.</>
                        : <>Apakah Anda yakin ingin menghapus <b>{selectedAssetCodes.size} asset</b> terpilih? File juga akan dihapus permanen dari Google Drive dan tidak bisa dikembalikan.</>
                }
                confirmLabel={bulkDeleteMode === 'all' ? 'Ya, Hapus Semua' : `Ya, Hapus (${selectedAssetCodes.size})`}
            />

            {/* Modal Konfirmasi Ganti Pratinjau */}
            <ConfirmDialog
                isOpen={showReplacePreviewModal}
                onClose={() => {
                    setShowReplacePreviewModal(false);
                    setPendingReplacePreviewFile(null);
                }}
                onConfirm={() => pendingReplacePreviewFile && uploadPreview(pendingReplacePreviewFile)}
                title="Ganti Gambar Pratinjau"
                variant="primary"
                icon={<HiOutlineRefresh className="w-5 h-5 shrink-0 mt-0.5" />}
                warningTitle="Konfirmasi Ganti Gambar"
                message={<>Gambar baru akan diunggah dan <b>gambar lama akan dihapus permanen</b> dari Google Drive. Lanjutkan?</>}
                confirmLabel="Ya, Ganti Gambar"
                loading={uploadingPreview}
            />

            {/* Lightbox for viewing full asset / preview images */}
            {lightboxOpen && (
                <Lightbox
                    images={lightboxImages}
                    initialIndex={lightboxIndex}
                    onClose={() => setLightboxOpen(false)}
                />
            )}
        </div>
    );
}
