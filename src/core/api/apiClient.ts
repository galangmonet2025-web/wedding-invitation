import axios from 'axios';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useApiStore } from '@/core/api/apiStore';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'text/plain',
    },
});

// Request interceptor - inject token
apiClient.interceptors.request.use(
    (config: any) => {
        if (!config.skipLoader) {
            useApiStore.getState().incrementLoading();
        }
        const token = useAuthStore.getState().token;
        if (token) {
            // Send token via params (GET) or body (POST)
            // Do NOT set Authorization header — it triggers CORS preflight
            // which Google Apps Script cannot handle
            if (config.method === 'get') {
                config.params = { ...config.params, token };
            } else if (config.data) {
                // For POST, inject token into the JSON body
                const data = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
                config.data = JSON.stringify({ ...data, token });
            }
        }
        return config;
    },
    (error) => {
        if (!error.config?.skipLoader) {
            useApiStore.getState().decrementLoading();
        }
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
    (response: any) => {
        if (!response.config?.skipLoader) {
            useApiStore.getState().decrementLoading();
        }

        // Detect if Google Apps Script returned an HTML page (usually a login redirect due to wrong deployment settings)
        if (typeof response.data === 'string' && response.data.trim().toLowerCase().startsWith('<!doctype html>')) {
            throw new Error('Backend returned an HTML page instead of JSON. Ensure Google Apps Script is deployed as "Execute as: Me" and "Who has access: Anyone".');
        }

        // Detect 401 from GAS (returned as HTTP 200 with code:401 in body)
        if (response.data && typeof response.data === 'object' && response.data.code === 401) {
            // Don't redirect if we are already on the login page (e.g. wrong password)
            const isLoginRequest = typeof response.config?.data === 'string' &&
                response.config.data.includes('"action":"login"');
            if (!isLoginRequest) {
                useAuthStore.getState().logout();
                toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
                window.location.href = '/#/login';
            }
            return Promise.reject(new Error(response.data.message || 'Token expired'));
        }

        // If data is missing success property and it's an object, it might be an invalid response
        if (response.data && typeof response.data === 'object' && !('success' in response.data) && !('data' in response.data)) {
            console.warn('Unexpected API response format', response.data);
        }

        return response;
    },
    (error) => {
        if (!error.config?.skipLoader) {
            useApiStore.getState().decrementLoading();
        }
        if (error.response?.status === 401 || error.response?.data?.message === 'Token expired') {
            const isLoginRequest = typeof error.config?.data === 'string' &&
                error.config.data.includes('"action":"login"');
            if (!isLoginRequest) {
                useAuthStore.getState().logout();
                toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
                window.location.href = '/#/login';
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
