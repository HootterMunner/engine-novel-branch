import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { Story } from '@/lib/types';

interface StoryContextValue {
  activeStory: Story | null;
  setActiveStory: (story: Story | null) => void;
  loading: boolean;
}

const StoryContext = createContext<StoryContextValue | undefined>(undefined);

const STORAGE_KEY = 'active_story_id';

export function StoryProvider({ children }: { children: ReactNode }) {
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const { data, error } = await supabase
            .from('stories')
            .select('*')
            .eq('id', stored)
            .maybeSingle();
          if (!error && data) {
            setActiveStory(data);
            setLoading(false);
            return;
          }
        }
        const { data, error } = await supabase
          .from('stories')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!error && data) {
          setActiveStory(data);
          localStorage.setItem(STORAGE_KEY, data.id);
        }
      } catch {
        // localStorage might not be available
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setStory = (story: Story | null) => {
    setActiveStory(story);
    if (story?.id) {
      try {
        localStorage.setItem(STORAGE_KEY, story.id);
      } catch {
        // ignore
      }
    } else {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  };

  return (
    <StoryContext.Provider value={{ activeStory, setActiveStory: setStory, loading }}>
      {children}
    </StoryContext.Provider>
  );
}

export function useStory() {
  const ctx = useContext(StoryContext);
  if (!ctx) throw new Error('useStory must be used within StoryProvider');
  return ctx;
}
