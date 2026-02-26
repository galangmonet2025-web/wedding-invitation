import axios from 'axios';
import { useAuthStore } from '@/features/auth/store/authStore';
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
    (config) => {
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
    (error) => Promise.reject(error)
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401 || error.response?.data?.message === 'Token expired') {
            useAuthStore.getState().logout();
            toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default apiClient;
