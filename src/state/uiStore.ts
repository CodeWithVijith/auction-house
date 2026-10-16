import { create } from 'zustand';
let collapsed = false;
try {
  collapsed =
    localStorage.getItem('auction-house-premium-collapsed') === 'true';
} catch {
  /* Storage unavailable: keep session preference. */
}
export const useUi = create<{ collapsed: boolean; toggle: () => void }>(
  (set, get) => ({
    collapsed,
    toggle: () => {
      const collapsed = !get().collapsed;
      try {
        localStorage.setItem(
          'auction-house-premium-collapsed',
          String(collapsed),
        );
      } catch {
        /* Preference remains available for this session. */
      }
      set({ collapsed });
    },
  }),
);
