// =============================================
// Midtrans Snap Utility
// =============================================

// Declare global snap object injected by Midtrans script
declare global {
    interface Window {
        snap?: {
            pay: (
                snapToken: string,
                options: {
                    onSuccess?: (result: any) => void;
                    onPending?: (result: any) => void;
                    onError?: (result: any) => void;
                    onClose?: () => void;
                }
            ) => void;
        };
    }
}

export interface SnapPaymentResult {
    order_id: string;
    payment_type?: string;
    transaction_status: string;
    [key: string]: any;
}

/**
 * Opens Midtrans Snap popup and returns a promise with the result.
 */
export function openSnapPayment(snapToken: string): Promise<{
    status: 'success' | 'pending' | 'error' | 'closed';
    result?: SnapPaymentResult;
}> {
    return new Promise((resolve) => {
        if (!window.snap) {
            console.error('[Midtrans] Snap script is not loaded. Make sure to add Snap script in index.html.');
            resolve({ status: 'error' });
            return;
        }

        window.snap.pay(snapToken, {
            onSuccess: (result: SnapPaymentResult) => {
                resolve({ status: 'success', result });
            },
            onPending: (result: SnapPaymentResult) => {
                resolve({ status: 'pending', result });
            },
            onError: (result: SnapPaymentResult) => {
                resolve({ status: 'error', result });
            },
            onClose: () => {
                resolve({ status: 'closed' });
            },
        });
    });
}

/**
 * Maps Midtrans transaction_status to a user-friendly label and color.
 */
export function getStatusBadge(status: string, t?: any): { label: string; color: string } {
    const translate = t || ((key: string, fallback: string) => fallback);
    switch (status) {
        case 'settlement':
            return { label: translate('payments.status.settlement', 'Berhasil'), color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
        case 'pending':
            return { label: translate('payments.status.pending', 'Menunggu Pembayaran'), color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
        case 'expire':
            return { label: translate('payments.status.expire', 'Kadaluarsa'), color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
        case 'cancel':
            return { label: translate('payments.status.cancel', 'Dibatalkan'), color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' };
        case 'deny':
            return { label: translate('payments.status.deny', 'Ditolak'), color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' };
        case 'refund':
            return { label: translate('payments.status.refund', 'Refund'), color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' };
        default:
            return { label: status, color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
    }
}
