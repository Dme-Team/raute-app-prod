-- Manual fix: Add the existing auth user to the users table
-- Replace the values with your actual data

-- First, check current companies
SELECT * FROM companies;

-- If no companies exist, create one:
INSERT INTO companies (name)
VALUES ('My Company')
RETURNING id;

-- Then add the user (replace the email and name with yours!)
INSERT INTO users (id, company_id, email, full_name, role)
VALUES (
  'cf441bea-7604-4d8f-8af5-fc0a799b1851',  -- The user ID from console
  (SELECT id FROM companies ORDER BY created_at DESC LIMIT 1),  -- Latest company
  'your-email-here@example.com',  -- CHANGE THIS to your email
  'Your Name Here',  -- CHANGE THIS to your name
  'manager'
)
ON CONFLICT (id) DO NOTHING;

-- Verify the user was added
SELECT * FROM users WHERE id = 'cf441bea-7604-4d8f-8af5-fc0a799b1851';
