import { useEffect, useState, useRef, useMemo } from 'react';
import '../invitation.css';
import { useParams, useLocation } from 'react-router-dom';
import { publicApi } from '@/core/api/endpoints';
import type { Wish, InvitationContent, TimelineItem, ImageRecord } from '@/types';
import { HiOutlineMusicNote, HiPause, HiPlay, HiOutlineQrcode, HiOutlineMenu, HiOutlineX, HiChevronLeft, HiChevronRight, HiX } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/shared/components/Modal';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { ThemeWrapper } from '../components/ThemeWrapper';
import { parseTemplate } from '@/utils/templateParser';
import { fetchProxyImageBase64 } from '@/shared/components/ProxyImage';
import { generateGoogleCalendarUrl } from '@/utils/calendarUtils';
import { RSVPSuccessModal } from '../components/RSVPSuccessModal';
import kosaIcon from '@/assets/img/kosa-icon.png';
import sampleStory1 from '@/assets/img/sample_story_1.jpg';
import sampleStory2 from '@/assets/img/sample_story_2.jpg';
import sampleStory3 from '@/assets/img/sample_story_3.jpg';
import defaultFrame from '@/assets/img/frame.png';
import { formatPhoneForWhatsApp } from '@/utils/whatsappUtils';
import { normalizeInstagramUsername } from '@/utils/instagramUtils';

// Build a wa.me link from a raw WhatsApp number (returns '' when no number is set)
const buildWaMeUrl = (phone: any): string => {
    if (!phone) return '';
    const num = formatPhoneForWhatsApp(String(phone));
    return num ? `https://wa.me/${num}` : '';
};

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

interface TenantPublic {
    bride_name: string;
    bride_nickname?: string;
    groom_name: string;
    groom_nickname?: string;
    wedding_date: string;
    domain_slug: string;
    status_payment?: string;
}

interface InvitationData {
    tenant: TenantPublic;
    wishes: Wish[];
    content: Partial<InvitationContent>;
    guest?: import('@/types').Guest;
    theme?: import('@/types').Theme;
    images?: ImageRecord[];
    quotes?: Partial<import('@/types').QuotesVariant> | null;
}

interface InvitationPageProps {
    previewData?: Partial<InvitationContent> | null;
}

export function InvitationPage({ previewData }: InvitationPageProps) {
    const { slug, themeCode } = useParams<{ slug: string; themeCode?: string }>();
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const [data, setData] = useState<InvitationData | null>(null);
    const [loading, setLoading] = useState(!previewData); // Only load if not previewing
    const [error, setError] = useState('');
    const [isOpened, setIsOpened] = useState(false);
    const [wishes, setWishes] = useState<Wish[]>([]);
    const [showQRModal, setShowQRModal] = useState(false);
    const [resolvedImages, setResolvedImages] = useState<Record<string, string> | null>(null);

    const [showGuestForm, setShowGuestForm] = useState(false);
    const [tempGuestData, setTempGuestData] = useState({ name: '', category: t('invitation.guest_categories.general_guest') });
    const [generatedUninvitedQR, setGeneratedUninvitedQR] = useState<string | null>(null);
    const [isCheckingGuest, setIsCheckingGuest] = useState(false);

    // Dynamic Loading Messages State
    const [loadingStep, setLoadingStep] = useState(0);

    const loadingMessages = useMemo(() => [
        'Menghubungkan dengan sistem...',
        'Mengambil informasi mempelai...',
        'Mengunduh aset & galeri foto...',
        'Mempersiapkan daftar ucapan doa...',
        'Menyelaraskan musik latar...',
        'Menyusun tata letak undangan kustom...',
        'Hampir selesai...',
        'Menyajikan undangan indah untuk Anda...'
    ], []);

    useEffect(() => {
        if (!loading && resolvedImages) return;

        const interval = setInterval(() => {
            setLoadingStep(prev => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
        }, 2500);

        return () => clearInterval(interval);
    }, [loading, resolvedImages, loadingMessages]);

    // Lightbox State
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxImages, setLightboxImages] = useState<string[]>([]);
    const [currentLightboxIndex, setCurrentLightboxIndex] = useState(0);

    // Memoized core data to prevent reference changes every second during countdown updates
    const activeContent = useMemo(() =>
        previewData || data?.content || {} as Partial<InvitationContent>
        , [previewData, data?.content]);

    const timeline = useMemo(() => {
        if (!activeContent.timeline_kisah) return [] as TimelineItem[];
        try {
            return JSON.parse(activeContent.timeline_kisah) as TimelineItem[];
        } catch {
            return [] as TimelineItem[];
        }
    }, [activeContent.timeline_kisah]);

    const { tenant } = useMemo(() => {
        if (data) return { tenant: data.tenant };
        return {
            tenant: {
                bride_name: 'Fiona',
                bride_nickname: 'Fiona',
                groom_name: 'Galang',
                groom_nickname: 'Galang',
                wedding_date: '2026-10-20',
                domain_slug: 'demo',
                status_payment: 'Sudah dibayar'
            }
        };
    }, [data]);

    // Audio State
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [youtubeId, setYoutubeId] = useState<string | null>(null);
    const ytIframeRef = useRef<HTMLIFrameElement>(null);

    // Update Page Title
    useEffect(() => {
        if (data && data.tenant) {
            document.title = t('invitation.page_title', { bride: data.tenant.bride_name, groom: data.tenant.groom_name });
        }
        return () => {
            document.title = t('invitation.default_title');
        };
    }, [data?.tenant, t]);

    useEffect(() => {
        const musicLink = activeContent.link_backsound_music;
        if (!musicLink) return;

        // Check if it's a YouTube link
        const ytMatch = musicLink.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*embed\/))([^&?\n]+)/);
        if (ytMatch && ytMatch[1]) {
            setYoutubeId(ytMatch[1]);

            // Send command to the existing iframe
            if (ytIframeRef.current && ytIframeRef.current.contentWindow) {
                if (isPlaying) {
                    ytIframeRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                } else {
                    ytIframeRef.current.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                }
            }
            return;
        }

        // Standard Audio logic
        if (!audioRef.current) {
            audioRef.current = new Audio(musicLink);
            audioRef.current.loop = true;
        }

        if (isPlaying && isOpened) {
            audioRef.current.play().catch(console.error);
        } else if (audioRef.current) {
            audioRef.current.pause();
        }
    }, [isPlaying, isOpened, activeContent.link_backsound_music]);

    // Cleanup audio on component unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, []);

    // RSVP State
    const [rsvpCode, setRsvpCode] = useState('');
    const [rsvpStatus, setRsvpStatus] = useState<'confirmed' | 'declined'>('confirmed');
    const [rsvpGuests, setRsvpGuests] = useState(1);
    const [rsvpLoading, setRsvpLoading] = useState(false);
    const [rsvpResult, setRsvpResult] = useState<{ success: boolean; message: string; calendarUrl?: string } | null>(null);
    const [isRSVPModalOpen, setIsRSVPModalOpen] = useState(false);
    const [rsvpModalData, setRsvpModalData] = useState<any>(null);

    // Wish State
    const [wishName, setWishName] = useState('');
    const [wishMessage, setWishMessage] = useState('');
    const [wishLoading, setWishLoading] = useState(false);

    // Countdown
    const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    // Sections ref for scroll animation
    const sectionsRef = useRef<(HTMLElement | null)[]>([]);

    // Navigation Menu State
    const [sections, setSections] = useState<{ id: string; label: string }[]>([]);
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [websiteConfig, setWebsiteConfig] = useState<any>(null);
    const [activeSectionIndex, setActiveSectionIndex] = useState(-1);
    const hasFetchedSections = useRef(false);

    useEffect(() => {
        if (isOpened && !hasFetchedSections.current) {
            // Finding sections needs to happen after the ThemeWrapper has had a chance 
            // to render the dangerouslySetInnerHTML content.
            const timeout = setTimeout(() => {
                const secEls = document.querySelectorAll('section[data-menu-label]');
                if (secEls.length > 0) {
                    const newSections = Array.from(secEls).map(el => ({
                        id: el.id,
                        label: el.getAttribute('data-menu-label') || 'Section'
                    }));
                    setSections(newSections);
                    hasFetchedSections.current = true; // Mark as fetched permanently
                }
            }, 500); // 500ms should be enough for DOM injection and layout

            return () => clearTimeout(timeout);
        }
    }, [isOpened]); // run exactly once after opened

    // Track active section for auto-scroll
    useEffect(() => {
        if (!isOpened || sections.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const idx = sections.findIndex(s => s.id === entry.target.id);
                        if (idx !== -1) setActiveSectionIndex(idx);
                    }
                });
            },
            { threshold: 0.1 }
        );

        sections.forEach(s => {
            const el = document.getElementById(s.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [isOpened, sections]);

    // Live Preview Message Listener
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'invitation-preview-update') {
                const { content, images: newImages, theme: newTheme, quotes: newQuotes } = event.data;
                console.log("Live Preview Update Received:", { content, newImages, newTheme, newQuotes });

                setData(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        content: { ...prev.content, ...content },
                        images: newImages || prev.images,
                        theme: newTheme || prev.theme,
                        quotes: newQuotes !== undefined ? newQuotes : prev.quotes
                    };
                });
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        if (slug && !previewData) fetchInvitation();
    }, [slug, previewData, themeCode]);

    // Fetch Global Website Config for Favicon
    useEffect(() => {
        // Set default favicon immediately
        let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }
        favicon.href = kosaIcon;

        const fetchConfig = async () => {
            try {
                const res = await publicApi.getWebsiteConfig();
                if (res.success) {
                    setWebsiteConfig(res.data);
                    if (res.data.site_logo) {
                        const resolvedLogo = await fetchProxyImageBase64(res.data.site_logo);
                        let fav = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
                        if (fav) {
                            fav.href = resolvedLogo;
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load website config for favicon:', err);
            }
        };
        fetchConfig();
    }, []);

    // When data loads, resolve all proxy images to base64 for template rendering.
    //
    // PERF: this used to await ALL images (Promise.all over the whole gallery +
    // theme assets) before calling setResolvedImages once — and the render guard
    // below blocked the entire invitation until then. With Apps Script's slow,
    // un-cached base64 proxy that meant several seconds of a spinner even for
    // repeat visitors. Now we resolve PROGRESSIVELY: seed resolvedImages to {}
    // immediately so the page can render, then merge each image in as it arrives
    // (cache hits from IndexedDB land almost instantly). The memoized finalHtml
    // re-renders on every merge, so images pop in instead of gating the page.
    useEffect(() => {
        if (!data) return;
        let cancelled = false;

        // Merge a freshly-resolved batch into resolvedImages without dropping
        // entries resolved by earlier/concurrent batches.
        const merge = (entries: Record<string, string>) => {
            if (cancelled || Object.keys(entries).length === 0) return;
            setResolvedImages(prev => ({ ...(prev || {}), ...entries }));
        };

        // Unblock the render guard right away even before any image is resolved.
        setResolvedImages(prev => prev || {});

        const resolveOne = async (cdnUrl?: string | null, ...keys: string[]) => {
            if (!cdnUrl) return;
            try {
                const proxiedUrl = resolveProxyUrl(cdnUrl);
                const b64 = await fetchProxyImageBase64(proxiedUrl);
                const entry: Record<string, string> = {};
                for (const k of keys) entry[k] = b64;
                entry[cdnUrl] = b64;
                if (proxiedUrl !== cdnUrl) entry[proxiedUrl] = b64;
                merge(entry);
            } catch { }
        };

        // Tenant images (hero, gallery, etc.) — each resolves & merges independently.
        (data.images || []).forEach(img => {
            if (img?.cdn_url) void resolveOne(img.cdn_url, img.image_type);
        });

        // Instagram story reply frame.
        const rawFrame = data.content?.frame_balasan_instagram;
        if (isValidImageUrl(rawFrame)) void resolveOne(rawFrame, 'frame_balasan_instagram');

        // Static theme asset IMAGES ({{asset_image_N}}). Videos/YouTube stay raw.
        (data.theme?.asset_media_list || []).forEach((a: any) => {
            if (a && a.media_type === 'image' && a.media_cdn_url) void resolveOne(a.media_cdn_url);
        });

        return () => { cancelled = true; };
    }, [data]);

    useEffect(() => {
        // Safe check for tenant data
        const weddingDateStr = data?.tenant?.wedding_date || tenant?.wedding_date;
        if (!weddingDateStr) return;

        const interval = setInterval(() => {
            const target = new Date(weddingDateStr).getTime();
            const now = Date.now();
            const diff = Math.max(0, target - now);
            setCountdown({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000),
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [data, tenant?.wedding_date]);

    // Scroll animation observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('inv-visible');
                    }
                });
            },
            { threshold: 0.15 }
        );
        sectionsRef.current.forEach((el) => el && observer.observe(el));
        return () => observer.disconnect();
    }, [isOpened, data, previewData]);

    const fetchInvitation = async () => {
        try {
            const searchParams = new URLSearchParams(location.search);
            // Accept both ?guestid= and ?guestId= (the preview URL uses guestId)
            const guestid = searchParams.get('guestid') || searchParams.get('guestId');
            console.log("Fetching invitation for slug:", slug, "guestid:", guestid, "themeCode:", themeCode);
            const res = await publicApi.getInvitation(slug!, guestid, themeCode);
            console.log("Response from getInvitation:", res);
            if (res.success) {
                setData(res.data);
                setWishes(res.data.wishes || []);
            } else {
                setError(res.message || 'Invitation not found');
            }
        } catch (err) {
            console.error("Error fetching invitation:", err);
            setError('Failed to load invitation');
        } finally {
            setLoading(false);
        }
    };

    const handleRSVP = async (e?: React.FormEvent, manualData?: { status: string; guests: number; code: string }) => {
        if (e) e.preventDefault();

        const rawStatus = manualData?.status || rsvpStatus;
        const normalizedStatus = (rawStatus === 'hadir' || rawStatus === 'confirmed') ? 'confirmed' : 'declined';
        const guests = manualData?.guests || rsvpGuests;
        const code = manualData?.code || rsvpCode;

        if (!code.trim()) {
            toast.error(t('invitation.rsvp_code_required'), { duration: 4000 });
            return { success: false, message: t('invitation.rsvp_code_required') };
        }

        setRsvpLoading(true);
        setRsvpResult(null);
        try {
            const res = await publicApi.submitRSVP({
                slug: slug!,
                invitation_code: code.trim(),
                status: normalizedStatus,
                number_of_guests: guests,
            });
            let calendarUrl = undefined;
            if (res.success) {
                setRsvpCode('');

                if (normalizedStatus === 'confirmed') {
                    // Generate Google Calendar Link
                    try {
                        const eventTitle = t('invitation.page_title', { bride: tenant.bride_name, groom: tenant.groom_name }).split('|')[0].trim();
                        const startDate = activeContent.wedding_date || tenant.wedding_date;
                        const startTime = activeContent.jam_awal_resepsi || '08:00';
                        const endTime = activeContent.jam_akhir_resepsi;
                        const location = `${activeContent.nama_lokasi_resepsi || ''}, ${activeContent.keterangan_lokasi_resepsi || ''}`.trim();

                        calendarUrl = generateGoogleCalendarUrl({
                            title: eventTitle,
                            startDate: startDate,
                            startTime: startTime,
                            endTime: endTime,
                            location: location,
                            description: `Acara Pernikahan ${tenant.groom_name} & ${tenant.bride_name}. \nLihat Undangan: ${window.location.href}`
                        });

                        // Prepare Modal Data
                        setRsvpModalData({
                            title: eventTitle,
                            date: startDate,
                            time: `${startTime}${endTime ? ` - ${endTime}` : ''}`,
                            location: location || t('invitation.resepsi'),
                            calendarUrl: calendarUrl
                        });
                        setIsRSVPModalOpen(true);
                    } catch (e) {
                        console.error("Failed to generate calendar URL", e);
                    }
                }

                // Update local guest status
                if (data) {
                    setData({
                        ...data,
                        guest: data.guest
                            ? { ...data.guest, status: normalizedStatus, number_of_guests: guests }
                            : res.data
                    });
                }
            }

            const result = { success: res.success, message: res.message, calendarUrl };
            setRsvpResult(result);
            if (res.success) {
                toast.success(res.message || t('invitation.rsvp_success_toast'), { duration: 4000 });
            } else {
                toast.error(res.message || t('invitation.rsvp_failed'), { duration: 4000 });
            }
            return result;
        } catch {
            const errorResult = { success: false, message: t('invitation.system_error') };
            setRsvpResult(errorResult);
            toast.error(t('invitation.system_error'), { duration: 4000 });
            return errorResult;
        } finally {
            setRsvpLoading(false);
        }
    };

    const handleWish = async (e?: React.FormEvent, manualData?: { name: string; message: string }) => {
        if (e) e.preventDefault();

        const name = manualData?.name || wishName;
        const message = manualData?.message || wishMessage;

        if (!name.trim() || !message.trim()) {
            toast.error(t('invitation.wish_required'), { duration: 4000 });
            return { success: false, message: t('invitation.wish_required') };
        }

        setWishLoading(true);
        try {
            const res = await publicApi.submitWish({
                slug: slug!,
                guest_name: name.trim(),
                message: message.trim(),
                invitation_code: data?.guest?.invitation_code,
            });
            if (res.success && res.data) {
                const newWish = res.data;
                setWishes((prev) => [newWish, ...prev]);
                setWishName('');
                setWishMessage('');
                if (data && data.guest) {
                    setData({
                        ...data,
                        guest: { ...data.guest, flag_sudah_isi_ucapan: true }
                    });
                }
                toast.success(t('invitation.wish_success'), { duration: 4000 });
                return { success: true, message: t('invitation.wish_success'), data: newWish };
            }
            const failMsg = res.message || t('invitation.wish_failed');
            toast.error(failMsg, { duration: 4000 });
            return { success: false, message: failMsg };
        } catch {
            toast.error(t('invitation.system_error'), { duration: 4000 });
            return { success: false, message: t('invitation.system_error') };
        } finally {
            setWishLoading(false);
        }
    };

    const handleGift = async (manualData?: { name: string; amount: number; bank: string }) => {
        const name = manualData?.name || '';
        const amount = manualData?.amount || 0;
        const bank = manualData?.bank || '';

        if (!name.trim() || !bank.trim() || amount <= 0) return { success: false, message: t('invitation.gift_invalid') };

        try {
            const res = await publicApi.submitGift({
                slug: slug!,
                guest_name: name.trim(),
                amount,
                bank_name: bank.trim(),
                invitation_code: data?.guest?.invitation_code,
            });
            if (res.success) {
                if (data && data.guest) {
                    setData({
                        ...data,
                        guest: { ...data.guest, flag_sudah_kirim_hadiah: true }
                    });
                }
                return { success: true, message: t('invitation.gift_success') };
            }
            return { success: false, message: res.message || t('invitation.gift_failed') };
        } catch {
            return { success: false, message: t('invitation.system_error') };
        }
    };

    const openLightbox = (index: number, images: string[]) => {
        setLightboxImages(images);
        setCurrentLightboxIndex(index);
        setIsLightboxOpen(true);
    };

    const nextLightbox = () => {
        setCurrentLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
    };

    const prevLightbox = () => {
        setCurrentLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
    };

    // --- Lightbox swipe / drag gesture (left = next, right = prev) ---
    const lbDragStart = useRef<{ x: number; y: number } | null>(null);
    const LB_SWIPE_THRESHOLD = 50;

    const lbStart = (x: number, y: number) => { lbDragStart.current = { x, y }; };
    const lbEnd = (x: number, y: number) => {
        const start = lbDragStart.current;
        lbDragStart.current = null;
        if (!start || lightboxImages.length <= 1) return;
        const dx = x - start.x;
        const dy = y - start.y;
        if (Math.abs(dx) > LB_SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) nextLightbox();
            else prevLightbox();
        }
    };

    // --- Auto-fill RSVP/wish form when a valid guest is resolved from the params ---
    useEffect(() => {
        const guest = data?.guest;

        // Name/code can come from a resolved guest (?guestid=...) OR from a guest
        // who just registered themselves via the "Isi Data Kehadiran" dialog
        // (generatedUninvitedQR = "NEW_GUEST:<name>:<category>").
        let guestName = guest?.name || '';
        let guestCode = guest?.invitation_code || '';

        if (!guestName && generatedUninvitedQR?.startsWith('NEW_GUEST:')) {
            const parts = generatedUninvitedQR.split(':');
            guestName = (parts[1] || '').trim();
        }

        if (!guestName) return;

        const fill = () => {
            // invitation code fields used by themes / wrapper
            const codeEls = document.querySelectorAll<HTMLInputElement>('#rsvp-code, #guest-code, [name="rsvp-code"]');
            codeEls.forEach((el) => {
                if (el && !el.value) el.value = guestCode;
            });

            // guest name fields used by themes (RSVP form + wishes form)
            const nameEls = document.querySelectorAll<HTMLInputElement>('#guest-name-input, #rsvp-name, #wish-name, [name="guest-name-input"], [name="wish-name"]');
            nameEls.forEach((el) => {
                if (el && !el.value) el.value = guestName;
            });

            // default number of guests = 1
            const guestsEls = document.querySelectorAll<HTMLSelectElement | HTMLInputElement>('#rsvp-guests, [name="rsvp-guests"]');
            guestsEls.forEach((el) => {
                if (el && (!el.value || el.value === '')) {
                    el.value = '1';
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            // re-validate any "enable submit when filled" listeners themes may use
            codeEls.forEach((el) => el.dispatchEvent(new Event('input', { bubbles: true })));
            nameEls.forEach((el) => el.dispatchEvent(new Event('input', { bubbles: true })));
        };

        // Run now and again shortly after, since the theme HTML/JS may render slightly later
        fill();
        const t1 = setTimeout(fill, 400);
        const t2 = setTimeout(fill, 1200);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [data?.guest, isOpened, generatedUninvitedQR]);

    const scrollToSection = (index: number) => {
        if (index < 0 || index >= sections.length) return;
        const targetId = sections[index].id;
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(i18n.language === 'id' ? 'id-ID' : 'en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    const timeAgo = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const diff = Date.now() - date.getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 1) return t('invitation.time.just_now');
            if (mins < 60) return t('invitation.time.minutes_ago', { count: mins });
            const hours = Math.floor(mins / 60);
            if (hours < 24) return t('invitation.time.hours_ago', { count: hours });
            const days = Math.floor(hours / 24);
            if (days <= 3) return t('invitation.time.days_ago', { count: days });

            return date.toLocaleDateString(i18n.language === 'id' ? 'id-ID' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return '';
        }
    };

    const getBool = (val: any) => {
        if (typeof val === 'boolean') return val;
        return val === 'true' || val === '1';
    };

    // Helper to get the cdn_url of a specific image type from tenant images
    const getImageUrl = (imageType: string): string => {
        const img = data?.images?.find(i => i.image_type === imageType);
        return img?.cdn_url || '';
    };



    const guestQrModal = data?.guest ? (
        <Modal
            isOpen={showQRModal}
            onClose={() => setShowQRModal(false)}
            title={t('invitation.qr_modal_title')}
            size="sm"
        >
            <div className="flex flex-col items-center gap-4 py-4 w-full text-center">
                <div className="p-4 bg-white rounded-2xl shadow-lg inline-block">
                    <QRCodeSVG
                        value={data.guest.invitation_code}
                        size={200}
                        fgColor="#1A1A2E"
                        bgColor="#FFFFFF"
                        level="M"
                    />
                </div>
                <div>
                    <p className="font-semibold text-gray-800 dark:text-white text-lg">{data.guest.name}</p>
                    <p className="text-gold-600 font-mono text-sm mt-1">{data.guest.invitation_code}</p>
                </div>
                <p className="text-sm text-gray-500 mt-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                    {t('invitation.qr_modal_desc')}
                </p>
            </div>
        </Modal>
    ) : null;

    const uninvitedGuestFormModal = (
        <Modal
            isOpen={showGuestForm}
            onClose={() => setShowGuestForm(false)}
            title={generatedUninvitedQR ? t('invitation.qr_modal_title') : t('invitation.uninvited_form_title')}
        >
            {!generatedUninvitedQR ? (
                <div className="py-4 space-y-4">
                    <p className="text-sm text-gray-500 mb-4">
                        {t('invitation.uninvited_form_desc')}
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('invitation.full_name')}
                        </label>
                        <input
                            type="text"
                            value={tempGuestData.name}
                            onChange={(e) => setTempGuestData({ ...tempGuestData, name: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                            placeholder={t('invitation.full_name_placeholder')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('invitation.guest_category')}
                        </label>
                        <select
                            value={tempGuestData.category}
                            onChange={(e) => setTempGuestData({ ...tempGuestData, category: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        >
                            <option value="Keluarga Laki-laki">{t('invitation.guest_categories.groom_family')}</option>
                            <option value="Keluarga Perempuan">{t('invitation.guest_categories.bride_family')}</option>
                            <option value="Teman/Rekan Kerja">{t('invitation.guest_categories.work_friends')}</option>
                            <option value="Tamu Undangan">{t('invitation.guest_categories.general_guest')}</option>
                            <option value="VIP">{t('invitation.guest_categories.vip')}</option>
                        </select>
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button
                            onClick={async () => {
                                if (tempGuestData.name.trim() === '') return;
                                setIsCheckingGuest(true);
                                try {
                                    const res = await publicApi.checkGuest({
                                        slug: tenant.domain_slug,
                                        name: tempGuestData.name.trim()
                                    });

                                    if (!res.success) {
                                        toast.error(res.message || 'Gagal mengecek nama tamu. Pastikan backend sudah di-deploy.', { duration: 4000 });
                                        return;
                                    }

                                    if (res.data?.exists) {
                                        toast.error(t('invitation.guest_exists_error', { name: tempGuestData.name.trim() }), { duration: 5000 });
                                    } else {
                                        setGeneratedUninvitedQR(`NEW_GUEST:${tempGuestData.name.trim()}:${tempGuestData.category}`);
                                    }
                                } catch (error) {
                                    toast.error('Gagal mengecek nama tamu.');
                                } finally {
                                    setIsCheckingGuest(false);
                                }
                            }}
                            disabled={!tempGuestData.name.trim() || isCheckingGuest}
                            className="px-6 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition-colors font-medium cursor-pointer disabled:opacity-50 flex items-center gap-2"
                        >
                            {isCheckingGuest ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {t('invitation.checking')}
                                </>
                            ) : (
                                t('invitation.generate_qr')
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4 py-4 w-full text-center">
                    <div className="p-4 bg-white rounded-2xl shadow-lg inline-block">
                        <QRCodeSVG
                            value={generatedUninvitedQR}
                            size={200}
                            fgColor="#1A1A2E"
                            bgColor="#FFFFFF"
                            level="M"
                        />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-white text-lg">{tempGuestData.name}</p>
                        <p className="text-gold-600 text-sm mt-1">{tempGuestData.category}</p>
                    </div>

                    <button
                        onClick={() => setGeneratedUninvitedQR(null)}
                        className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-medium cursor-pointer text-sm w-full md:w-auto mt-2"
                    >
                        {t('invitation.correct_data')}
                    </button>

                    <p className="text-sm text-gray-500 mt-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                        {t('invitation.qr_modal_desc')}
                    </p>
                </div>
            )}
        </Modal>
    );

    // THEME RENDERING - HOOKS MUST BE TOP LEVEL
    const activeTheme = data?.theme;

    // Build replacements dictionary as a context object
    const dataContext: Record<string, any> = useMemo(() => {
        const images = resolvedImages || {};
        return {
            bride_name: activeContent.bride_name || tenant.bride_name || 'Mempelai Wanita',
            groom_name: activeContent.groom_name || tenant.groom_name || 'Mempelai Pria',
            bride_nickname: activeContent.bride_nickname || tenant.bride_nickname || activeContent.bride_name || tenant.bride_name || 'Wanita',
            groom_nickname: activeContent.groom_nickname || tenant.groom_nickname || activeContent.groom_name || tenant.groom_name || 'Pria',
            religion: activeContent.religion || '',
            wedding_date: formatDate(activeContent.wedding_date || tenant.wedding_date),
            // Raw ISO date (YYYY-MM-DD) for themes that need to build a calendar / parse the date
            wedding_date_iso: activeContent.wedding_date || tenant.wedding_date || '',
            tanggal_akad: formatDate(activeContent.tanggal_akad || tenant.wedding_date),
            jam_akad: `${activeContent.jam_awal_akad || ''} - ${activeContent.jam_akhir_akad || 'Selesai'}`,
            nama_lokasi_akad: activeContent.nama_lokasi_akad || '',
            keterangan_lokasi_akad: activeContent.keterangan_lokasi_akad || '',
            akad_map: activeContent.akad_map || '',
            tanggal_resepsi: formatDate(activeContent.wedding_date || tenant.wedding_date),
            jam_resepsi: `${activeContent.jam_awal_resepsi || ''} - ${activeContent.jam_akhir_resepsi || 'Selesai'}`,
            nama_lokasi_resepsi: activeContent.nama_lokasi_resepsi || '',
            keterangan_lokasi_resepsi: activeContent.keterangan_lokasi_resepsi || '',
            resepsi_map: activeContent.resepsi_map || '',
            nama_bapak_laki_laki: activeContent.nama_bapak_laki_laki || '',
            nama_ibu_laki_laki: activeContent.nama_ibu_laki_laki || '',
            nama_bapak_perempuan: activeContent.nama_bapak_perempuan || '',
            nama_ibu_perempuan: activeContent.nama_ibu_perempuan || '',
            // Normalize to a bare username so themes can safely use it in BOTH
            // `@{{ig_laki_laki}}` (display) and `https://instagram.com/{{ig_laki_laki}}`
            // (link) regardless of whether the tenant typed @handle / handle / full URL.
            ig_laki_laki: normalizeInstagramUsername(activeContent.account_media_sosial_laki_laki),
            ig_perempuan: normalizeInstagramUsername(activeContent.account_media_sosial_perempuan),
            guest_name: data?.guest?.name || 'Tamu Undangan',
            nama_tamu: data?.guest?.name || 'Tamu Undangan',
            kode_undangan: data?.guest?.invitation_code || '',
            is_sudah_isi_konfirmasi_kehadiran: data?.guest?.status && data.guest.status !== 'pending',
            is_hadir: data?.guest?.status === 'confirmed' || (data?.guest?.status as any) === 'hadir',
            flag_konfirmasi_kehadiran_dari_tamu: data?.guest?.status === 'confirmed',
            flag_sudah_isi_ucapan: data?.guest?.flag_sudah_isi_ucapan,
            is_sudah_isi_ucapan: getBool(data?.guest?.flag_sudah_isi_ucapan),
            flag_sudah_kirim_hadiah: data?.guest?.flag_sudah_kirim_hadiah,
            is_sudah_kirim_hadiah: getBool(data?.guest?.flag_sudah_kirim_hadiah),
            kalimat_pembuka: activeContent.kalimat_pembuka_undangan || '',
            kalimat_penutup: activeContent.kalimat_penutup_undangan || '',
            // Master Quotes: quote_1..7 + quote_by_1..7, with {{quote}}/{{quote_by}} aliases for legacy themes
            quote: data?.quotes?.quote_1 || activeContent.custom_kalimat_1 || '',
            quote_by: data?.quotes?.quote_by_1 || '',
            quote_1: data?.quotes?.quote_1 || activeContent.custom_kalimat_1 || '',
            quote_2: data?.quotes?.quote_2 || '',
            quote_3: data?.quotes?.quote_3 || '',
            quote_4: data?.quotes?.quote_4 || '',
            quote_5: data?.quotes?.quote_5 || '',
            quote_6: data?.quotes?.quote_6 || '',
            quote_7: data?.quotes?.quote_7 || '',
            quote_by_1: data?.quotes?.quote_by_1 || '',
            quote_by_2: data?.quotes?.quote_by_2 || '',
            quote_by_3: data?.quotes?.quote_by_3 || '',
            quote_by_4: data?.quotes?.quote_by_4 || '',
            quote_by_5: data?.quotes?.quote_by_5 || '',
            quote_by_6: data?.quotes?.quote_by_6 || '',
            quote_by_7: data?.quotes?.quote_by_7 || '',
            custom_kalimat_1: activeContent.custom_kalimat_1 || '',
            custom_kalimat_2: activeContent.custom_kalimat_2 || '',
            custom_kalimat_3: activeContent.custom_kalimat_3 || '',
            custom_kalimat_4: activeContent.custom_kalimat_4 || '',
            bank_1: activeContent.nama_bank_1 || '',
            rek_1: activeContent.nomor_rekening_bank_1 || '',
            nama_rek_1: activeContent.nama_rekening_bank_1 || '',
            bank_2: activeContent.nama_bank_2 || '',
            rek_2: activeContent.nomor_rekening_bank_2 || '',
            nama_rek_2: activeContent.nama_rekening_bank_2 || '',
            flag_pakai_2_rekening: getBool(activeContent.flag_pakai_2_rekening),
            flag_pakai_qris_rekening_1: getBool(activeContent.flag_pakai_qris_rekening_1),
            gambar_qris_rekening_1: images['qris_1'] || activeContent.gambar_qris_rekening_1 || '',
            flag_pakai_qris_rekening_2: getBool(activeContent.flag_pakai_qris_rekening_2),
            gambar_qris_rekening_2: images['qris_2'] || activeContent.gambar_qris_rekening_2 || '',
            flag_pakai_timeline_kisah: getBool(activeContent.flag_pakai_timeline_kisah),
            timeline_kisah: timeline,
            tampilkan_amplop_online: getBool(activeContent.tampilkan_amplop_online),
            flag_kirim_hadiah_offline: getBool(activeContent.flag_kirim_hadiah_offline),
            nama_lokasi_kirim_hadiah_offline: activeContent.nama_lokasi_kirim_hadiah_offline || '',
            alamat_lokasi_kirim_hadiah_offline: activeContent.alamat_lokasi_kirim_hadiah_offline || '',
            map_kirim_hadiah_offline: activeContent.map_kirim_hadiah_offline || '',
            flag_lokasi_akad_dan_resepsi_berbeda: getBool(activeContent.flag_lokasi_akad_dan_resepsi_berbeda),
            flag_tampilkan_nama_orang_tua: getBool(activeContent.flag_tampilkan_nama_orang_tua),
            flag_tampilkan_sosial_media_mempelai: getBool(activeContent.flag_tampilkan_sosial_media_mempelai),
            is_link_umum_and_not_for_spesific_guest: !data?.guest,

            // Instagram Story Reply Feature (ADD_FTR_STORY_IG)
            flag_pakai_additional_feature_story_balasan_instagram: getBool(activeContent.flag_pakai_additional_feature_story_balasan_instagram),
            frame_balasan_instagram: images['frame_balasan_instagram'] ||
                (getImageUrl('frame_balasan_instagram') ? resolveProxyUrl(getImageUrl('frame_balasan_instagram')) : null) ||
                (isValidImageUrl(activeContent.frame_balasan_instagram) ? resolveProxyUrl(activeContent.frame_balasan_instagram!) : null) ||
                defaultFrame,
            link_balasan_instagram: activeContent.link_balasan_instagram || '',
            sample_story_1: sampleStory1,
            sample_story_2: sampleStory2,
            sample_story_3: sampleStory3,

            // Advanced features 
            has_gallery: (((activeContent.galleries?.length ?? 0) > 0) || (data?.images?.filter(img => img.image_type === 'gallery').length ?? 0) > 0),
            is_fitur_gallery: (((activeContent.galleries?.length ?? 0) > 0) || (data?.images?.filter(img => img.image_type === 'gallery').length ?? 0) > 0),
            has_story: getBool(activeContent.is_fitur_cerita),
            is_fitur_cerita: getBool(activeContent.is_fitur_cerita),
            live_streaming: getBool(activeContent.flag_pakai_live_streaming) ? {
                url: activeContent.link_live_streaming || '',
                platform: activeContent.platform_live_streaming || ''
            } : null,
            is_fitur_live_streaming: getBool(activeContent.flag_pakai_live_streaming),
            link_backsound_music: activeContent.link_backsound_music || '',
            link_live_streaming: activeContent.link_live_streaming || '',
            platform_live_streaming: activeContent.platform_live_streaming || '',
            flag_sudah_kirim_undangan_via_whatsapp: false,

            // Site details
            site_name: websiteConfig?.site_name || 'Kundangan',
            site_url: websiteConfig?.site_url || window.location.origin,
            tagline: websiteConfig?.tagline || '',
            site_description: websiteConfig?.site_description || '',

            // Social media configurations from WebsiteConfig
            flag_use_tiktok_webconfig: !!(websiteConfig?.site_tiktok || activeContent?.url_tiktok_webconfig || activeContent?.flag_use_tiktok_webconfig),
            flag_use_youtube_webconfig: !!(websiteConfig?.site_youtube || activeContent?.url_youtube_webconfig || activeContent?.flag_use_youtube_webconfig),
            flag_use_instagram_webconfig: !!(websiteConfig?.site_instagram || activeContent?.url_instagram_webconfig || activeContent?.flag_use_instagram_webconfig),
            flag_use_whatsapp_webconfig: !!(websiteConfig?.contact_whatsapp || activeContent?.url_whatsapp_webconfig || activeContent?.flag_use_whatsapp_webconfig),
            url_tiktok_webconfig: websiteConfig?.site_tiktok || activeContent?.url_tiktok_webconfig || '',
            url_youtube_webconfig: websiteConfig?.site_youtube || activeContent?.url_youtube_webconfig || '',
            url_instagram_webconfig: websiteConfig?.site_instagram || activeContent?.url_instagram_webconfig || '',
            url_whatsapp_webconfig: buildWaMeUrl(websiteConfig?.contact_whatsapp) || activeContent?.url_whatsapp_webconfig || '',
            galleries: ((activeContent.galleries?.length ?? 0) > 0) ? activeContent.galleries : (data?.images || [])
                .filter(img => img.image_type === 'gallery')
                .map(img => ({ url: images[img.cdn_url] || img.cdn_url || '' })),
            love_stories: activeContent.love_stories || [],

            // Wishes variables
            wishes: (wishes || []).map(w => ({
                ...w,
                guest_message: w.message, // Support both names
                guest_comment_time: timeAgo(w.created_at || new Date().toISOString()),
                guest_initial: w.guest_name ? w.guest_name.charAt(0).toUpperCase() : '?'
            })),
            has_wishes: wishes && wishes.length > 0,
            empty_wishes: !wishes || wishes.length === 0,

            // === Variabel Foto Standar ===
            photo_hero_cover: images['hero_cover'] || getImageUrl('hero_cover'),
            photo_groom_photo: images['groom_photo'] || getImageUrl('groom_photo'),
            photo_bride_photo: images['bride_photo'] || getImageUrl('bride_photo'),
            photo_background: images['background'] || getImageUrl('background') || images['cover'] || getImageUrl('cover'),
            photo_closing: images['closing'] || getImageUrl('closing'),
            photo_story_photo: images['story_photo'] || getImageUrl('story_photo'),
            photo_gallery: ((activeContent.galleries?.length ?? 0) > 0) ? activeContent.galleries : (data?.images || [])
                .filter(img => img.image_type === 'gallery')
                .map(img => ({ url: images[img.cdn_url] || img.cdn_url || '' })),

            // Dynamic theme image variables - inject resolved base64 or CDN URLs
            ...images,

            // Static theme asset media variables ({{asset_image_1}}, {{asset_video_1}}, ...)
            // Images resolve to the pre-fetched base64 (so they render in <img>);
            // videos/YouTube stay as their raw URL for <video>/<iframe>.
            ...((activeTheme?.asset_media_list || []).reduce((acc: Record<string, string>, a) => {
                if (a && a.media_code) {
                    acc[`asset_${a.media_code}`] = a.media_type === 'image'
                        ? (images[a.media_cdn_url] || a.media_cdn_url)
                        : a.media_cdn_url;
                }
                return acc;
            }, {}))
        };
    }, [tenant, activeContent, data, timeline, wishes, resolvedImages, websiteConfig, activeTheme]);

    // Memoize the rendered HTML to prevent re-parsing and re-injecting DOM nodes
    // every second when the countdown state updates.
    const finalHtml = useMemo(() => {
        if (!activeTheme?.html_template) return '';

        // Static/Initial Countdown Values for the first render
        // These will be updated live by ThemeWrapper's system script
        const diff = Math.max(0, new Date(tenant.wedding_date).getTime() - Date.now());
        const staticCountdown = {
            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
            hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((diff % (1000 * 60)) / 1000)
        };

        const themedDataContext = {
            ...dataContext,
            countdown_hari: `<span id="tm-countdown-days">${String(staticCountdown.days).padStart(2, '0')}</span>`,
            countdown_jam: `<span id="tm-countdown-hours">${String(staticCountdown.hours).padStart(2, '0')}</span>`,
            countdown_menit: `<span id="tm-countdown-minutes">${String(staticCountdown.minutes).padStart(2, '0')}</span>`,
            countdown_detik: `<span id="tm-countdown-seconds">${String(staticCountdown.seconds).padStart(2, '0')}</span>`,
        };

        return parseTemplate(activeTheme.html_template, themedDataContext);
    }, [activeTheme?.html_template, tenant.wedding_date, dataContext]);

    // LOADING - Moved after hooks
    // Guard against the not-found case: when the fetch fails, `data` stays null
    // so the image-resolve effect early-returns and `resolvedImages` is never
    // set. Without checking `error`/`!data` here, the old `!resolvedImages`
    // condition stayed true forever and the loader spun endlessly instead of
    // falling through to the error screen below.
    if (!error && (loading || (!previewData && !data) || (!previewData && !resolvedImages))) {
        return (
            <div className="inv-page inv-loading" style={{
                background: '#1A1A2E',
                color: '#FFFFFF',
                height: '100vh',
                width: '100vw',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
                <div className="loader-container" style={{
                    position: 'relative',
                    width: '120px',
                    height: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '2rem'
                }}>
                    {/* Pulsing Outer Rings */}
                    <div style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        border: '2px solid rgba(184, 149, 100, 0.2)',
                        animation: 'spin 4s linear infinite'
                    }} />
                    <div style={{
                        position: 'absolute',
                        width: '80%',
                        height: '80%',
                        borderRadius: '50%',
                        border: '2px dashed rgba(184, 149, 100, 0.4)',
                        animation: 'spin-reverse 6s linear infinite'
                    }} />
                    {/* Glowing Heart/Envelope Core */}
                    <div style={{
                        fontSize: '2.5rem',
                        animation: 'heartbeat 1.5s ease-in-out infinite',
                        zIndex: 2
                    }}>
                        💌
                    </div>
                </div>

                <div style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.75rem', color: '#b89564', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    Mohon Menunggu
                </div>

                <div style={{ height: '24px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <p key={loadingStep} className="loading-message-text" style={{
                        margin: 0,
                        fontSize: '0.9rem',
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontStyle: 'italic',
                        animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                    }}>
                        {loadingMessages[loadingStep]}
                    </p>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    @keyframes spin-reverse {
                        0% { transform: rotate(360deg); }
                        100% { transform: rotate(0deg); }
                    }
                    @keyframes heartbeat {
                        0% { transform: scale(1); }
                        14% { transform: scale(1.12); }
                        28% { transform: scale(1); }
                        42% { transform: scale(1.12); }
                        70% { transform: scale(1); }
                    }
                    @keyframes fadeInUp {
                        0% { opacity: 0; transform: translateY(8px); filter: blur(2px); }
                        100% { opacity: 1; transform: translateY(0); filter: blur(0); }
                    }
                `}} />
            </div>
        );
    }

    // ERROR - Moved after hooks
    if (error || (!data && !previewData)) {
        return (
            <div className="inv-page inv-error">
                <div className="inv-error-icon">💌</div>
                <h2>Undangan Tidak Ditemukan</h2>
                <p>{error || 'Link undangan tidak valid.'}</p>
            </div>
        );
    }

    const showUnpaidOverlay = !previewData && tenant.status_payment === 'Menunggu pembayaran';

    const unpaidOverlay = showUnpaidOverlay ? (
        <div
            style={{
                position: 'fixed',
                bottom: '1.5rem',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 99999,
                width: 'calc(100% - 2rem)',
                maxWidth: '420px',
                pointerEvents: 'none'
            }}
        >
            <div
                style={{
                    pointerEvents: 'auto',
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(220, 38, 38, 0.4)',
                    borderRadius: '1.25rem',
                    padding: '1rem 1.25rem',
                    color: '#ffffff',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
            >
                <div style={{
                    fontSize: '1.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '3.25rem',
                    height: '3.25rem',
                    background: 'rgba(220, 38, 38, 0.2)',
                    border: '1px solid rgba(220, 38, 38, 0.5)',
                    borderRadius: '50%',
                    flexShrink: 0,
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}>
                    💳
                </div>
                <div style={{ textAlign: 'left', flexGrow: 1 }}>
                    <p style={{ margin: 0, fontWeight: '700', fontSize: '0.925rem', color: '#fca5a5', letterSpacing: '0.025em' }}>
                        Undangan Menunggu Pembayaran
                    </p>
                    <p style={{ margin: '0.25rem 0 0 0', opacity: 0.85, fontSize: '0.75rem', lineHeight: '1.4', color: '#e2e8f0' }}>
                        Silakan selesaikan pembayaran tagihan di Dashboard Admin Anda untuk mengaktifkan seluruh fitur undangan ini.
                    </p>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: .7; transform: scale(1.05); }
                }
            `}} />
        </div>
    ) : null;

    if (activeTheme?.html_template) {
        return (
            <>
                <ThemeWrapper
                    htmlBase={finalHtml}
                    cssBase={activeTheme.css_template}
                    jsBase={activeTheme.js_template}
                    isPlaying={isPlaying}
                    isOpened={isOpened}
                    setIsPlaying={setIsPlaying}
                    setIsOpened={setIsOpened}
                    weddingDate={tenant.wedding_date}
                    flagUseSystemActionButton={activeTheme?.flag_use_system_action_button !== false && activeTheme?.flag_use_system_action_button !== 'false'}
                    onShowQR={() => {
                        if (data?.guest) setShowQRModal(true);
                        else setShowGuestForm(true);
                    }}
                    onShowMenu={() => setShowMenuModal(true)}
                    onSubmitRSVP={(data) => handleRSVP(undefined, data)}
                    onSubmitWish={(data) => handleWish(undefined, data)}
                    onSubmitGift={(data) => handleGift(data)}
                    onOpenLightbox={openLightbox}
                >
                    {guestQrModal}
                    {uninvitedGuestFormModal}
                    {youtubeId && isOpened && (
                        <iframe
                            ref={ytIframeRef}
                            width="0"
                            height="0"
                            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&loop=1&playlist=${youtubeId}&enablejsapi=1`}
                            title="YouTube Background Music"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            className="hidden"
                        />
                    )}
                    {/* Full Screen Navigation Menu Modal */}
                    {showMenuModal && (
                        <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4">
                            {/* Backdrop */}
                            <div
                                className="absolute inset-0 bg-black/85 backdrop-blur-xl animate-fade-in"
                                onClick={() => setShowMenuModal(false)}
                            />

                            {/* Content */}
                            <div className="relative w-full max-w-lg bg-transparent text-center animate-scale-in">
                                <button
                                    onClick={() => setShowMenuModal(false)}
                                    className="absolute -top-16 right-0 text-white/70 hover:text-white transition-colors"
                                >
                                    <HiOutlineX className="w-8 h-8" />
                                </button>

                                <h2 className="text-gold-400 font-serif text-3xl mb-12 tracking-widest uppercase">Menu Navigasi</h2>

                                <div className="flex flex-col gap-6">
                                    {/* Link to Top/Sampul */}
                                    <button
                                        onClick={() => {
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                            // Fallbacks for themes that use fixed containers
                                            const cw1 = document.getElementById('main-content');
                                            if (cw1) cw1.scrollTo({ top: 0, behavior: 'smooth' });
                                            const cw2 = document.getElementById('content-body');
                                            if (cw2) cw2.scrollTo({ top: 0, behavior: 'smooth' });

                                            setShowMenuModal(false);
                                        }}
                                        className="text-2xl font-serif text-white/90 hover:text-gold-400 transition-all hover:tracking-widest py-2"
                                    >
                                        Sampul
                                    </button>

                                    {sections.slice(1).map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => {
                                                const el = document.getElementById(s.id);
                                                if (el) {
                                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                }
                                                setShowMenuModal(false);
                                            }}
                                            className="text-2xl font-serif text-white/90 hover:text-gold-400 transition-all hover:tracking-widest py-2"
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-16 text-gold-500/50 font-serif italic">
                                    {tenant.groom_name} & {tenant.bride_name}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Universal Lightbox Component */}
                    {isLightboxOpen && (
                        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fade-in select-none">
                            {/* Close Button */}
                            <button
                                onClick={() => setIsLightboxOpen(false)}
                                className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-[2002]"
                            >
                                <HiX className="w-8 h-8 md:w-10 md:h-10" />
                            </button>

                            {/* Images Counter */}
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 text-white/50 text-sm font-light tracking-widest z-[2002]">
                                {currentLightboxIndex + 1} / {lightboxImages.length}
                            </div>

                            {/* Navigation - Left */}
                            <button
                                onClick={prevLightbox}
                                className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 p-2 md:p-4 text-white/30 hover:text-white hover:bg-white/10 rounded-full transition-all z-[2002]"
                            >
                                <HiChevronLeft className="w-8 h-8 md:w-12 md:h-12" />
                            </button>

                            {/* Navigation - Right */}
                            <button
                                onClick={nextLightbox}
                                className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 p-2 md:p-4 text-white/30 hover:text-white hover:bg-white/10 rounded-full transition-all z-[2002]"
                            >
                                <HiChevronRight className="w-8 h-8 md:w-12 md:h-12" />
                            </button>

                            {/* Main Image Container */}
                            <div
                                className="w-full h-full flex items-center justify-center p-4 md:p-12"
                                onClick={() => setIsLightboxOpen(false)}
                                onTouchStart={(e) => lbStart(e.touches[0].clientX, e.touches[0].clientY)}
                                onTouchEnd={(e) => lbEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY)}
                            >
                                <img
                                    src={lightboxImages[currentLightboxIndex]}
                                    alt="Lightbox"
                                    className="max-w-full max-h-full object-contain animate-scale-in select-none"
                                    draggable={false}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => { e.stopPropagation(); lbStart(e.clientX, e.clientY); }}
                                    onMouseUp={(e) => { e.stopPropagation(); lbEnd(e.clientX, e.clientY); }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Universal Scroll Up Button */}
                    {activeTheme?.flag_use_system_action_button !== false && activeTheme?.flag_use_system_action_button !== 'false' && isOpened && activeSectionIndex >= 1 && (
                        <button
                            id="btn-scroll-to-top"
                            onClick={() => {
                                const targetIndex = Math.max(0, activeSectionIndex - 1);
                                const targetId = sections[targetIndex]?.id;
                                if (targetId) {
                                    const el = document.getElementById(targetId);
                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                } else {
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                            }}
                            className="fixed right-6 bottom-24 z-[900] w-12 h-12 flex items-center justify-center bg-[#b89564]/90 hover:bg-[#a68453] text-white rounded-full shadow-lg shadow-[#b89564]/20 backdrop-blur-sm transition-all animate-fade-in hover:scale-105 border border-white/20"
                            title="Scroll ke Atas"
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    )}

                    {/* RSVP Success Modal (Theme Agnostic) */}
                    <RSVPSuccessModal
                        isOpen={isRSVPModalOpen}
                        onClose={() => setIsRSVPModalOpen(false)}
                        data={rsvpModalData}
                    />
                </ThemeWrapper>
                {unpaidOverlay}
            </>
        );
    }

    // COVER (before opened) FOR DEFAULT THEME
    if (!isOpened) {
        return (
            <>
                <div className="inv-page inv-cover">
                    <div className="inv-cover-overlay" />
                    <div className="inv-cover-content">
                        {getBool(activeContent.flag_pakai_kalimat_pembuka_custom) && activeContent.kalimat_pembuka_undangan && (
                            <p className="inv-cover-opening text-sm italic font-serif text-white/90 mb-6 max-w-sm mx-auto text-center leading-relaxed">
                                {activeContent.kalimat_pembuka_undangan}
                            </p>
                        )}

                        <p className="inv-cover-label">The Wedding Of</p>
                        <h1 className="inv-cover-names">
                            {tenant.groom_name} <span>&</span> {tenant.bride_name}
                        </h1>
                        <p className="inv-cover-date">{formatDate(tenant.wedding_date)}</p>

                        {data?.guest && (
                            <div className="mb-6 p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg text-center max-w-sm mx-auto">
                                <p className="text-white/80 text-xs mb-1 font-serif italic">Kepada Yth. Bapak/Ibu/Saudara/i</p>
                                <p className="text-white font-bold text-lg">{data.guest.name}</p>
                            </div>
                        )}

                        <div className="mt-6 flex flex-col md:flex-row items-center justify-center gap-4">
                            <button className="inv-cover-btn" onClick={() => { setIsOpened(true); setIsPlaying(true); }}>
                                <span>💌</span> Buka Undangan
                            </button>

                            <button
                                onClick={() => {
                                    if (data?.guest) {
                                        setShowQRModal(true);
                                    } else {
                                        setShowGuestForm(true);
                                    }
                                }}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-md border border-white/40 transition-all font-medium shadow-xl hover:scale-105 active:scale-95 ring-4 ring-white/10"
                            >
                                <HiOutlineQrcode className="w-5 h-5" />
                                Tampilkan QR
                            </button>
                        </div>
                    </div>
                    <div className="inv-cover-ornament inv-cover-ornament-top" />
                    <div className="inv-cover-ornament inv-cover-ornament-bottom" />
                </div>
                {guestQrModal}
                {uninvitedGuestFormModal}
                {unpaidOverlay}
            </>
        );
    }

    // MAIN DEFAULT INVITATION
    return (
        <div className="inv-page inv-main">

            {/* HERO */}
            <section className="inv-section inv-hero" ref={(el) => { sectionsRef.current[0] = el; }}>
                <div className="inv-hero-bg" />
                <div className="inv-hero-content inv-animate">
                    <p className="inv-hero-bismillah">
                        <span dir="rtl">{getBool(activeContent.flag_pakai_kalimat_pembuka_custom) ? activeContent.kalimat_pembuka_undangan : 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ'}</span>
                    </p>
                    <p className="inv-hero-label">{activeContent.custom_kalimat_1 || 'We are getting married'}</p>
                    <h1 className="inv-hero-names">
                        {tenant.groom_name} <span className="inv-amp">&</span> {tenant.bride_name}
                    </h1>
                    <div className="inv-hero-date-badge">
                        <span>{formatDate(tenant.wedding_date)}</span>
                    </div>

                    {activeContent.custom_kalimat_2 && (
                        <p className="mt-8 text-sm max-w-md mx-auto italic opacity-90 leading-relaxed font-serif">
                            "{activeContent.custom_kalimat_2}"
                        </p>
                    )}
                </div>
            </section>

            {/* COUPLE */}
            <section className="inv-section inv-couple" ref={(el) => { sectionsRef.current[1] = el; }}>
                <div className="inv-section-inner inv-animate">
                    <p className="inv-section-subtitle">Mempelai</p>
                    <h2 className="inv-section-title">Insya Allah</h2>
                    <div className="inv-couple-grid">
                        <div className="inv-couple-card">
                            <div className="inv-couple-avatar">🤵</div>
                            <h3>{tenant.groom_name}</h3>
                            <p>Mempelai Pria</p>
                            {getBool(activeContent.flag_tampilkan_nama_orang_tua) && (
                                <p className="text-xs text-gray-500 mt-2">
                                    Putra dari Bpk. {activeContent.nama_bapak_laki_laki} & Ibu {activeContent.nama_ibu_laki_laki}
                                </p>
                            )}
                            {getBool(activeContent.flag_tampilkan_sosial_media_mempelai) && activeContent.account_media_sosial_laki_laki && (
                                <a href={`https://instagram.com/${activeContent.account_media_sosial_laki_laki.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-xs text-gold-600 hover:text-gold-700 mt-2 inline-block">
                                    {activeContent.account_media_sosial_laki_laki}
                                </a>
                            )}
                        </div>
                        <div className="inv-couple-divider">
                            <span className="inv-heart">♥</span>
                        </div>
                        <div className="inv-couple-card">
                            <div className="inv-couple-avatar">👰</div>
                            <h3>{tenant.bride_name}</h3>
                            <p>Mempelai Wanita</p>
                            {getBool(activeContent.flag_tampilkan_nama_orang_tua) && (
                                <p className="text-xs text-gray-500 mt-2">
                                    Putri dari Bpk. {activeContent.nama_bapak_perempuan} & Ibu {activeContent.nama_ibu_perempuan}
                                </p>
                            )}
                            {getBool(activeContent.flag_tampilkan_sosial_media_mempelai) && activeContent.account_media_sosial_perempuan && (
                                <a href={`https://instagram.com/${activeContent.account_media_sosial_perempuan.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-xs text-gold-600 hover:text-gold-700 mt-2 inline-block">
                                    {activeContent.account_media_sosial_perempuan}
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* TIMELINE KISAH (If Enabled) */}
            {getBool(activeContent.flag_pakai_timeline_kisah) && timeline.length > 0 && (
                <section className="inv-section inv-story" ref={(el) => { sectionsRef.current[2] = el; }}>
                    <div className="inv-section-inner inv-animate">
                        <p className="inv-section-subtitle">Love Story</p>
                        <h2 className="inv-section-title">Perjalanan Cinta Kami</h2>
                        <div className="max-w-2xl mx-auto mt-8 space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gold-200 before:to-transparent">
                            {timeline.map((item, idx) => (
                                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-gold-400 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 font-bold text-sm">
                                        {idx + 1}
                                    </div>
                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4 rounded-xl shadow-sm bg-white border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                                        <div className="flex flex-col space-y-1 mb-2">
                                            <span className="text-xs font-semibold text-gold-600 uppercase tracking-wider">{item.tanggal}</span>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white font-serif">{item.judul}</h3>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-sans">{item.deskripsi}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* COUNTDOWN */}
            <section className="inv-section inv-countdown-section" ref={(el) => { sectionsRef.current[3] = el; }}>
                <div className="inv-section-inner inv-animate">
                    <p className="inv-section-subtitle">Menuju Hari Bahagia</p>
                    <h2 className="inv-section-title">Hitung Mundur</h2>
                    <div className="inv-countdown-grid">
                        {[
                            { value: countdown.days, label: 'Hari' },
                            { value: countdown.hours, label: 'Jam' },
                            { value: countdown.minutes, label: 'Menit' },
                            { value: countdown.seconds, label: 'Detik' },
                        ].map((item) => (
                            <div key={item.label} className="inv-countdown-item">
                                <span className="inv-countdown-value">{String(item.value).padStart(2, '0')}</span>
                                <span className="inv-countdown-label">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* EVENT DETAILS */}
            <section className="inv-section inv-event" ref={(el) => { sectionsRef.current[4] = el; }}>
                <div className="inv-section-inner inv-animate">
                    <p className="inv-section-subtitle">Detail Acara</p>
                    <h2 className="inv-section-title">Akad & Resepsi</h2>
                    <div className="inv-event-grid">
                        <div className="inv-event-card">
                            <div className="inv-event-icon">🕌</div>
                            <h3>Akad Nikah</h3>
                            <p className="inv-event-date">{activeContent.tanggal_akad ? formatDate(activeContent.tanggal_akad) : formatDate(tenant.wedding_date)}</p>
                            <p className="inv-event-time">
                                {activeContent.jam_awal_akad || '08:00'} - {activeContent.jam_akhir_akad || '10:00'} WIB
                            </p>
                            <p className="inv-event-location font-semibold">{activeContent.nama_lokasi_akad || 'Masjid Al-Ikhlas'}</p>
                            <p className="text-sm text-gray-500 mt-2">{activeContent.keterangan_lokasi_akad}</p>
                            {activeContent.akad_map && (
                                <a href={activeContent.akad_map} target="_blank" rel="noreferrer" className="inline-block mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm rounded-lg transition-colors">
                                    📍 Buka di Google Maps
                                </a>
                            )}
                        </div>
                        {getBool(activeContent.flag_lokasi_akad_dan_resepsi_berbeda) ? (
                            <div className="inv-event-card">
                                <div className="inv-event-icon">🎉</div>
                                <h3>Resepsi</h3>
                                <p className="inv-event-date">{formatDate(tenant.wedding_date)}</p>
                                <p className="inv-event-time">
                                    {activeContent.jam_awal_resepsi || '11:00'} - {activeContent.jam_akhir_resepsi || '14:00'} WIB
                                </p>
                                <p className="inv-event-location font-semibold">{activeContent.nama_lokasi_resepsi || 'Gedung Serbaguna'}</p>
                                <p className="text-sm text-gray-500 mt-2">{activeContent.keterangan_lokasi_resepsi}</p>
                                {activeContent.resepsi_map && (
                                    <a href={activeContent.resepsi_map} target="_blank" rel="noreferrer" className="inline-block mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm rounded-lg transition-colors">
                                        📍 Buka di Google Maps
                                    </a>
                                )}
                            </div>
                        ) : (
                            <div className="inv-event-card">
                                <div className="inv-event-icon">🎉</div>
                                <h3>Resepsi</h3>
                                <p className="inv-event-date">{formatDate(tenant.wedding_date)}</p>
                                <p className="inv-event-time">
                                    {activeContent.jam_awal_resepsi || '11:00'} - {activeContent.jam_akhir_resepsi || '14:00'} WIB
                                </p>
                                <p className="inv-event-location font-semibold">{activeContent.nama_lokasi_akad || 'Lokasi Sama Dengan Akad'}</p>
                                <p className="text-sm text-gray-500 mt-2">{activeContent.keterangan_lokasi_akad}</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* PROTOCOL HEADER (Custom Text 3) */}
            {activeContent.custom_kalimat_3 && (
                <section className="py-12 px-6 text-center max-w-2xl mx-auto font-serif italic text-gray-600 dark:text-gray-400">
                    "{activeContent.custom_kalimat_3}"
                </section>
            )}

            {/* RSVP */}
            <section className="inv-section inv-rsvp" ref={(el) => { sectionsRef.current[5] = el; }}>
                <div className="inv-section-inner inv-animate">
                    <p className="inv-section-subtitle">Konfirmasi Kehadiran</p>
                    <h2 className="inv-section-title">RSVP</h2>
                    <form className="inv-rsvp-form" onSubmit={handleRSVP}>
                        <div className="inv-form-group">
                            <label>Kode Undangan</label>
                            <input
                                type="text"
                                value={rsvpCode}
                                onChange={(e) => setRsvpCode(e.target.value.toUpperCase())}
                                placeholder="Masukkan kode undangan (contoh: WED-XXXXXX)"
                                required
                            />
                        </div>
                        <div className="inv-form-row">
                            <div className="inv-form-group">
                                <label>Konfirmasi</label>
                                <select value={rsvpStatus} onChange={(e) => setRsvpStatus(e.target.value as 'confirmed' | 'declined')}>
                                    <option value="confirmed">✅ Hadir</option>
                                    <option value="declined">❌ Tidak Hadir</option>
                                </select>
                            </div>
                            {rsvpStatus === 'confirmed' && (
                                <div className="inv-form-group">
                                    <label>Jumlah Tamu</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={rsvpGuests}
                                        onChange={(e) => setRsvpGuests(Number(e.target.value) || 1)}
                                    />
                                </div>
                            )}
                        </div>
                        <button type="submit" className="inv-btn" disabled={rsvpLoading}>
                            {rsvpLoading ? 'Mengirim...' : 'Kirim RSVP'}
                        </button>
                        {rsvpResult && (
                            <div className={`inv-alert ${rsvpResult.success ? 'inv-alert-success' : 'inv-alert-error'}`}>
                                {rsvpResult.message}
                            </div>
                        )}
                    </form>
                </div>
            </section>

            {/* WISHES */}
            <section className="inv-section inv-wishes" ref={(el) => { sectionsRef.current[6] = el; }}>
                <div className="inv-section-inner inv-animate">
                    <p className="inv-section-subtitle">Ucapan & Doa</p>
                    <h2 className="inv-section-title">Kirim Ucapan</h2>
                    <form className="inv-wish-form" onSubmit={handleWish}>
                        <div className="inv-form-group">
                            <label>Nama</label>
                            <input
                                type="text"
                                value={wishName}
                                onChange={(e) => setWishName(e.target.value)}
                                placeholder="Nama Anda"
                                required
                            />
                        </div>
                        <div className="inv-form-group">
                            <label>Ucapan & Doa</label>
                            <textarea
                                value={wishMessage}
                                onChange={(e) => setWishMessage(e.target.value)}
                                placeholder="Tulis ucapan dan doa terbaik Anda..."
                                rows={3}
                                required
                            />
                        </div>
                        <button type="submit" className="inv-btn" disabled={wishLoading}>
                            {wishLoading ? 'Mengirim...' : '💌 Kirim Ucapan'}
                        </button>
                    </form>

                    <div className="inv-wish-list">
                        {wishes.length === 0 && (
                            <p className="inv-wish-empty">Jadilah yang pertama mengirim ucapan! 💕</p>
                        )}
                        {wishes.map((w, i) => (
                            <div key={w.id || i} className="inv-wish-card">
                                <div className="inv-wish-header">
                                    <div className="inv-wish-avatar">{w.guest_name.charAt(0).toUpperCase()}</div>
                                    <div>
                                        <h4>{w.guest_name}</h4>
                                        <span className="inv-wish-time">{timeAgo(w.created_at)}</span>
                                    </div>
                                </div>
                                <p>{w.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* GIFT */}
            {activeContent.tampilkan_amplop_online && (
                <section className="inv-section inv-gift" ref={(el) => { sectionsRef.current[7] = el; }}>
                    <div className="inv-section-inner inv-animate">
                        <p className="inv-section-subtitle">Amplop Digital</p>
                        <h2 className="inv-section-title">Wedding Gift</h2>
                        <p className="inv-gift-desc">
                            Doa restu Anda merupakan karunia yang sangat berarti bagi kami.
                            Namun jika Anda ingin memberikan tanda kasih, kami menyediakan amplop digital.
                        </p>
                        <div className="inv-gift-cards">
                            {activeContent.nama_bank_1 && (
                                <div className="inv-gift-card">
                                    <div className="inv-gift-bank">🏦 {activeContent.nama_bank_1}</div>
                                    <div className="inv-gift-number">{activeContent.nomor_rekening_bank_1}</div>
                                    <div className="inv-gift-name">a.n. {activeContent.nama_rekening_bank_1}</div>
                                    <button
                                        type="button"
                                        className="inv-btn-outline"
                                        onClick={() => navigator.clipboard.writeText(activeContent.nomor_rekening_bank_1 || '')}
                                    >
                                        📋 Salin No. Rekening
                                    </button>
                                </div>
                            )}
                            {activeContent.nama_bank_2 && (
                                <div className="inv-gift-card">
                                    <div className="inv-gift-bank">🏦 {activeContent.nama_bank_2}</div>
                                    <div className="inv-gift-number">{activeContent.nomor_rekening_bank_2}</div>
                                    <div className="inv-gift-name">a.n. {activeContent.nama_rekening_bank_2}</div>
                                    <button
                                        type="button"
                                        className="inv-btn-outline"
                                        onClick={() => navigator.clipboard.writeText(activeContent.nomor_rekening_bank_2 || '')}
                                    >
                                        📋 Salin No. Rekening
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* FOOTER */}
            <footer className="inv-footer">
                <div className="inv-footer-ornament" />
                <p className="inv-footer-thanks max-w-lg mx-auto mb-4">{activeContent.flag_pakai_kalimat_penutup_custom ? activeContent.kalimat_penutup_undangan : 'Terima kasih atas kehadiran dan doa restunya'}</p>
                {activeContent.custom_kalimat_4 && (
                    <p className="max-w-md mx-auto mb-6 text-sm italic font-serif">"{activeContent.custom_kalimat_4}"</p>
                )}
                <h2 className="inv-footer-names">
                    {tenant.groom_name} & {tenant.bride_name}
                </h2>
                <p className="inv-footer-powered">Wedding SaaS Platform</p>
            </footer>

            {/* HIDDEN YOUTUBE PLAYER */}
            {youtubeId && isPlaying && (
                <iframe
                    width="0"
                    height="0"
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&loop=1&playlist=${youtubeId}&enablejsapi=1`}
                    title="YouTube Background Music"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    className="hidden"
                />
            )}

            {/* FLOATING MUSIC BUTTON */}
            {activeContent.link_backsound_music && (
                <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="fixed bottom-6 right-6 z-50 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-xl border border-gold-100 text-gold-600 hover:bg-gold-50 transition-all hover:scale-110 active:scale-95 flex items-center justify-center animate-fade-in"
                    aria-label="Toggle Music"
                >
                    {isPlaying ? <HiPause className="w-6 h-6 animate-pulse" /> : <HiPlay className="w-6 h-6" />}
                </button>
            )}

            {/* FLOATING QR BUTTON */}
            {isOpened && (
                <button
                    onClick={() => {
                        if (data?.guest) setShowQRModal(true);
                        else setShowGuestForm(true);
                    }}
                    className="fixed bottom-6 left-6 z-50 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-xl border border-gold-100 text-gold-600 hover:bg-gold-50 transition-all hover:scale-110 active:scale-95 flex items-center justify-center animate-fade-in"
                    aria-label="Tampilkan QR Code Kehadiran"
                >
                    <HiOutlineQrcode className="w-6 h-6" />
                </button>
            )}

            {/* SECTION NAVIGATION (Floating Right) */}
            {isOpened && sections.length > 0 && (
                <div className="fixed right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3 animate-fade-in">
                    {/* Only show up/top if past first section */}
                    {activeSectionIndex >= 1 && (
                        <>
                            <button
                                onClick={() => scrollToSection(0)}
                                className="p-2 bg-gold-600 text-white rounded-full shadow-lg hover:bg-gold-700 transition-all hover:scale-110 active:scale-95"
                                title="Kembali ke Atas"
                            >
                                <HiChevronLeft className="w-5 h-5 rotate-90" />
                            </button>
                            <button
                                onClick={() => scrollToSection(activeSectionIndex - 1)}
                                className="p-2 bg-white/90 backdrop-blur-sm text-gold-600 rounded-full shadow-md border border-gold-100 hover:bg-gold-50 transition-all hover:scale-110 active:scale-95"
                                title="Seksi Sebelumnya"
                            >
                                <HiChevronLeft className="w-5 h-5 rotate-90" />
                            </button>
                        </>
                    )}

                    {activeSectionIndex < sections.length - 1 && (
                        <button
                            onClick={() => scrollToSection(activeSectionIndex + 1)}
                            className="p-2 bg-white/90 backdrop-blur-sm text-gold-600 rounded-full shadow-md border border-gold-100 hover:bg-gold-50 transition-all hover:scale-110 active:scale-95"
                            title="Seksi Selanjutnya"
                        >
                            <HiChevronRight className="w-5 h-5 rotate-90" />
                        </button>
                    )}
                </div>
            )}

            {guestQrModal}

            {/* RSVP Success Modal (Theme Agnostic - Default) */}
            <RSVPSuccessModal
                isOpen={isRSVPModalOpen}
                onClose={() => setIsRSVPModalOpen(false)}
                data={rsvpModalData}
            />
            {unpaidOverlay}
        </div>
    );
}
