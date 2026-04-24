import { create } from 'zustand';

export type TaskStatus = 'running' | 'success' | 'error';

export interface BackgroundTask {
    id: string;
    name: string;
    status: TaskStatus;
    progress: number;
    successCount: number;
    failCount: number;
    total: number;
    details?: string;
    timestamp: string;
}

interface BackgroundTaskStore {
    tasks: BackgroundTask[];
    addTask: (task: Omit<BackgroundTask, 'timestamp' | 'status' | 'progress' | 'successCount' | 'failCount'>) => void;
    updateTask: (id: string, updates: Partial<BackgroundTask>) => void;
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
    removeTask: (id) => set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
    })),
    clearCompleted: () => set((state) => ({
        tasks: state.tasks.filter((task) => task.status === 'running'),
    })),
}));
