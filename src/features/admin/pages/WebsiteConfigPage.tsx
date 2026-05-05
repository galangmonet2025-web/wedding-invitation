import { useState, useEffect, useRef, useCallback } from 'react';
import { websiteConfigApi } from '@/core/api/endpoints';
import { WebsiteConfig } from '@/types';
import { 
    HiOutlineSave, 
    HiOutlineRefresh, 
    HiOutlineGlobeAlt, 
    HiOutlineMail, 
    HiOutlineColorSwatch, 
    HiOutlineCode,
    HiOutlineShare,
    HiOutlineDesktopComputer,
    HiOutlineDeviceMobile,
    HiOutlineExternalLink,
    HiOutlineUpload,
    HiOutlineTrash,
    HiOutlinePhotograph,
    HiOutlineX
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import { ImageUpload } from '@/shared/components/ImageUpload';
import { Lightbox } from '@/shared/components/Lightbox';
import { imageApi } from '@/core/api/imageApi';
import { ImageRecord } from '@/types';
import { HiOutlineClipboardCopy, HiOutlineInformationCircle } from 'react-icons/hi';
import imageCompression from 'browser-image-compression';
import { ProxyImage } from '@/shared/components/ProxyImage';
import { useWebsiteConfigStore } from '../store/websiteConfigStore';

type MainTab = 'general' | 'branding' | 'code';
type CodeTab = 'html' | 'css' | 'js';
type PreviewDevice = 'desktop' | 'mobile';

export function WebsiteConfigPage() {
    const { 
        config: storeConfig, 
        fetchConfig: fetchStoreConfig, 
        updateLocalConfig,
        setConfig: setStoreConfig,
        isLoading: storeLoading
    } = useWebsiteConfigStore();

    const [config, setConfig] = useState<WebsiteConfig>({
        site_name: '',
        site_url: '',
        site_logo: '',
        site_instagram: '',
        site_tiktok: '',
        site_youtube: '',
        contact_email: '',
        contact_whatsapp: '',
        tagline: '',
        site_description: '',
        site_code_html: '',
        site_code_css: '',
        site_code_js: '',
        primary_color: '#C6A769',
        accent_color: '#1A1A2E'
    });

    const [loading, setLoading] = useState(!storeConfig);
    const [saving, setSaving] = useState(false);
    const [activeMainTab, setActiveMainTab] = useState<MainTab>('general');
    const [activeCodeTab, setActiveCodeTab] = useState<CodeTab>('html');
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
    const [showPreview, setShowPreview] = useState(() => {
        const saved = localStorage.getItem('website-config-show-preview');
        return saved !== 'false';
    });
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [logoImage, setLogoImage] = useState<ImageRecord | null>(null);
    const [initialLogoUrl, setInitialLogoUrl] = useState('');
    const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
    const [previewLogoUrl, setPreviewLogoUrl] = useState('');
    const [showVariableRef, setShowVariableRef] = useState(true);
    const [activeSiderTab, setActiveSiderTab] = useState<'variables' | 'images'>('variables');
    const [codeImages, setCodeImages] = useState<ImageRecord[]>([]);
    const [loadingImages, setLoadingImages] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const editorRef = useRef<any>(null);
    
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        localStorage.setItem('website-config-show-preview', String(showPreview));
    }, [showPreview]);

    const fetchCodeImages = async () => {
        setLoadingImages(true);
        try {
            const res = await imageApi.getTenantImages({ skipLoader: true });
            if (res.success) {
                // Filter images for custom code
                const filtered = res.data.filter(img => img.image_type === 'website_custom_code');
                // Sort by creation date (newest first)
                filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setCodeImages(filtered);
            }
        } catch (err) {
            console.error('Failed to fetch code images:', err);
        } finally {
            setLoadingImages(false);
        }
    };

    const fetchConfig = async (force = false) => {
        if (force) setLoading(true);
        try {
            await fetchStoreConfig(force);
            const currentConfig = useWebsiteConfigStore.getState().config;
            
            if (currentConfig) {
                setConfig(currentConfig);
                setInitialLogoUrl(currentConfig.site_logo || '');
                setPreviewLogoUrl(currentConfig.site_logo || '');
            }
            
            // Also fetch code images
            await fetchCodeImages();
        } catch (err) {
            toast.error('Failed to load configuration');
        } finally {
            setLoading(false);
        }
    };

    const addCodeImage = (image: ImageRecord) => {
        setCodeImages(prev => {
            const newArr = [...prev, image];
            newArr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            return newArr;
        });
    };

    const removeCodeImage = (imageId: string) => {
        setCodeImages(prev => prev.filter(img => img.id !== imageId));
    };

    // Initial load from store if available
    useEffect(() => {
        if (storeConfig) {
            setConfig(storeConfig);
            setInitialLogoUrl(storeConfig.site_logo || '');
            setPreviewLogoUrl(storeConfig.site_logo || '');
            setLoading(false);
        }
        fetchConfig();
    }, []);

    const updatePreview = useCallback(() => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'PREVIEW_CONFIG_UPDATE',
                config: config,
                codeImages: codeImages
            }, '*');
        }
    }, [config, codeImages]);

    // Synchronize code changes to live preview iframe
    useEffect(() => {
        if (activeMainTab !== 'code') return;

        const broadcastTimeout = setTimeout(() => {
            updatePreview();
        }, 500); // 500ms debounce

        return () => clearTimeout(broadcastTimeout);
    }, [config, activeMainTab, updatePreview]);

    // Keyboard Shortcut (CTRL+S) for manual preview update
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                updatePreview();
                toast.success('Preview Updated', { id: 'preview-update', duration: 1500 });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [updatePreview]);

    const handleEditorDidMount = (editor: any, monaco: any) => {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            updatePreview();
            toast.success('Preview Updated', { id: 'preview-update', duration: 1500 });
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
            console.error("Error toggling fullscreen:", err);
        }
    };

    // Listen for native Fullscreen exits
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) setIsFocusMode(false);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleCodeChange = (value: string | undefined, type: CodeTab) => {
        const fieldMap = {
            html: 'site_code_html',
            css: 'site_code_css',
            js: 'site_code_js'
        };
        setConfig(prev => ({ ...prev, [fieldMap[type]]: value || '' }));
    };

    const extractDriveId = (url: string) => {
        if (!url) return null;
        const match = url.match(/[?&]id=([^&]+)/);
        return match ? match[1] : null;
    };

    const processLogoFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('File harus berupa gambar');
            return;
        }

        // Local only preview
        const localUrl = URL.createObjectURL(file);
        setPreviewLogoUrl(localUrl);
        setPendingLogoFile(file);
        setConfig(prev => ({ ...prev, site_logo: localUrl }));
        
        toast.success('Logo terpilih! Klik Simpan untuk memperbarui website.');
    };

    const handleSave = async () => {
        setSaving(true);
        const loadingToast = toast.loading('Menyimpan konfigurasi...');
        
        try {
            let finalLogoUrl = config.site_logo;

            // Handle pending upload if any
            if (pendingLogoFile) {
                // Compress image like in ImageUpload.tsx
                const options = {
                    maxSizeMB: 0.2,
                    maxWidthOrHeight: 800,
                    useWebWorker: true,
                    fileType: 'image/webp'
                };
                const compressedFile = await imageCompression(pendingLogoFile, options);
                
                // Get dimensions
                const getDimensions = (): Promise<{ w: number, h: number }> => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => resolve({ w: img.width, h: img.height });
                        img.src = URL.createObjectURL(compressedFile);
                    });
                };
                const dims = await getDimensions();

                // Convert to Base64
                const reader = new FileReader();
                const readerPromise = new Promise<string>((resolve) => {
                    reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
                });
                reader.readAsDataURL(compressedFile);
                const base64 = await readerPromise;

                const uploadRes = await imageApi.uploadImage({
                    image_type: 'site_logo',
                    file_name: `site-logo-${Date.now()}.webp`,
                    base64_data: base64,
                    mime_type: 'image/webp',
                    width: dims.w,
                    height: dims.h,
                    size_kb: Math.round(compressedFile.size / 1024)
                });

                if (uploadRes.success) {
                    finalLogoUrl = uploadRes.data.cdn_url;
                } else {
                    throw new Error('Gagal mengunggah logo: ' + uploadRes.message);
                }
            }

            // Check if we need to delete old logo
            if (initialLogoUrl && initialLogoUrl !== finalLogoUrl) {
                const oldId = extractDriveId(initialLogoUrl);
                if (oldId) {
                    try {
                        await imageApi.deleteImage(oldId);
                    } catch (e) {
                        console.error('Failed to delete old logo:', e);
                    }
                }
            }

            const finalConfig = { ...config, site_logo: finalLogoUrl };

            // Inject Asset Metadata for public page synchronization
            const assetMetadata = JSON.stringify(codeImages.map(img => ({
                file_name: img.file_name,
                cdn_url: img.cdn_url,
                drive_url: img.drive_url
            })));
            
            // Marker for the metadata block
            const START_MARKER = '<!-- ASSET_METADATA_START -->';
            const END_MARKER = '<!-- ASSET_METADATA_END -->';
            const metadataBlock = `${START_MARKER}<script type="application/json" id="asset-metadata">${assetMetadata}</script>${END_MARKER}`;
            
            let finalHtml = finalConfig.site_code_html;
            const markerIndex = finalHtml.indexOf(START_MARKER);
            
            if (markerIndex !== -1) {
                const before = finalHtml.substring(0, markerIndex);
                const afterIndex = finalHtml.indexOf(END_MARKER);
                const after = afterIndex !== -1 ? finalHtml.substring(afterIndex + END_MARKER.length) : '';
                finalHtml = before + metadataBlock + after;
            } else {
                finalHtml = finalHtml + '\n' + metadataBlock;
            }

            const finalConfigWithMetadata = { 
                ...finalConfig, 
                site_code_html: finalHtml 
            };

            const res = await websiteConfigApi.updateConfig(finalConfigWithMetadata);
            
            if (res.success) {
                toast.success('Configuration saved successfully', { id: loadingToast });
                setStoreConfig(finalConfigWithMetadata);
                setInitialLogoUrl(finalLogoUrl);
                setPreviewLogoUrl(finalLogoUrl);
                setPendingLogoFile(null);
                setConfig(finalConfigWithMetadata);
            } else {
                toast.error(res.message, { id: loadingToast });
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to save configuration', { id: loadingToast });
        } finally {
            setSaving(false);
        }
    };

    const handleEditorWillMount = (monaco: any) => {
        monaco.editor.defineTheme('custom-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#1e1e2e',
            }
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`Copied: ${text}`, { icon: '📋', duration: 1500 });
    };

    const insertVariable = (varName: string) => {
        const text = `{{${varName}}}`;
        copyToClipboard(text);

        if (editorRef.current) {
            const editor = editorRef.current;
            const selection = editor.getSelection();
            const range = {
                startLineNumber: selection.startLineNumber,
                startColumn: selection.startColumn,
                endLineNumber: selection.endLineNumber,
                endColumn: selection.endColumn
            };
            
            editor.executeEdits('insert-variable', [
                {
                    range: range,
                    text: text,
                    forceMoveMarkers: true
                }
            ]);
            
            // Focus back to editor
            editor.focus();
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="w-12 h-12 border-4 border-gold-200 border-t-gold-600 rounded-full animate-spin"></div>
                <p className="text-gray-500 animate-pulse">Memuat konfigurasi website...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-135px)] -mx-4 -my-6 sm:-mx-6 lg:-mx-8 bg-gray-50 dark:bg-gray-900 overflow-hidden">
            {/* Toolbar Header */}
            <div className="flex-none bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gold-500 flex items-center justify-center text-white shadow-gold">
                        <HiOutlineDesktopComputer className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-display font-bold text-gray-800 dark:text-white leading-none">Website Configuration</h1>
                        <p className="text-[11px] text-gray-500 mt-1 uppercase tracking-wider font-bold">Manage Platform Identity & Branding</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => toggleFocusMode(true)}
                        className="btn-ghost text-xs border border-gray-200 dark:border-gray-700 py-1.5"
                    >
                        Focus Mode 🔲
                    </button>
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="btn-ghost text-xs border border-gray-200 dark:border-gray-700 py-1.5"
                    >
                        {showPreview ? 'Hide Preview 👁️' : 'Show Preview 👁️'}
                    </button>
                    <button 
                        onClick={() => fetchConfig(true)}
                        disabled={saving}
                        title="Refresh Data"
                        className="p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-gold-600 hover:border-gold-500 rounded-xl transition-all"
                    >
                        <HiOutlineRefresh className={`w-5 h-5 ${saving ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary flex items-center gap-2 group"
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <HiOutlineSave className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        )}
                        <span className="hidden sm:inline">Simpan Konfigurasi</span>
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex-none bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 z-10">
                <div className="flex gap-8">
                    {[
                        { id: 'general', icon: HiOutlineGlobeAlt, label: 'General Info' },
                        { id: 'branding', icon: HiOutlineColorSwatch, label: 'Branding & Colors' },
                        { id: 'code', icon: HiOutlineCode, label: 'Custom Code' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveMainTab(tab.id as MainTab)}
                            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all ${
                                activeMainTab === tab.id 
                                ? 'border-gold-500 text-gold-600' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
                {activeMainTab === 'code' ? (
                    /* High Fidelity Split-View Editor */
                    <div className={`flex flex-col lg:flex-row min-h-0 bg-white dark:bg-gray-800 ${isFocusMode ? 'fixed inset-0 z-[100] flex-1' : 'flex-1'} animate-fade-in`}>
                        {/* Left Side: Editor */}
                        <div className={`${showPreview ? 'lg:w-[60%]' : 'lg:w-full'} flex flex-col border-r border-gray-200 dark:border-gray-800 bg-[#1e1e2e] transition-all duration-300`}>
                            <div className="flex-none bg-[#181825] flex justify-between items-center px-4 py-1">
                                <div className="flex gap-2">
                                    {[
                                        { id: 'html', label: 'index.html', color: 'text-orange-400' },
                                        { id: 'css', label: 'styles.css', color: 'text-blue-400' },
                                        { id: 'js', label: 'main.js', color: 'text-yellow-400' }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveCodeTab(tab.id as CodeTab)}
                                            className={`py-3 px-4 text-xs font-mono border-b-2 transition-all flex items-center gap-2 ${
                                                activeCodeTab === tab.id 
                                                ? 'border-gold-500 text-white bg-[#1e1e2e]' 
                                                : 'border-transparent text-gray-500 hover:text-gray-300'
                                            }`}
                                        >
                                            <span className={tab.color}>●</span>
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowVariableRef(!showVariableRef)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all z-10 ${
                                                showVariableRef 
                                                ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/30' 
                                                : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5'
                                            }`}
                                        >
                                            <HiOutlineInformationCircle className="w-3.5 h-3.5" />
                                            {showVariableRef ? 'Hide Variables' : 'Show Variables'}
                                        </button>
                                        {isFocusMode && (
                                            <button
                                                onClick={() => toggleFocusMode(false)}
                                                className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest mr-4"
                                            >
                                                Exit Focus Mode ✖
                                            </button>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-600 font-mono">LIVE SYNC ACTIVE</span>
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 w-full min-h-0 relative flex">
                                <div className="flex-1">
                                    <Editor
                                        height="100%"
                                        theme="vs-dark"
                                        beforeMount={handleEditorWillMount}
                                        onMount={(editor) => {
                                            editorRef.current = editor;
                                        }}
                                        path={`site_code_${activeCodeTab}`}
                                        defaultLanguage={activeCodeTab === 'js' ? 'javascript' : activeCodeTab}
                                        language={activeCodeTab === 'js' ? 'javascript' : activeCodeTab}
                                        value={
                                            activeCodeTab === 'html' ? config.site_code_html :
                                            activeCodeTab === 'css' ? config.site_code_css :
                                            config.site_code_js
                                        }
                                        onChange={(value) => handleCodeChange(value, activeCodeTab)}
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 14,
                                            wordWrap: 'on',
                                            padding: { top: 20 },
                                            scrollBeyondLastLine: false,
                                            smoothScrolling: true,
                                            cursorBlinking: 'smooth',
                                            cursorSmoothCaretAnimation: 'on',
                                            lineNumbers: 'on',
                                            glyphMargin: false,
                                            folding: true,
                                            lineDecorationsWidth: 0,
                                            lineNumbersMinChars: 3,
                                        }}
                                    />
                                </div>

                                 {/* Reference Sider (Variables & Assets) */}
                                 {showVariableRef && (
                                    <div className="w-72 bg-[#181825] border-l border-white/5 flex flex-col animate-slide-in-right z-30 shadow-2xl">
                                        <div className="p-3 border-b border-white/5 flex items-center justify-between">
                                            <div className="flex gap-4">
                                                <button 
                                                    onClick={() => setActiveSiderTab('variables')}
                                                    className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors ${activeSiderTab === 'variables' ? 'text-gold-500' : 'text-gray-500 hover:text-gray-300'}`}
                                                >
                                                    <HiOutlineInformationCircle className="w-3.5 h-3.5" />
                                                    Variables
                                                </button>
                                                <button 
                                                    onClick={() => setActiveSiderTab('images')}
                                                    className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors ${activeSiderTab === 'images' ? 'text-gold-500' : 'text-gray-500 hover:text-gray-300'}`}
                                                >
                                                    <HiOutlinePhotograph className="w-3.5 h-3.5" />
                                                    Assets
                                                </button>
                                            </div>
                                            <button onClick={() => setShowVariableRef(false)} className="text-gray-500 hover:text-white text-xs">Close</button>
                                        </div>
                                        
                                        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                                            {activeSiderTab === 'variables' ? (
                                                <>
                                                    {[
                                                        { title: 'Identity', vars: ['site_name', 'tagline', 'site_logo', 'site_url'] },
                                                        { title: 'Branding', vars: ['primary_color', 'accent_color'] },
                                                        { title: 'Contact', vars: ['contact_email', 'contact_whatsapp'] },
                                                        { title: 'Socials', vars: ['site_instagram', 'site_tiktok', 'site_youtube'] },
                                                        { title: 'Loops (Arrays)', vars: ['features', 'reviews'] }
                                                    ].map(group => (
                                                        <div key={group.title}>
                                                            <p className="text-[9px] font-bold text-gray-600 uppercase mb-2">{group.title}</p>
                                                            <div className="space-y-1.5">
                                                                {group.vars.map(v => (
                                                                    <button 
                                                                        key={v}
                                                                        onClick={() => insertVariable(v)}
                                                                        title={`Click to insert {{${v}}}`}
                                                                        className="w-full text-left p-2 rounded bg-white/5 hover:bg-white/10 group flex items-center justify-between transition-colors"
                                                                    >
                                                                        <code className="text-[10px] text-gold-400 font-mono">{"{{"}{v}{"}}"}</code>
                                                                        <HiOutlineClipboardCopy className="w-3 h-3 text-gray-600 group-hover:text-gold-500" />
                                                                    </button>
                                                                ))}
                                                                {group.title === 'Loops (Arrays)' && (
                                                                    <div className="mt-2 pl-2 border-l border-white/5 space-y-1">
                                                                        <p className="text-[8px] text-gray-500 font-mono">Properties inside loops:</p>
                                                                        <p className="text-[8px] text-gray-400 font-mono italic">features: feature_name</p>
                                                                        <p className="text-[8px] text-gray-400 font-mono italic">reviews: bride_name, groom_name, rate_star, comment, alamat</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </>
                                            ) : (
                                                <div className="space-y-6">
                                                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                                        <ImageUpload
                                                            imageType="website_custom_code"
                                                            title="Add Asset"
                                                            description="Upload images to use in code"
                                                            allowMultiple={true}
                                                            onUploadSuccess={addCodeImage}
                                                            onDeleteSuccess={() => {}}
                                                            aspectRatio="square"
                                                        />
                                                    </div>

                                                    <div className="space-y-3">
                                                        <p className="text-[9px] font-bold text-gray-600 uppercase">Uploaded Assets</p>
                                                        {loadingImages ? (
                                                            <div className="flex justify-center py-4">
                                                                <div className="w-4 h-4 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
                                                            </div>
                                                        ) : codeImages.length === 0 ? (
                                                            <p className="text-[10px] text-gray-500 italic text-center py-4">No assets uploaded yet.</p>
                                                        ) : (
                                                            <div className="grid grid-cols-1 gap-3">
                                                                {codeImages.map((img, index) => (
                                                                    <div key={img.id} className="group bg-white/5 rounded-lg overflow-hidden border border-white/5 hover:border-gold-500/50 transition-all">
                                                                        <div 
                                                                            className="aspect-video relative overflow-hidden bg-black/40 cursor-pointer group/img"
                                                                        >
                                                                            <ProxyImage 
                                                                                src={img.cdn_url || img.drive_url} 
                                                                                alt={img.file_name}
                                                                                className="w-full h-full object-contain group-hover/img:scale-110 transition-transform duration-500"
                                                                            />
                                                                            <div 
                                                                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                                                onClick={() => setLightboxIndex(index)}
                                                                            >
                                                                                <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                                    {confirmDeleteId === img.id ? (
                                                                                        <div className="flex flex-col items-center gap-2 px-2 text-center animate-fade-in">
                                                                                            <p className="text-[10px] text-white font-bold leading-tight">Hapus asset ini?</p>
                                                                                            <div className="flex gap-2">
                                                                                                <button 
                                                                                                    onClick={() => setConfirmDeleteId(null)}
                                                                                                    className="px-2 py-1 bg-gray-600 text-white rounded text-[9px] font-bold uppercase"
                                                                                                >
                                                                                                    Batal
                                                                                                </button>
                                                                                                <button 
                                                                                                    onClick={async () => {
                                                                                                        setConfirmDeleteId(null);
                                                                                                        setDeletingId(img.id);
                                                                                                        try {
                                                                                                            await imageApi.deleteImage(img.id, { skipLoader: true });
                                                                                                            removeCodeImage(img.id);
                                                                                                            toast.success('Asset deleted');
                                                                                                        } catch (err) {
                                                                                                            toast.error('Failed to delete asset');
                                                                                                        } finally {
                                                                                                            setDeletingId(null);
                                                                                                        }
                                                                                                    }}
                                                                                                    className="px-2 py-1 bg-red-500 text-white rounded text-[9px] font-bold uppercase"
                                                                                                >
                                                                                                    Ya, Hapus
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <>
                                                                                            <button 
                                                                                                onClick={() => insertVariable(img.file_name.replace('.webp', ''))}
                                                                                                className="p-1.5 bg-gold-500 text-white rounded-md text-[10px] font-bold uppercase hover:scale-105 transition-transform"
                                                                                            >
                                                                                                Insert
                                                                                            </button>
                                                                                            <button 
                                                                                                onClick={() => setConfirmDeleteId(img.id)}
                                                                                                className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-md text-[10px] font-bold uppercase hover:scale-105 transition-transform"
                                                                                            >
                                                                                                <HiOutlineTrash className="w-3.5 h-3.5" />
                                                                                            </button>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            {/* Individual Loading Overlay */}
                                                                            {deletingId === img.id && (
                                                                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 z-10 animate-fade-in">
                                                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                                                    <span className="text-[9px] text-white font-bold uppercase tracking-widest">Menghapus...</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="p-2 flex items-center justify-between">
                                                                            <code className="text-[10px] text-gold-400 font-mono">{"{{"}{img.file_name.replace('.webp', '')}{"}}"}</code>
                                                                            <span className="text-[9px] text-gray-500 truncate max-w-[100px]">{img.file_name}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {!showVariableRef && (
                                    <button 
                                        onClick={() => setShowVariableRef(true)}
                                        className="absolute right-6 top-6 z-50 p-3 bg-gold-500 text-white rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center gap-2 group overflow-hidden"
                                        title="Show Variables"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        <HiOutlineInformationCircle className="w-6 h-6 relative z-10" />
                                        <span className="text-xs font-bold uppercase tracking-widest relative z-10 pr-1">Variables</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Right Side: Live Preview */}
                        {showPreview && (
                            <div className="lg:w-[40%] flex flex-col bg-gray-100 dark:bg-gray-900 border-l border-white/5 shadow-inner relative">
                                {/* Preview Toolbar */}
                                <div className="flex-none p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setPreviewDevice('desktop')}
                                            className={`p-1.5 rounded-lg transition-all ${previewDevice === 'desktop' ? 'bg-gold-100 text-gold-600' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            <HiOutlineDesktopComputer className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={() => setPreviewDevice('mobile')}
                                            className={`p-1.5 rounded-lg transition-all ${previewDevice === 'mobile' ? 'bg-gold-100 text-gold-600' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            <HiOutlineDeviceMobile className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{previewDevice} VIEW</span>
                                         <a 
                                            href={window.location.origin + window.location.pathname + '#/home'} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="p-1.5 text-gray-400 hover:text-gold-500"
                                            title="Open in New Tab"
                                        >
                                            <HiOutlineExternalLink className="w-5 h-5" />
                                        </a>
                                    </div>
                                </div>

                                {/* Iframe Frame */}
                                <div className="flex-1 p-8 flex items-start justify-center overflow-auto custom-scrollbar">
                                    <div className={`bg-white dark:bg-gray-950 shadow-2xl transition-all duration-500 overflow-hidden relative border border-gray-200 dark:border-gray-800 ${
                                        previewDevice === 'mobile' 
                                        ? 'w-[375px] h-[667px] rounded-[3rem] border-[8px] border-gray-800' 
                                        : 'w-full h-full rounded-xl'
                                    }`}>
                                        <iframe 
                                            ref={iframeRef}
                                            src={window.location.origin + window.location.pathname + '#/home'}
                                            className="w-full h-full"
                                            title="Landing Page Preview"
                                            onLoad={() => {
                                                // Initial sync on load
                                                if (iframeRef.current?.contentWindow) {
                                                    iframeRef.current.contentWindow.postMessage({
                                                        type: 'PREVIEW_CONFIG_UPDATE',
                                                        config: config,
                                                        codeImages: codeImages
                                                    }, '*');
                                                }
                                            }}
                                        />
                                        {previewDevice === 'mobile' && (
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-2xl"></div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    ) : (
                    <div className="h-full overflow-y-auto custom-scrollbar p-6">
                        <div className="max-w-5xl mx-auto">
                            {activeMainTab === 'general' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="card-no-hover p-8">
                                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                                <HiOutlineGlobeAlt className="text-gold-500" />
                                                Identity Settings
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="label-field">Site Name</label>
                                                        <input 
                                                            type="text" name="site_name" value={config.site_name} onChange={handleChange} 
                                                            className="input-field" placeholder="e.g. Wedding invitation SaaS" 
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="label-field">Site URL</label>
                                                        <input 
                                                            type="url" name="site_url" value={config.site_url} onChange={handleChange} 
                                                            className="input-field" placeholder="https://yourwebsite.com"                                                         />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-end mb-1">
                                                        <label className="label-field">Site Logo</label>
                                                        {config.site_logo && (
                                                            <button
                                                                onClick={() => {
                                                                    setPreviewLogoUrl('');
                                                                    setPendingLogoFile(null);
                                                                    setConfig(prev => ({ ...prev, site_logo: '' }));
                                                                }}
                                                                className="text-xs flex items-center gap-1 text-red-600 hover:text-red-700 font-medium bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-md transition-colors"
                                                            >
                                                                <HiOutlineTrash className="w-3.5 h-3.5" />
                                                                Hapus Logo
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="relative group border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden hover:border-gold-400 transition-all min-h-[140px] flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                                                        {config.site_logo ? (
                                                            <div className="w-full h-full relative p-4 flex items-center justify-center">
                                                                <ProxyImage 
                                                                    src={config.site_logo} 
                                                                    alt="Logo Preview" 
                                                                    className="max-h-32 object-contain"
                                                                />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 cursor-pointer">
                                                                    <p className="text-white text-xs font-bold uppercase">Ganti Logo</p>
                                                                    <p className="text-gray-300 text-[10px]">Upload / Drop Gambar</p>
                                                                    <input 
                                                                        type="file" 
                                                                        className="absolute inset-0 opacity-0 cursor-pointer" 
                                                                        accept="image/*"
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) processLogoFile(file);
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                                                                <div className="p-3 bg-gold-50 dark:bg-gold-900/20 rounded-full text-gold-500 mb-2">
                                                                    <HiOutlineUpload className="w-6 h-6" />
                                                                </div>
                                                                <p className="mb-0.5 text-xs text-gray-600 dark:text-gray-300">
                                                                    <span className="font-semibold text-gold-600 dark:text-gold-400">Pilih logo website</span>
                                                                </p>
                                                                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                                                    PNG, WebP atau JPEG (Max 5MB)
                                                                </p>
                                                                <input 
                                                                    type="file" 
                                                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                                                    accept="image/*"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) processLogoFile(file);
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="label-field">Tagline</label>
                                                    <input 
                                                        type="text" name="tagline" value={config.tagline} onChange={handleChange} 
                                                        className="input-field" placeholder="The easiest way to build your wedding site" 
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="label-field">SEO Site Description</label>
                                                    <textarea 
                                                        name="site_description" value={config.site_description} onChange={handleChange} 
                                                        className="input-field h-32 resize-none" placeholder="Enter keywords and description for search engines..." 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="card-no-hover p-8">
                                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                                <HiOutlineShare className="text-gold-500" />
                                                Contact & Socials
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="space-y-1">
                                                    <label className="label-field">Email Contact</label>
                                                    <div className="relative">
                                                        <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input 
                                                            type="email" name="contact_email" value={config.contact_email} onChange={handleChange} 
                                                            className="input-field pl-10" placeholder="hello@site.com" 
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="label-field">WhatsApp (No Country Code)</label>
                                                    <input 
                                                        type="text" name="contact_whatsapp" value={config.contact_whatsapp} onChange={handleChange} 
                                                        className="input-field" placeholder="e.g. 628123xxx" 
                                                    />
                                                </div>
                                                <div className="space-y-1 pt-4 border-t border-gray-100 dark:border-gray-800">
                                                    <label className="label-field text-pink-500">Instagram URL</label>
                                                    <input 
                                                        type="text" name="site_instagram" value={config.site_instagram} onChange={handleChange} 
                                                        className="input-field" placeholder="https://instagram.com/..." 
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="label-field text-gray-800 dark:text-gray-200">TikTok URL</label>
                                                    <input 
                                                        type="text" name="site_tiktok" value={config.site_tiktok} onChange={handleChange} 
                                                        className="input-field" placeholder="https://tiktok.com/@..." 
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="label-field text-red-600">YouTube URL</label>
                                                    <input 
                                                        type="text" name="site_youtube" value={config.site_youtube} onChange={handleChange} 
                                                        className="input-field" placeholder="https://youtube.com/c/..." 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeMainTab === 'branding' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
                                    <div className="lg:col-span-1 space-y-6">
                                        <div className="card-no-hover p-8">
                                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                                <HiOutlineColorSwatch className="text-gold-500" />
                                                Primary Theme
                                            </h3>
                                            <div className="space-y-5">
                                                <div className="space-y-2">
                                                    <label className="label-field">Primary Color</label>
                                                    <div className="flex gap-3">
                                                        <input 
                                                            type="color" name="primary_color" value={config.primary_color} onChange={handleChange} 
                                                            className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 inline-block align-middle" 
                                                        />
                                                        <input 
                                                            type="text" name="primary_color" value={config.primary_color} onChange={handleChange} 
                                                            className="input-field font-mono uppercase tracking-wider flex-1" 
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="label-field">Accent Color</label>
                                                    <div className="flex gap-3">
                                                        <input 
                                                            type="color" name="accent_color" value={config.accent_color} onChange={handleChange} 
                                                            className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 inline-block align-middle" 
                                                        />
                                                        <input 
                                                            type="text" name="accent_color" value={config.accent_color} onChange={handleChange} 
                                                            className="input-field font-mono uppercase tracking-wider flex-1" 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="card-no-hover p-8 bg-white dark:bg-gray-800">
                                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 uppercase tracking-tight">Visual Theme Preview</h3>
                                            <div className="space-y-8">
                                                {/* Mock UI Elements */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-4">
                                                        <p className="text-sm font-bold text-gray-400">Buttons & Actions</p>
                                                        <div className="flex flex-wrap gap-3">
                                                            <button className="px-5 py-2 rounded-xl text-white text-sm font-bold shadow-lg" style={{ backgroundColor: config.primary_color }}>Primary action</button>
                                                            <button className="px-5 py-2 rounded-xl text-white text-sm font-bold shadow-lg" style={{ backgroundColor: config.accent_color }}>Accent Button</button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <p className="text-sm font-bold text-gray-400">Typography Tone</p>
                                                        <h1 className="text-2xl font-display font-bold" style={{ color: config.primary_color }}>Headline Title</h1>
                                                        <p className="text-sm" style={{ color: config.accent_color }}>Lush and elegant description text using the chosen accent tone.</p>
                                                    </div>
                                                </div>

                                                <div className="pt-8 border-t border-gray-100 dark:border-gray-700">
                                                    <p className="text-sm font-bold text-gray-400 mb-4">Gradient Preview</p>
                                                    <div 
                                                        className="h-32 rounded-3xl shadow-2xl flex items-center justify-center text-white font-display font-bold text-2xl"
                                                        style={{ background: `linear-gradient(135deg, ${config.primary_color}, ${config.accent_color})` }}
                                                    >
                                                        Brand Vision
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-3">
                                                    {[1,2,3].map(i => (
                                                        <div key={i} className="h-24 rounded-2xl opacity-80" style={{ backgroundColor: i === 1 ? config.primary_color : i === 2 ? config.accent_color : '#FFFFFF', border: '1px solid #E5E7EB' }}></div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            {/* Lightbox */}
            {lightboxIndex !== null && (
                <Lightbox 
                    images={codeImages.map(img => ({
                        url: img.cdn_url || img.drive_url,
                        file_name: img.file_name,
                        width: img.width,
                        height: img.height,
                        size_kb: img.size_kb
                    }))}
                    initialIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                />
            )}
            </div>
        </div>
    );
}
