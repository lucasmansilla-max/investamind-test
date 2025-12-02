-- Add event_id column to webhook_logs table for duplicate prevention
ALTER TABLE webhook_logs 
ADD COLUMN IF NOT EXISTS event_id VARCHAR(255);

-- Create unique index on (source, event_id) to prevent duplicate event processing
-- Only enforce uniqueness where event_id is not null
CREATE UNIQUE INDEX IF NOT EXISTS webhook_logs_source_event_id_unique 
ON webhook_logs (source, event_id) 
WHERE event_id IS NOT NULL;

-- Update status column to allow 'duplicate' status
-- Note: If the column already exists, this will not change it
-- ALTER TABLE webhook_logs ALTER COLUMN status TYPE VARCHAR(20) does nothing if type is same

-- Add comment to document the purpose
COMMENT ON COLUMN webhook_logs.event_id IS 'Unique identifier for the event to prevent duplicate processing. Combined with source forms a unique constraint.';

