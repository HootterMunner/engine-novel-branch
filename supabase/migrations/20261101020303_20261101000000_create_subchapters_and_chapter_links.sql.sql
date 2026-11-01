/*
# Create subchapters and chapter_links tables

1. New Tables
- `subchapters`
  - `id` (uuid, primary key)
  - `chapter_id` (uuid, FK to chapters.id, ON DELETE CASCADE)
  - `title` (text, not null)
  - `sort_order` (integer, default 0)
  - `created_at`, `updated_at` (timestamptz)
- `chapter_links`
  - `id` (uuid, primary key)
  - `story_id` (uuid, FK to stories.id, ON DELETE CASCADE)
  - `from_chapter_id` (uuid, FK to chapters.id, ON DELETE CASCADE)
  - `to_chapter_id` (uuid, FK to chapters.id, ON DELETE CASCADE)
  - `label` (text, optional — display text for the link)
  - `created_at` (timestamptz)

2. Modified Tables
- `passages`: add nullable column `subchapter_id` (uuid, FK to subchapters.id, ON DELETE SET NULL)

3. Security
- Enable RLS on `subchapters` and `chapter_links`.
- Grant CRUD to `anon, authenticated` (single-tenant, no auth).
- Policies: allow all CRUD for `anon, authenticated` (data is intentionally shared).
*/

-- Subchapters table
CREATE TABLE IF NOT EXISTS subchapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subchapters ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON subchapters TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_subchapters" ON subchapters;
CREATE POLICY "anon_select_subchapters" ON subchapters FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_subchapters" ON subchapters;
CREATE POLICY "anon_insert_subchapters" ON subchapters FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_subchapters" ON subchapters;
CREATE POLICY "anon_update_subchapters" ON subchapters FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_subchapters" ON subchapters;
CREATE POLICY "anon_delete_subchapters" ON subchapters FOR DELETE
  TO anon, authenticated USING (true);

-- Chapter links table
CREATE TABLE IF NOT EXISTS chapter_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  from_chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  to_chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  label text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chapter_links ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON chapter_links TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_chapter_links" ON chapter_links;
CREATE POLICY "anon_select_chapter_links" ON chapter_links FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chapter_links" ON chapter_links;
CREATE POLICY "anon_insert_chapter_links" ON chapter_links FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_chapter_links" ON chapter_links;
CREATE POLICY "anon_update_chapter_links" ON chapter_links FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chapter_links" ON chapter_links;
CREATE POLICY "anon_delete_chapter_links" ON chapter_links FOR DELETE
  TO anon, authenticated USING (true);

-- Add subchapter_id to passages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'passages' AND column_name = 'subchapter_id'
  ) THEN
    ALTER TABLE passages ADD COLUMN subchapter_id uuid REFERENCES subchapters(id) ON DELETE SET NULL;
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON passages TO anon, authenticated;
