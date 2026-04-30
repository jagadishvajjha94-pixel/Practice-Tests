# Email Verification Setup Guide

## Current Flow

When a user signs up:
1. User enters email and password
2. Clicks "Sign Up" button
3. Supabase sends a confirmation email
4. User clicks the link in the email
5. Link redirects to `/auth/callback` on your site
6. Email is verified and user is logged in
7. User is redirected to dashboard

## For Development (Email Verification Disabled)

If you want to skip email verification during development:

### Option 1: Disable Email Confirmation in Supabase (Recommended for Dev)

1. Go to your Supabase project dashboard
2. Navigate to **Authentication → Providers → Email**
3. Turn OFF "Confirm email"
4. Save changes

Now users can sign up and login immediately without email verification.

### Option 2: Auto-Confirm User After Signup (Currently Implemented)

The app now automatically creates a user profile when they sign up, even before email confirmation.

## For Production (Email Verification Enabled)

1. Keep email confirmation enabled in Supabase
2. Configure your redirect URL in Supabase:
   - Go to **Authentication → URL Configuration**
   - Add your domain: `https://yourdomainhere.com`
   - Supabase will use this to create confirmation links

3. Make sure your deployment uses the correct URL in environment variables

## Troubleshooting

### "This site can't be reached" Error

This happens when:
1. Email verification is enabled BUT
2. The confirmation callback page doesn't exist OR
3. The redirect URL is misconfigured

**Solution:**
- The app now has `/auth/callback` to handle confirmations
- If you still see this error, check that your Supabase URL configuration includes your domain

### Email Not Received

This could happen because:
1. Email is in spam folder
2. Supabase email service is rate-limited
3. Email configuration not set up

**Solution:**
- Check spam/promotions folder
- Wait a few minutes and try again
- For dev, disable email confirmation instead

### Confirmation Link Expired

Confirmation links expire after 24 hours.

**Solution:**
- Request a new sign-up link
- Resend confirmation email from `/auth/resend-confirmation` (if implemented)

## Current Implementation

The app has:
- ✅ `/auth/signup` - Sign-up form with redirect URL
- ✅ `/auth/callback` - Email confirmation handler
- ✅ `/auth/error` - Error page for auth issues
- ✅ `/auth/login` - Login form
- ✅ Auto profile creation - User profile created immediately on signup

## Next Steps

1. **For Development:**
   ```
   Supabase Dashboard → Authentication → Providers → Email
   Turn OFF "Confirm email"
   ```

2. **For Production:**
   ```
   Supabase Dashboard → Authentication → URL Configuration
   Add your production domain (https://yourdomain.com)
   ```

3. **Test the Flow:**
   - Sign up with an email
   - Check your email inbox
   - Click the confirmation link
   - You should be logged in and redirected to dashboard
