import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { router } from '@/core/router';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { ApiLoader } from '@/shared/components';

function App() {
    return (
        <ErrorBoundary>
            <ApiLoader />
            <RouterProvider router={router} />
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: '#FFF',
                        color: '#1A1A2E',
                        borderRadius: '12px',
                        border: '1px solid #E5E7EB',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        padding: '12px 16px',
                        fontSize: '14px',
                    },
                    success: {
                        iconTheme: {
                            primary: '#C6A769',
                            secondary: '#FFF',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#EF4444',
                            secondary: '#FFF',
                        },
                    },
                }}
            />
        </ErrorBoundary>
    );
}

export default App;
