# How to Fix "Site Can't Be Reached" Error on Confirmation Email

## Problem

When you click the confirmation link in the email, you get:
```
This site can't be reached
```

## Root Cause

Supabase is sending you an email with a confirmation link, but:
1. The link might be pointing to the wrong URL, OR
2. Email verification is enabled but you need to configure it properly

## Quick Fix (For Development)

### Step 1: Disable Email Confirmation
1. Open your Supabase project: https://app.supabase.com
2. Go to **Authentication** (left sidebar)
3. Click **Providers** 
4. Find **Email** and click on it
5. Toggle OFF **"Confirm email"**
6. Click **Save**

Now users can:
- Sign up with any email
- Login immediately without email verification
- Start taking tests right away

### Step 2: Test It
1. Go to your app and click "Sign Up"
2. Enter email and password
3. Click "Sign Up" button
4. You should be redirected to login page with message "Sign up successful! Check your email"
5. Go to login and login with your credentials
6. You should now be in the dashboard

## For Production Setup

If you want email verification enabled in production:

### Step 1: Configure URL in Supabase
1. Open your Supabase project
2. Go to **Authentication** → **URL Configuration**
3. Add your production URL in the **Site URL** field
   - Example: `https://prepindia.com`
4. If deployed on Vercel, add:
   - Example: `https://your-project.vercel.app`
5. Click **Save**

### Step 2: Enable Email Confirmation
1. Go to **Authentication** → **Providers** → **Email**
2. Toggle ON **"Confirm email"**
3. Click **Save**

### Step 3: Configure Email Service (Optional)
By default, Supabase uses their email service. For better delivery:
1. Go to **Authentication** → **Providers** → **Email**
2. Scroll to "SMTP Settings"
3. Add your custom email service (Gmail, SendGrid, etc.)

### Step 4: Test Email Flow
1. Sign up with your email
2. Check your email inbox (and spam folder)
3. Click the confirmation link
4. You should be logged in automatically

## Complete Auth Flow

### Current Implementation

The app now has these pages:
- `/auth/signup` - User creates account
- `/auth/login` - User logs in
- `/auth/callback` - Email confirmation handler (automatically redirected)
- `/auth/error` - Error page
- `/auth/resend-confirmation` - Resend confirmation email if needed

### Flow Diagram

**With Email Verification Disabled (Development)**
```
User signs up → Supabase creates user → Dashboard
```

**With Email Verification Enabled (Production)**
```
User signs up → Supabase creates user → Email sent → User clicks link → Dashboard
```

## What Happens Now

After your changes:

1. **Sign Up**: User creates account with email and password
2. **Instant Access**: 
   - If email verification OFF: User can login immediately
   - If email verification ON: User receives confirmation email
3. **Email Confirmation** (if enabled):
   - User clicks link in email
   - Automatically logged in
   - Redirected to dashboard
4. **Dashboard**: User can now take tests, view profile, etc.

## Testing Checklist

- [ ] Go to `/setup` and click "Start Setup"
- [ ] Sign up with test email and password
- [ ] If email verification is ON: Check email and click confirmation link
- [ ] If email verification is OFF: Login immediately
- [ ] Verify you're redirected to dashboard
- [ ] Take a test to ensure everything works

## Troubleshooting

### Still Getting "Site Can't Be Reached"?

**Solution 1: Check Email Verification Setting**
- Open Supabase Dashboard
- Go to Authentication → Providers → Email
- Make sure "Confirm email" is toggled OFF for development
- Click Save

**Solution 2: Hard Refresh Browser**
- Press `Ctrl + Shift + R` (Windows/Linux)
- Or `Cmd + Shift + R` (Mac)
- This clears cache and reloads the page

**Solution 3: Clear Browser Cache**
- Open Developer Tools (F12)
- Go to Application/Storage tab
- Clear all cookies and local storage
- Refresh the page

### Confirmation Link Expired?

- Go to `/auth/resend-confirmation`
- Enter your email address
- Click "Resend Confirmation Email"
- Check your email again

### Didn't Receive Email?

1. Check spam/promotions folder
2. Wait 2-3 minutes (email may be delayed)
3. Use `/auth/resend-confirmation` page
4. For development, just disable email verification

## Quick Commands

**To disable email verification (development):**
```
Supabase → Authentication → Providers → Email → Turn OFF "Confirm email"
```

**To enable email verification (production):**
```
Supabase → Authentication → URL Configuration → Add your domain
Supabase → Authentication → Providers → Email → Turn ON "Confirm email"
```

## Files Modified

- `/app/auth/callback/route.ts` - Email confirmation handler
- `/app/auth/error/page.tsx` - Error page
- `/app/auth/signup/page.tsx` - Updated with redirect URL
- `/app/auth/resend-confirmation/page.tsx` - Resend confirmation email

## Next Steps

1. **Immediate** (5 min):
   - Disable email verification in Supabase
   - Try signing up again
   
2. **After Testing** (Optional):
   - Configure email verification for production
   - Test the full email flow
   
3. **Before Deployment**:
   - Make sure URL Configuration is set in Supabase
   - Test email confirmations work end-to-end

## Questions?

If you still have issues:
1. Check the console (F12) for error messages
2. Check your Supabase project logs
3. Verify environment variables are correct
