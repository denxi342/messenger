-- Run once through a versioned migration runner only when messages.reply_to_id
-- does not already exist. The startup compatibility migration in index.js
-- performs the same column check for legacy deployments.
BEGIN IMMEDIATE;

ALTER TABLE messages ADD COLUMN reply_to_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id
  ON messages (reply_to_id);

COMMIT;
