import { useState, useEffect } from 'react';
import { publicApi } from '@/core/api/endpoints';
import { WebsiteConfig } from '@/types';
import { parseTemplate } from '@/utils/templateParser';
import { fetchProxyImageBase64 } from '@/shared/components/ProxyImage';

export function LandingPage() {
    const [config, setConfig] = useState<WebsiteConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [resolvedData, setResolvedData] = useState<Record<string, any>>({});

    /**
     * Prepare data for template parsing, resolving proxies if needed
     */
    useEffect(() => {
        if (!config) return;

        const prepareData = async () => {
            const data: Record<string, any> = { ...config };
            
            // Resolve site_logo if it's a proxy URL
            if (config.site_logo && config.site_logo.includes('action=imageProxy')) {
                try {
                    const b64 = await fetchProxyImageBase64(config.site_logo);
                    data.site_logo = b64;
                } catch (e) {
                    console.error("Failed to resolve logo proxy:", e);
                }
            }

            // Fallback for site_logo if empty
            if (!data.site_logo) {
                data.site_logo = 'https://placehold.co/200x200?text=No+Logo+Uploaded';
            }

            setResolvedData(data);
        };

        prepareData();
    }, [config]);

    const fetchConfig = async () => {
        try {
            const res = await publicApi.getWebsiteConfig();
            if (res.success) {
                setConfig(res.data);
            }
        } catch (err) {
            console.error('Failed to load website config:', err);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Initial data fetch and message listener for live preview
     */
    useEffect(() => {
        fetchConfig();

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'PREVIEW_CONFIG_UPDATE') {
                setConfig(event.data.config);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    /**
     * Dynamic style and script injection
     */
    useEffect(() => {
        if (!config || Object.keys(resolvedData).length === 0) return;

        // Update document title and meta
        document.title = config.site_name || 'Wedding Invitation';
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.setAttribute('name', 'description');
            document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute('content', config.site_description || '');

        // Inject CSS
        const styleId = 'website-custom-css';
        let styleTag = document.getElementById(styleId) as HTMLStyleElement;
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }
        styleTag.innerHTML = parseTemplate(config.site_code_css || '', resolvedData);

        // Handle JS execution
        if (config.site_code_js) {
            try {
                const executeCustomJs = () => {
                    try {
                        const finalJs = parseTemplate(config.site_code_js || '', resolvedData);
                        // eslint-disable-next-line no-eval
                        eval(finalJs);
                    } catch (e) {
                        console.error("Error in website custom JS:", e);
                    }
                };
                
                const timeout = setTimeout(executeCustomJs, 100);
                return () => clearTimeout(timeout);
            } catch (err) {
                console.error('Failed to set up custom JS execution:', err);
            }
        }
    }, [config, resolvedData]);

    if (loading && !config) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-gold-200 border-t-gold-600 rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 animate-pulse">Loading platform...</p>
                </div>
            </div>
        );
    }

    if (!config) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Configuration Not Found</h1>
                <p className="text-gray-500">The platform landing page has not been configured yet.</p>
            </div>
        );
    }

    return (
        <div 
            className="website-landing-root"
            dangerouslySetInnerHTML={{ __html: parseTemplate(config.site_code_html || '', resolvedData) }} 
        />
    );
}
