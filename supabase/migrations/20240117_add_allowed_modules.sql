-- Add allowed_modules column to users table to support granular permission overrides
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_modules text[];

-- Update existing users to have null allowed_modules (falling back to role base)
-- No action needed as default is null.
