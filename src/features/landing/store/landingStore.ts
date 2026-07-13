import { create } from 'zustand';
import { publicApi } from '@/core/api/endpoints';
import { Theme, MstPlanType, MstPlanFeature, WebsiteConfig, ReviewAndRating, MstAdditionalFeature } from '@/types';
import kosaIcon from '@/assets/img/kosa-icon.png';

/**
 * Session cache for the public landing-page data (config, themes, plans,
 * features, reviews, resolved logo).
 *
 * WHY: the landing page fetches all of this on mount. Navigating to
 * login/register and back re-mounts the page, which used to re-fetch and flash
 * the loading spinner every time. This store fetches ONCE per session and keeps
 * the result, so returning to the landing page renders instantly from cache.
 *
 * The cache lives as long as the SPA session (module-level state). A full page
 * refresh clears it and triggers a fresh fetch — which is the intended
 * freshness boundary (per product decision: cache once per session).
 */
interface LandingState {
    config: WebsiteConfig | null;
    themes: Theme[];
    planTypes: MstPlanType[];
    planFeatures: MstPlanFeature[];
    reviews: ReviewAndRating[];
    additionalFeatures: MstAdditionalFeature[];
    logoUrl: string | null;

    loaded: boolean;      // true once the first successful fetch has completed
    isLoading: boolean;   // a fetch is currently in flight

    /** Fetch + cache all landing data. No-op if already loaded (unless force). */
    fetchAll: (force?: boolean) => Promise<void>;
}

// Re-entrancy guard: prevents a second fetch from starting while one is in
// flight (e.g. React StrictMode double-invoking the effect in dev, or two
// mounts racing). Kept outside the store since `isLoading` starts truthy.
let inFlight = false;

export const useLandingStore = create<LandingState>((set, get) => ({
    config: null,
    themes: [],
    planTypes: [],
    planFeatures: [],
    reviews: [],
    additionalFeatures: [],
    logoUrl: null,

    loaded: false,
    // Start truthy so the landing page shows its loading screen immediately on
    // the very first render (no empty-data flash before the fetch effect runs).
    // Combined with `loaded` in the page as `!loaded && isLoading`, return
    // visits (loaded=true) never show the spinner.
    isLoading: true,

    fetchAll: async (force = false) => {
        const { loaded } = get();
        // Already cached this session → skip (instant render from cache).
        if (loaded && !force) return;
        if (inFlight) return;   // a fetch is already running
        inFlight = true;

        set({ isLoading: true });
        try {
            const [configRes, themesRes, plansRes, featuresRes] = await Promise.all([
                publicApi.getWebsiteConfig(),
                publicApi.getPublicThemes(),
                publicApi.getPublicPlanTypes(),
                publicApi.getPublicPlanFeatures(),
            ]);

            // Favicon: default first, then override with the dynamic site logo.
            const setFavicon = (href: string) => {
                let fav = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
                if (!fav) {
                    fav = document.createElement('link') as HTMLLinkElement;
                    fav.rel = 'icon';
                    document.head.appendChild(fav);
                }
                fav.href = href;
            };
            setFavicon(kosaIcon);   // default; overridden by site_logo below if set

            let siteLogo: string | undefined;
            if (configRes.success) {
                set({
                    config: configRes.data,
                    reviews: configRes.data.reviews || [],
                    additionalFeatures: configRes.data.features || [],
                });
                siteLogo = configRes.data.site_logo;
            }
            if (themesRes.success) set({ themes: themesRes.data });
            if (plansRes.success) set({ planTypes: plansRes.data });
            if (featuresRes.success) set({ planFeatures: featuresRes.data });

            // Text data is ready → unblock the page NOW. The page has skeletons
            // for every data-driven section, so nothing else needs to gate the
            // first paint.
            set({ loaded: true });

            // Resolve the site logo (base64) in the BACKGROUND — reused by the
            // navbar/footer logo blocks AND the favicon. This is a separate
            // proxy fetch; awaiting it before `loaded` used to hold the whole
            // landing page hostage behind one image. Now it updates whenever it
            // finishes; until then the components fall back to the bundled icon.
            if (siteLogo) {
                import('@/shared/components/ProxyImage')
                    .then(({ fetchProxyImageBase64 }) => fetchProxyImageBase64(siteLogo!))
                    .then((resolvedLogo) => {
                        set({ logoUrl: resolvedLogo });
                        setFavicon(resolvedLogo);
                    })
                    .catch(() => { /* logo resolve is best-effort; ignore failures */ });
            }
        } catch (err) {
            console.error('Landing Page Data Fetch Error:', err);
        } finally {
            inFlight = false;
            set({ isLoading: false });
        }
    },
}));
