import { create } from 'zustand'

interface SelectionStoreState {
  selectedRequestId: string | null
  selectRequest: (requestId: string | null) => void
}

export const useSelectionStore = create<SelectionStoreState>((set) => ({
  selectedRequestId: null,
  selectRequest(requestId) {
    set({ selectedRequestId: requestId })
  },
}))
