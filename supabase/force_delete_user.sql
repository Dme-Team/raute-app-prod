-- ⚠️ WARNING: This will permanently delete the user account with this email.
-- Use this ONLY if you deleted the driver from the app but the email is still "taken".

-- 1. Replace 'sarah@demo.com' with the actual email you want to free up.
DELETE FROM auth.users 
WHERE email = 'sarah@demo.com';

-- That's it! You can now re-register this driver.
