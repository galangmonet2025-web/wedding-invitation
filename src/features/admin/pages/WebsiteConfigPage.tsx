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
    HiOutlineExternalLink
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import { ImageUpload } from '@/shared/components/ImageUpload';
import { imageApi } from '@/core/api/imageApi';
import { ImageRecord } from '@/types';
import { HiOutlineClipboardCopy, HiOutlineInformationCircle } from 'react-icons/hi';

type MainTab = 'general' | 'branding' | 'code';
type CodeTab = 'html' | 'css' | 'js';
type PreviewDevice = 'desktop' | 'mobile';

export function WebsiteConfigPage() {
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
    const [loading, setLoading] = useState(true);
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
    const [showVariableRef, setShowVariableRef] = useState(true);
    const editorRef = useRef<any>(null);
    
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        localStorage.setItem('website-config-show-preview', String(showPreview));
    }, [showPreview]);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const [configRes, imagesRes] = await Promise.all([
                websiteConfigApi.getConfig(),
                imageApi.getTenantImages()
            ]);

            if (configRes.success) {
                setConfig(configRes.data);
                
                // Find correct image record matching the saved logo URL
                if (configRes.data.site_logo && imagesRes.success) {
                    const found = imagesRes.data.find(img => 
                        img.cdn_url === configRes.data.site_logo || 
                        img.drive_url === configRes.data.site_logo
                    );
                    if (found) setLogoImage(found);
                }
            } else {
                toast.error(configRes.message);
            }
        } catch (err) {
            toast.error('Failed to load configuration');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const updatePreview = useCallback(() => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'PREVIEW_CONFIG_UPDATE',
                config: config
            }, '*');
        }
    }, [config]);

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

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await websiteConfigApi.updateConfig(config);
            if (res.success) {
                toast.success('Configuration saved successfully');
            } else {
                toast.error(res.message);
            }
        } catch (err) {
            toast.error('Failed to save configuration');
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
                        onClick={fetchConfig}
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

                                {/* Variable Reference Sider */}
                                {showVariableRef && (
                                    <div className="w-64 bg-[#181825] border-l border-white/5 flex flex-col animate-slide-in-right z-30 shadow-2xl">
                                        <div className="p-3 border-b border-white/5 flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                <HiOutlineInformationCircle className="w-3.5 h-3.5" />
                                                Variables
                                            </span>
                                            <button onClick={() => setShowVariableRef(false)} className="text-gray-500 hover:text-white text-xs">Close</button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
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
                                                        config: config
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
                                                    <ImageUpload
                                                        imageType="site_logo"
                                                        title="Site Logo"
                                                        description="Recommended: PNG or WebP with transparent background"
                                                        currentImage={logoImage}
                                                        onUploadSuccess={(img) => {
                                                            setLogoImage(img);
                                                            setConfig(prev => ({ ...prev, site_logo: img.cdn_url || img.drive_url }));
                                                        }}
                                                        onDeleteSuccess={() => {
                                                            setLogoImage(null);
                                                            setConfig(prev => ({ ...prev, site_logo: '' }));
                                                        }}
                                                        aspectRatio="auto"
                                                    />
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
            </div>
        </div>
    );
}
