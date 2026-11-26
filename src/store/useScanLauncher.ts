import { create } from 'zustand';

/** One-shot request from the Scan tab button (or quick-add) for the scan screen to act on. */
type Action = 'camera' | 'gallery' | 'report' | 'search' | null;
export const useScanLauncher = create<{ pending: Action; request: (a: Exclude<Action, null>) => void; consume: () => Action }>((set, get) => ({
  pending: null,
  request: (a) => set({ pending: a }),
  consume: () => {
    const p = get().pending;
    set({ pending: null });
    return p;
  },
}));
