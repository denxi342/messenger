-- Run exactly once through a versioned migration runner.
-- Safe for an existing messages table with data. SQLite/LibSQL cannot add a
-- non-constant DEFAULT such as CURRENT_TIMESTAMP to a populated table, so the
-- application explicitly writes CURRENT_TIMESTAMP for every new message.
BEGIN IMMEDIATE;

ALTER TABLE messages ADD COLUMN created_at DATETIME;

-- Existing records only contain the UI display time (HH:mm), not a real date.
-- Mark them with the migration timestamp rather than fabricating chronology.
UPDATE messages
SET created_at = CURRENT_TIMESTAMP
WHERE created_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient_created_at
  ON messages (sender_id, recipient_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_sender_created_at
  ON messages (recipient_id, sender_id, created_at, id);

COMMIT;
