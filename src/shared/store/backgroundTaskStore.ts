import { create } from 'zustand';

export type TaskStatus = 'running' | 'success' | 'error';

// Status satu langkah/item di dalam sebuah task.
//   pending -> belum diproses (antre)
//   running -> sedang diproses
//   success -> selesai OK
//   error   -> gagal (isi `error` dengan pesan/penyebabnya)
export type TaskStepStatus = 'pending' | 'running' | 'success' | 'error';

// Satu baris detail di dalam task: mewakili SATU item / SATU panggilan API,
// mis. satu folder tema yang di-inject, satu chunk kontak Google, satu foto galeri.
// Ini yang membuat dialog "Proses Latar Belakang" bisa di-expand dan menunjukkan
// item/API mana persisnya yang error, bukan cuma rekap "0 Berhasil / 1 Gagal".
export interface BackgroundTaskStep {
    id: string;                // unik dalam satu task
    label: string;             // nama item, mis. "bali-heritage" / "foto_akad.jpg"
    status: TaskStepStatus;
    phase?: string;            // sub-status saat running, mis. "menyiapkan edit"
    api?: string;              // action/endpoint yang dipanggil, mis. "createTheme"
    error?: string;            // pesan error kalau status === 'error'
}

export interface BackgroundTask {
    id: string;
    name: string;
    status: TaskStatus;
    progress: number;
    successCount: number;
    failCount: number;
    total: number;
    details?: string;
    failedFiles?: string[];
    steps?: BackgroundTaskStep[];
    timestamp: string;
}

interface BackgroundTaskStore {
    tasks: BackgroundTask[];
    addTask: (task: Omit<BackgroundTask, 'timestamp' | 'status' | 'progress' | 'successCount' | 'failCount'>) => void;
    updateTask: (id: string, updates: Partial<BackgroundTask>) => void;
    // Upsert satu langkah: kalau `stepId` belum ada dia di-append, kalau sudah ada
    // di-merge (shallow). Dipakai produser supaya tidak perlu menyalin array steps
    // sendiri setiap update.
    updateStep: (taskId: string, stepId: string, updates: Partial<Omit<BackgroundTaskStep, 'id'>>) => void;
    removeTask: (id: string) => void;
    clearCompleted: () => void;
}

export const useBackgroundTaskStore = create<BackgroundTaskStore>((set) => ({
    tasks: [],
    addTask: (task) => set((state) => ({
        tasks: [
            {
                ...task,
                status: 'running',
                progress: 0,
                successCount: 0,
                failCount: 0,
                timestamp: new Date().toISOString(),
            },
            ...state.tasks
        ],
    })),
    updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates } : task
        ),
    })),
    updateStep: (taskId, stepId, updates) => set((state) => ({
        tasks: state.tasks.map((task) => {
            if (task.id !== taskId) return task;
            const steps = task.steps || [];
            const idx = steps.findIndex((s) => s.id === stepId);
            if (idx === -1) {
                // Langkah baru: default pending + label = stepId kalau tidak diberikan.
                return {
                    ...task,
                    steps: [...steps, { id: stepId, label: stepId, status: 'pending', ...updates }],
                };
            }
            const next = [...steps];
            next[idx] = { ...next[idx], ...updates };
            return { ...task, steps: next };
        }),
    })),
    removeTask: (id) => set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
    })),
    clearCompleted: () => set((state) => ({
        tasks: state.tasks.filter((task) => task.status === 'running'),
    })),
}));
