-- Add ip_address column to audit_logs to track user login IP addresses
ALTER TABLE audit_logs
ADD COLUMN ip_address TEXT;

-- Create index on ip_address for efficient queries
CREATE INDEX IF NOT EXISTS audit_logs_ip_address_idx ON audit_logs (ip_address);
