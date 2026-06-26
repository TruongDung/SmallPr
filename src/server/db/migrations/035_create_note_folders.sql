-- Create note_folders table to support organizing notes into folders
CREATE TABLE IF NOT EXISTS note_folders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- Add folder_id column to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS folder_id INTEGER REFERENCES note_folders(id) ON DELETE SET NULL;

-- Create index for faster folder queries
CREATE INDEX IF NOT EXISTS idx_note_folders_user_id ON note_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);
