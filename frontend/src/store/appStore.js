import { create } from 'zustand'

export const useAppStore = create((set) => ({
  activeDomain: 'customer_success',
  setActiveDomain: (domain) => set({ activeDomain: domain }),

  // Sidebar
  sidebarOpen: true,
  sidebarPanel: 'overview',
  setSidebarPanel: (panel) => set({ sidebarPanel: panel }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // Execution context (written by RecommendPage, read by sidebar)
  executionData: null,
  setExecutionData: (data) => set({ executionData: data }),
  outcomeData: null,
  setOutcomeData: (data) => set({ outcomeData: data }),

  // Interaction Intelligence
  interactions: [],
  setInteractions: (list) => set({ interactions: list }),
  interactionResult: null,
  setInteractionResult: (data) => set({ interactionResult: data }),
  interactionStats: null,
  setInteractionStats: (data) => set({ interactionStats: data }),
}))
