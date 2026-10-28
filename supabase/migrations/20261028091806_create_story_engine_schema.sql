/*
# Create Story Engine Schema

1. New Tables
- `stories`: Top-level novel/story container. Columns: id, title, description, author, created_at, updated_at.
- `passages`: Individual scenes/sections within a story. Columns: id, story_id (FK), title, content (text body), position_x, position_y (for visual map layout), is_start (boolean, marks the entry passage), created_at, updated_at.
- `choices`: Branching links between passages. Columns: id, from_passage_id (FK), to_passage_id (FK, nullable — allows "dead end" choices), text (the choice label), sort_order, created_at.

2. Relationships
- passages.story_id → stories.id (CASCADE on delete)
- choices.from_passage_id → passages.id (CASCADE on delete)
- choices.to_passage_id → passages.id (SET NULL on delete — so deleting a target passage doesn't destroy the choice, it just becomes a dead end)

3. Indexes
- passages.story_id for fast story lookups
- choices.from_passage_id for fast outgoing-choice lookups

4. Security
- Single-tenant app (no sign-in). RLS enabled on all tables.
- GRANT CRUD to anon + authenticated on all tables.
- Policies use USING (true) / WITH CHECK (true) because data is intentionally shared (no auth).
*/

CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS passages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  position_x double precision NOT NULL DEFAULT 0,
  position_y double precision NOT NULL DEFAULT 0,
  is_start boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_passage_id uuid NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  to_passage_id uuid REFERENCES passages(id) ON DELETE SET NULL,
  text text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_passages_story_id ON passages(story_id);
CREATE INDEX IF NOT EXISTS idx_choices_from_passage_id ON choices(from_passage_id);
CREATE INDEX IF NOT EXISTS idx_choices_to_passage_id ON choices(to_passage_id);

-- RLS: stories
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON stories TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_stories" ON stories;
CREATE POLICY "anon_select_stories" ON stories FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_stories" ON stories;
CREATE POLICY "anon_insert_stories" ON stories FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_stories" ON stories;
CREATE POLICY "anon_update_stories" ON stories FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_stories" ON stories;
CREATE POLICY "anon_delete_stories" ON stories FOR DELETE
  TO anon, authenticated USING (true);

-- RLS: passages
ALTER TABLE passages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON passages TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_passages" ON passages;
CREATE POLICY "anon_select_passages" ON passages FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_passages" ON passages;
CREATE POLICY "anon_insert_passages" ON passages FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_passages" ON passages;
CREATE POLICY "anon_update_passages" ON passages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_passages" ON passages;
CREATE POLICY "anon_delete_passages" ON passages FOR DELETE
  TO anon, authenticated USING (true);

-- RLS: choices
ALTER TABLE choices ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON choices TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_choices" ON choices;
CREATE POLICY "anon_select_choices" ON choices FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_choices" ON choices;
CREATE POLICY "anon_insert_choices" ON choices FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_choices" ON choices;
CREATE POLICY "anon_update_choices" ON choices FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_choices" ON choices;
CREATE POLICY "anon_delete_choices" ON choices FOR DELETE
  TO anon, authenticated USING (true);
