import { create } from 'zustand'

type LeftPaneMode = 'requests' | 'timeline'
type ActiveDetailTab = 'summary' | 'request' | 'response' | 'tools' | 'diff' | 'timeline'

interface UiStoreState {
  leftPaneMode: LeftPaneMode
  activeDetailTab: ActiveDetailTab
  setLeftPaneMode: (leftPaneMode: LeftPaneMode) => void
  setActiveDetailTab: (activeDetailTab: ActiveDetailTab) => void
}

export const useUiStore = create<UiStoreState>((set) => ({
  leftPaneMode: 'requests',
  activeDetailTab: 'summary',
  setLeftPaneMode(leftPaneMode) {
    set({ leftPaneMode })
  },
  setActiveDetailTab(activeDetailTab) {
    set({ activeDetailTab })
  },
}))
