import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Story } from '@/lib/types';

interface StoryContextValue {
  activeStory: Story | null;
  setActiveStory: (story: Story | null) => void;
}

const StoryContext = createContext<StoryContextValue | undefined>(undefined);

export function StoryProvider({ children }: { children: ReactNode }) {
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  return (
    <StoryContext.Provider value={{ activeStory, setActiveStory }}>
      {children}
    </StoryContext.Provider>
  );
}

export function useStory() {
  const ctx = useContext(StoryContext);
  if (!ctx) throw new Error('useStory must be used within StoryProvider');
  return ctx;
}
