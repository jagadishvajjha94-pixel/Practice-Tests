# PrepIndia Troubleshooting Guide

## Common Issues and Solutions

### 1. Sign Up Fails with "User already exists"

**Problem:** When trying to sign up, you get an error about the user already existing.

**Solution:**
1. Check if you're using the same email that was previously signed up
2. If you want to use the same email, try logging in instead
3. If the account is old and you forgot the password, use the "Forgot Password" link
4. Or sign up with a different email address

### 2. Database Tables Not Found

**Problem:** Getting errors like "relation 'users' does not exist"

**Solution:**
1. Visit `http://localhost:3000/setup` in your browser
2. Click the "Start Setup" button
3. Wait for the initialization to complete
4. If it fails, check the browser console (F12) for error details
5. Ensure all environment variables are set correctly

**Check Environment Variables:**
```bash
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
echo $SUPABASE_SERVICE_ROLE_KEY
```

If any are empty, you need to set them in your Vercel/hosting dashboard.

### 3. Sign Up Succeeds But Can't Access Dashboard

**Problem:** After signing up, redirected to dashboard but it shows "Unable to load user data"

**Solution:**
1. This usually means the user profile wasn't created in the database
2. Refresh the page - it should auto-create the profile
3. If still fails, check browser console for the error
4. The profile will be created automatically on first access

### 4. Tests Not Showing or Empty Test List

**Problem:** Navigate to Tests page but see no tests or an empty list

**Solution:**
1. Visit `http://localhost:3000/setup` again
2. Click "Start Setup" - this will create sample tests
3. Wait for "Setup completed successfully!" message
4. Go back to Tests page, it should now show the tests

### 5. Questions Not Loading in Test

**Problem:** Start a test but no questions appear

**Solution:**
1. Check browser console (F12) for specific errors
2. Ensure the database seeding completed successfully
3. Visit setup page again to reseed data
4. Try a different test category

### 6. Login Fails with "Invalid login credentials"

**Problem:** Can't log in even with correct email/password

**Solution:**
1. Double-check your email and password
2. Passwords are case-sensitive
3. If you forget the password, use "Forgot Password" link (if implemented)
4. Ensure caps lock is not on
5. Try signing up with a new account if the password is truly lost

### 7. "Environment variables not set" Error

**Problem:** Getting errors about missing environment variables

**Solution:**

For local development, create `.env.local` file:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
POSTGRES_URL=your_postgres_url
```

For Vercel deployment:
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add all required variables
3. Redeploy the project

### 8. Payment/Razorpay Not Working

**Problem:** Payment button doesn't work or errors when clicking checkout

**Solution:**
1. Check if `NEXT_PUBLIC_RAZORPAY_KEY_ID` is set
2. In development, payments might fail - this is expected
3. In production, ensure you have valid Razorpay credentials
4. For testing, use Razorpay test keys from their dashboard

### 9. Profile Page Shows "No subscription data"

**Problem:** Profile page doesn't show subscription information

**Solution:**
1. This is normal for free accounts
2. The subscription_end_date will be null
3. To upgrade, click "Upgrade to Premium" button
4. Complete the payment process (test keys for now)

### 10. Admin Panel Not Accessible

**Problem:** Can't access `/admin` even with user logged in

**Solution:**
1. Admin access requires special permissions in the database
2. Currently, any logged-in user can access admin features
3. In production, implement proper role-based access control
4. Check the database to ensure `role` field is set to 'admin' for the user

## Debugging Steps

### Check Database Health

Visit this URL in your browser:
```
http://localhost:3000/api/health
```

You should see:
```json
{
  "status": "healthy",
  "message": "Database is initialized and working",
  "tables": [...]
}
```

If status is "uninitialized", visit `/setup` page.

### Check Browser Console

1. Press F12 to open Developer Tools
2. Go to "Console" tab
3. Look for red error messages
4. Copy the error and search it in the troubleshooting guide
5. Check server logs for more details

### Check Server Logs

1. Look at the terminal where you ran `pnpm dev`
2. Errors will be printed there
3. Copy relevant error lines for investigation

### Enable Debug Logging

The app has debug logging in place. Look for `[v0]` prefixed console messages:
```
[v0] Sign up error: ...
[v0] Setup error: ...
[v0] Database initialization error: ...
```

## Database Connection Issues

### Can't Connect to Supabase

**Check these:**
1. Is Supabase project active? (Check Supabase dashboard)
2. Are environment variables correct? (Copy from Supabase dashboard)
3. Is your internet connection working?
4. Try accessing Supabase dashboard directly

### Slow Database Queries

**Solutions:**
1. Indexes are automatically created - should be fast
2. Clear browser cache (Ctrl+Shift+Del)
3. Check Supabase dashboard for slow queries
4. Ensure you're not hitting rate limits (free tier has limits)

## Feature-Specific Issues

### Tests Not Submitting

**Solution:**
1. Check browser console for errors
2. Ensure all questions are answered (or marked for review)
3. Try answering all questions before submitting
4. Check if submission is taking time (wait a few seconds)

### Results Not Showing

**Solution:**
1. Ensure the attempt was successfully submitted
2. Check browser console for errors
3. Try refreshing the page
4. Navigate back to dashboard and check test history

### Blog Posts Not Loading

**Solution:**
1. Ensure seeding was successful (visit `/setup`)
2. Check if blog posts exist in database
3. Restart development server
4. Clear browser cache

## Performance Issues

### App is Slow

**Solutions:**
1. Check if dev server is running (terminal should show "Compiled successfully")
2. Look for console errors or warnings
3. Check network tab (F12 → Network) for failed requests
4. Restart dev server: Stop with Ctrl+C and run `pnpm dev` again

### Tests Loading Slowly

**Solutions:**
1. May be normal on first load
2. Check Supabase dashboard for slow queries
3. Ensure indexes were created properly
4. Try a different test category

## Deployment Issues

### App Works Locally But Not on Production

**Common Causes:**
1. Environment variables not set on hosting platform
2. Different Supabase project credentials
3. CORS issues - check Supabase CORS settings
4. Database not initialized on production

**Solution:**
1. Verify all env vars on Vercel/hosting dashboard
2. Call the setup endpoint: `https://your-site.com/api/setup/initialize`
3. Call the seed endpoint: `https://your-site.com/api/setup/seed`
4. Check server logs for detailed errors

## Getting Help

If you still can't resolve the issue:

1. **Check Console Errors:** Look for `[v0]` messages and error messages
2. **Check Supabase Dashboard:** Look for database errors or slow queries
3. **Verify Environment Variables:** Ensure all are set correctly
4. **Try Setup Again:** Visit `/setup` and reinitialize
5. **Check Documentation:** Review SETUP_GUIDE.md

## Common Error Messages Explained

### "PGRST116: The query returned no rows"
- Table doesn't exist or is empty
- Run setup: `/api/setup/initialize` then `/api/setup/seed`

### "Invalid login credentials"
- Wrong email or password
- Check for typos and try again

### "Relation does not exist"
- Database tables haven't been created yet
- Visit `/setup` page

### "JWT token invalid"
- Session expired, try logging in again
- Clear cookies and refresh page

### "CORS error"
- Usually a configuration issue
- Check Supabase CORS settings

## Quick Reset

If everything is broken, you can reset:

1. Delete all tables in Supabase dashboard (careful!)
2. Visit `/api/setup/initialize` to create tables again
3. Visit `/api/setup/seed` to add sample data
4. Sign up a new account

This will give you a fresh start.

## Still Need Help?

- Check the SETUP_GUIDE.md for general setup
- Review IMPLEMENTATION_SUMMARY.md for feature details
- Check browser console (F12) for specific errors
- Review server logs in the terminal

Good luck! 🚀
