/*
# Create chapters table

1. New Tables
- `chapters`: Groups passages into chapters for easier navigation in long novels.
  - id (uuid, PK)
  - story_id (uuid, FK → stories, CASCADE on delete)
  - title (text, not null)
  - sort_order (integer, default 0)
  - created_at (timestamptz)
  - updated_at (timestamptz)

2. Modified Tables
- `passages`: Add nullable `chapter_id` column (FK → chapters, SET NULL on delete).
  Existing passages get chapter_id = NULL (no chapter assigned) so they remain visible
  in an "Unsorted" / "Tanpa Bab" view. No data is lost.

3. Indexes
- chapters.story_id for fast story-level lookups
- passages.chapter_id for fast chapter-filtered lookups

4. Security
- RLS enabled on chapters (single-tenant, no auth)
- GRANT CRUD to anon + authenticated on chapters
- Policies use USING(true) / WITH CHECK(true) — data intentionally shared
- passages already has RLS; chapter_id inherits the same access via FK
*/

CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chapters_story_id ON chapters(story_id);

-- Add chapter_id to passages (nullable so existing data is preserved)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'passages' AND column_name = 'chapter_id'
  ) THEN
    ALTER TABLE passages ADD COLUMN chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_passages_chapter_id ON passages(chapter_id);
  END IF;
END $$;

-- RLS: chapters
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON chapters TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_chapters" ON chapters;
CREATE POLICY "anon_select_chapters" ON chapters FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_chapters" ON chapters;
CREATE POLICY "anon_insert_chapters" ON chapters FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_chapters" ON chapters;
CREATE POLICY "anon_update_chapters" ON chapters FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_chapters" ON chapters;
CREATE POLICY "anon_delete_chapters" ON chapters FOR DELETE
  TO anon, authenticated USING (true);
