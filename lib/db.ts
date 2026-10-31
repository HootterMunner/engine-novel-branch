import { supabase } from './supabase';
import type { Story, Chapter, Passage, Choice, StoryExport } from './types';

function mapError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Terjadi kesalahan tak terduga';
}

// ---------- Stories ----------

export async function fetchStories(): Promise<Story[]> {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(mapError(error));
  return data ?? [];
}

export async function fetchStory(id: string): Promise<Story | null> {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(mapError(error));
  return data;
}

export async function createStory(
  title: string,
  description = '',
  author = '',
): Promise<Story> {
  const { data, error } = await supabase
    .from('stories')
    .insert({ title, description, author })
    .select()
    .single();
  if (error) throw new Error(mapError(error));
  return data;
}

export async function updateStory(
  id: string,
  patch: Partial<Pick<Story, 'title' | 'description' | 'author'>>,
): Promise<void> {
  const { error } = await supabase
    .from('stories')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(mapError(error));
}

export async function deleteStory(id: string): Promise<void> {
  const { error } = await supabase.from('stories').delete().eq('id', id);
  if (error) throw new Error(mapError(error));
}

// ---------- Chapters ----------

export async function fetchChapters(storyId: string): Promise<Chapter[]> {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('story_id', storyId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(mapError(error));
  return data ?? [];
}

export async function createChapter(
  storyId: string,
  title: string,
  sortOrder = 0,
): Promise<Chapter> {
  const { data, error } = await supabase
    .from('chapters')
    .insert({ story_id: storyId, title, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw new Error(mapError(error));
  return data;
}

export async function updateChapter(
  id: string,
  patch: Partial<Pick<Chapter, 'title' | 'sort_order'>>,
): Promise<void> {
  const { error } = await supabase
    .from('chapters')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(mapError(error));
}

export async function deleteChapter(id: string): Promise<void> {
  const { error } = await supabase.from('chapters').delete().eq('id', id);
  if (error) throw new Error(mapError(error));
}

// ---------- Passages ----------

export async function fetchPassages(storyId: string, chapterId?: string | null): Promise<Passage[]> {
  let query = supabase
    .from('passages')
    .select('*')
    .eq('story_id', storyId)
    .order('created_at', { ascending: true });
  if (chapterId !== undefined) {
    if (chapterId === null) {
      query = query.is('chapter_id', null);
    } else {
      query = query.eq('chapter_id', chapterId);
    }
  }
  const { data, error } = await query;
  if (error) throw new Error(mapError(error));
  return data ?? [];
}

export async function fetchPassage(id: string): Promise<Passage | null> {
  const { data, error } = await supabase
    .from('passages')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(mapError(error));
  return data;
}

export async function createPassage(
  storyId: string,
  title: string,
  content = '',
  positionX = 0,
  positionY = 0,
  chapterId: string | null = null,
): Promise<Passage> {
  const { data, error } = await supabase
    .from('passages')
    .insert({
      story_id: storyId,
      chapter_id: chapterId,
      title,
      content,
      position_x: positionX,
      position_y: positionY,
    })
    .select()
    .single();
  if (error) throw new Error(mapError(error));
  return data;
}

export async function updatePassage(
  id: string,
  patch: Partial<
    Pick<Passage, 'title' | 'content' | 'position_x' | 'position_y' | 'is_start' | 'chapter_id'>
  >,
): Promise<void> {
  const { error } = await supabase
    .from('passages')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(mapError(error));
}

export async function deletePassage(id: string): Promise<void> {
  const { error } = await supabase.from('passages').delete().eq('id', id);
  if (error) throw new Error(mapError(error));
}

// ---------- Choices ----------

export async function fetchChoices(passageId: string): Promise<Choice[]> {
  const { data, error } = await supabase
    .from('choices')
    .select('*')
    .eq('from_passage_id', passageId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(mapError(error));
  return data ?? [];
}

export async function fetchAllChoices(storyId: string): Promise<Choice[]> {
  const passages = await fetchPassages(storyId);
  if (passages.length === 0) return [];
  const passageIds = passages.map((p) => p.id);
  const { data, error } = await supabase
    .from('choices')
    .select('*')
    .in('from_passage_id', passageIds)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(mapError(error));
  return data ?? [];
}

export async function createChoice(
  fromPassageId: string,
  text: string,
  toPassageId: string | null,
  sortOrder = 0,
): Promise<Choice> {
  const { data, error } = await supabase
    .from('choices')
    .insert({
      from_passage_id: fromPassageId,
      to_passage_id: toPassageId,
      text,
      sort_order: sortOrder,
    })
    .select()
    .single();
  if (error) throw new Error(mapError(error));
  return data;
}

export async function updateChoice(
  id: string,
  patch: Partial<Pick<Choice, 'text' | 'to_passage_id' | 'sort_order'>>,
): Promise<void> {
  const { error } = await supabase.from('choices').update(patch).eq('id', id);
  if (error) throw new Error(mapError(error));
}

export async function deleteChoice(id: string): Promise<void> {
  const { error } = await supabase.from('choices').delete().eq('id', id);
  if (error) throw new Error(mapError(error));
}

// ---------- Helpers ----------

export async function getStartPassage(storyId: string): Promise<Passage | null> {
  const { data, error } = await supabase
    .from('passages')
    .select('*')
    .eq('story_id', storyId)
    .eq('is_start', true)
    .maybeSingle();
  if (error) throw new Error(mapError(error));
  return data;
}

export async function setStartPassage(storyId: string, passageId: string): Promise<void> {
  const { error: err1 } = await supabase
    .from('passages')
    .update({ is_start: false })
    .eq('story_id', storyId)
    .neq('id', passageId);
  if (err1) throw new Error(mapError(err1));
  const { error: err2 } = await supabase
    .from('passages')
    .update({ is_start: true })
    .eq('id', passageId);
  if (err2) throw new Error(mapError(err2));
}

// ---------- Import / Export ----------

export async function exportStory(storyId: string): Promise<StoryExport> {
  const story = await fetchStory(storyId);
  if (!story) throw new Error('Cerita tidak ditemukan');

  const [passages, choices, chapters] = await Promise.all([
    fetchPassages(storyId),
    fetchAllChoices(storyId),
    fetchChapters(storyId),
  ]);

  return {
    version: '1.1',
    exported_at: new Date().toISOString(),
    story: { title: story.title, description: story.description, author: story.author },
    chapters: chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      sort_order: ch.sort_order,
    })),
    passages: passages.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      position_x: p.position_x,
      position_y: p.position_y,
      is_start: p.is_start,
      chapter_id: p.chapter_id,
      choices: choices
        .filter((c) => c.from_passage_id === p.id)
        .map((c) => ({
          text: c.text,
          sort_order: c.sort_order,
          to_passage_id: c.to_passage_id,
        })),
    })),
  };
}

export async function importStory(json: StoryExport): Promise<Story> {
  const story = await createStory(
    json.story.title || 'Tanpa Judul',
    json.story.description || '',
    json.story.author || '',
  );

  const oldToNewPassage = new Map<string, string>();
  const oldToNewChapter = new Map<string, string>();

  // Import chapters
  if (json.chapters) {
    for (const ch of json.chapters) {
      const createdCh = await createChapter(story.id, ch.title, ch.sort_order);
      oldToNewChapter.set(ch.id, createdCh.id);
    }
  }

  for (const p of json.passages) {
    const newChapterId = p.chapter_id ? oldToNewChapter.get(p.chapter_id) ?? null : null;
    const created = await createPassage(
      story.id,
      p.title,
      p.content,
      p.position_x,
      p.position_y,
      newChapterId,
    );
    oldToNewPassage.set(p.id, created.id);
    if (p.is_start) {
      await setStartPassage(story.id, created.id);
    }
  }

  for (const p of json.passages) {
    const newFromId = oldToNewPassage.get(p.id);
    if (!newFromId) continue;
    for (const c of p.choices) {
      const newToId = c.to_passage_id ? oldToNewPassage.get(c.to_passage_id) ?? null : null;
      await createChoice(newFromId, c.text, newToId, c.sort_order);
    }
  }

  return story;
}
