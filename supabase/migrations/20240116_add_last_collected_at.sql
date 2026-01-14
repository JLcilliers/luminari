-- Add last_collected_at to prompts table for tracking collection status
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS last_collected_at TIMESTAMPTZ;

-- Add index for efficient queries on collection status
CREATE INDEX IF NOT EXISTS idx_prompts_last_collected_at ON prompts(last_collected_at);

-- Add comment for documentation
COMMENT ON COLUMN prompts.last_collected_at IS 'Timestamp of last AI response collection for this prompt';
