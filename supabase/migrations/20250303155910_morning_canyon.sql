-- Create email_logs table to track email sending
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  subject text NOT NULL,
  body_preview text,
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS email_logs_recipient_idx ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS email_logs_status_idx ON email_logs(status);
CREATE INDEX IF NOT EXISTS email_logs_sent_at_idx ON email_logs(sent_at);

-- Disable RLS for this table
ALTER TABLE email_logs DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON email_logs TO public;