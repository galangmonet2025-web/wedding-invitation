import apiClient from './apiClient';
import type { ApiResponse, ImageRecord, UploadImageRequest, UploadImageResponse } from '@/types';

export const imageApi = {
    /**
     * Upload compressed image base64 to Google Drive via backend.
     */
    uploadImage: async (payload: UploadImageRequest, config: any = {}): Promise<ApiResponse<UploadImageResponse>> => {
        try {
            const response = await apiClient.post<any, { data: ApiResponse<UploadImageResponse> }>('', {
                action: 'uploadImage',
                ...payload
            }, config);
            return response.data;
        } catch (error: any) {
            console.error('API Error (uploadImage):', error);
            throw new Error(error.response?.data?.message || 'Failed to upload image');
        }
    },

    /**
     * Get all images for the logged-in tenant.
     */
    getTenantImages: async (): Promise<ApiResponse<ImageRecord[]>> => {
        try {
            const response = await apiClient.post<any, { data: ApiResponse<ImageRecord[]> }>('', {
                action: 'getTenantImages'
            });
            return response.data;
        } catch (error: any) {
            console.error('API Error (getTenantImages):', error);
            throw new Error(error.response?.data?.message || 'Failed to retrieve tenant images');
        }
    },

    /**
     * Delete an image from Google Drive and the Images sheet.
     */
    deleteImage: async (imageId: string): Promise<ApiResponse<null>> => {
        try {
            const response = await apiClient.post<any, { data: ApiResponse<null> }>('', {
                action: 'deleteImage',
                id: imageId
            });
            return response.data;
        } catch (error: any) {
            console.error('API Error (deleteImage):', error);
            throw new Error(error.response?.data?.message || 'Failed to delete image');
        }
    }
};
