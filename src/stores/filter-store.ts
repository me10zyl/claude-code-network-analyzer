import { create } from 'zustand'

import type { AgentStepType } from '@/lib/models/semantic'

interface FilterStoreState {
  search: string
  stepType: AgentStepType | 'all'
  setSearch: (search: string) => void
  setStepType: (stepType: AgentStepType | 'all') => void
}

export const useFilterStore = create<FilterStoreState>((set) => ({
  search: '',
  stepType: 'all',
  setSearch(search) {
    set({ search })
  },
  setStepType(stepType) {
    set({ stepType })
  },
}))
