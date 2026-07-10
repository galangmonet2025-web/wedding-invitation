import { create } from 'zustand';

export type SaveStepStatus = 'pending' | 'active' | 'done' | 'error' | 'skipped';

export interface SaveStep {
    /** Stable key so status can be updated per step. */
    key: string;
    /** Human label shown in the floating card. */
    label: string;
    status: SaveStepStatus;
    /** Optional detail line under the label (e.g. "2/5 potongan", "HTML & JS"). */
    detail?: string;
}

interface SaveProgressStore {
    /** Card is visible whenever `steps` is non-empty. */
    visible: boolean;
    /** Overall title of the card (e.g. "Menyimpan tema"). */
    title: string;
    steps: SaveStep[];
    /** Set once the whole flow settled — drives the auto-dismiss + final tint. */
    outcome: 'running' | 'success' | 'error';

    /** Start a fresh run with the given ordered steps (all pending). */
    start: (title: string, steps: Array<Omit<SaveStep, 'status'>>) => void;
    /** Patch one step by key. */
    update: (key: string, patch: Partial<Omit<SaveStep, 'key'>>) => void;
    /** Mark the run finished; the card lingers briefly then hides. */
    finish: (outcome: 'success' | 'error') => void;
    /** Hide + clear immediately. */
    reset: () => void;
}

export const useSaveProgressStore = create<SaveProgressStore>((set) => ({
    visible: false,
    title: '',
    steps: [],
    outcome: 'running',

    start: (title, steps) =>
        set({
            visible: true,
            title,
            outcome: 'running',
            steps: steps.map((s) => ({ ...s, status: 'pending' as SaveStepStatus })),
        }),

    update: (key, patch) =>
        set((state) => ({
            steps: state.steps.map((s) => (s.key === key ? { ...s, ...patch } : s)),
        })),

    finish: (outcome) => set({ outcome }),

    reset: () => set({ visible: false, title: '', steps: [], outcome: 'running' }),
}));
