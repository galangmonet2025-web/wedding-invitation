import { create } from 'zustand';
import { InvitationContent, ImageRecord } from '@/types';

interface PreviewState {
    lastPreviewContent: Partial<InvitationContent> | null;
    lastPreviewImages: ImageRecord[];
    lastPreviewImagesB64: Record<string, string>;
    lastSelectedTenantId: string;

    setPreviewData: (data: {
        content: Partial<InvitationContent>;
        images: ImageRecord[];
        imagesB64: Record<string, string>;
        tenantId: string;
    }) => void;
}

export const usePreviewStore = create<PreviewState>((set) => ({
    lastPreviewContent: null,
    lastPreviewImages: [],
    lastPreviewImagesB64: {},
    lastSelectedTenantId: '',

    setPreviewData: (data) => set({
        lastPreviewContent: data.content,
        lastPreviewImages: data.images,
        lastPreviewImagesB64: data.imagesB64,
        lastSelectedTenantId: data.tenantId
    })
}));
