export interface Story {
  id: string;
  title: string;
  description: string;
  author: string;
  created_at: string;
  updated_at: string;
}

export interface Passage {
  id: string;
  story_id: string;
  title: string;
  content: string;
  position_x: number;
  position_y: number;
  is_start: boolean;
  created_at: string;
  updated_at: string;
}

export interface Choice {
  id: string;
  from_passage_id: string;
  to_passage_id: string | null;
  text: string;
  sort_order: number;
  created_at: string;
}

export interface PassageWithChoices extends Passage {
  choices: Choice[];
}

export interface StoryExport {
  version: string;
  exported_at: string;
  story: Pick<Story, 'title' | 'description' | 'author'>;
  passages: Array<
    Pick<Passage, 'title' | 'content' | 'position_x' | 'position_y' | 'is_start'> & {
      id: string;
      choices: Array<Pick<Choice, 'text' | 'sort_order'> & { to_passage_id: string | null }>;
    }
  >;
}
