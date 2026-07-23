PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  published_at TEXT NOT NULL,
  edited_at TEXT,
  category TEXT NOT NULL DEFAULT 'Nota',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  media_json TEXT NOT NULL DEFAULT '[]',
  permalink TEXT,
  visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (source, channel_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_notes_public_feed
  ON notes (visible, published_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_notes_source_message
  ON notes (source, channel_id, source_id);
