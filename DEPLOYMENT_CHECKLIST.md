# PrepIndia Deployment Checklist

## Pre-Deployment Verification (Local)

### Database
- [ ] Run `http://localhost:3000/setup` and verify "Setup completed"
- [ ] Run `http://localhost:3000/api/health` - should show "healthy"
- [ ] Sign up with test account
- [ ] Take a test and submit successfully
- [ ] Check test results page loads with score
- [ ] Verify dashboard shows test history

### Authentication
- [ ] Sign up flow works
- [ ] Login flow works
- [ ] Can access protected pages after login
- [ ] Gets redirected to login when not authenticated
- [ ] User profile page shows correct info
- [ ] Can edit profile information

### Tests & Questions
- [ ] View all test categories
- [ ] View tests in each category
- [ ] Start and complete a test
- [ ] See all questions load
- [ ] Submit test and get results
- [ ] View explanation for each answer
- [ ] See test history on dashboard

### Admin Features
- [ ] Can access admin dashboard
- [ ] Can view user statistics
- [ ] Can view questions
- [ ] Can add new question (form works)
- [ ] CSV upload interface shows
- [ ] User management accessible

### Blog
- [ ] Blog listing page shows articles
- [ ] Can click and view individual article
- [ ] Markdown renders properly
- [ ] Navigation works

### Other Pages
- [ ] Homepage loads and looks good
- [ ] Pricing page shows plans
- [ ] About/FAQ sections work
- [ ] Footer links work
- [ ] Navigation is consistent

### Error Handling
- [ ] No console errors in F12
- [ ] Missing data handled gracefully
- [ ] Error messages are helpful
- [ ] Page doesn't crash with bad data

## Deployment Steps (Vercel)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### Step 2: Connect to Vercel
- [ ] Go to vercel.com
- [ ] Create new project
- [ ] Connect GitHub repository
- [ ] Select your repo and branch

### Step 3: Environment Variables
Add in Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL = your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY = your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY = your_service_role_key
POSTGRES_URL = your_postgres_url (optional)
NEXT_PUBLIC_RAZORPAY_KEY_ID = your_razorpay_key (optional)
```

**Important:** 
- [ ] Copy exact values from Supabase dashboard
- [ ] Don't include quotes or extra spaces
- [ ] Use production keys, not test keys

### Step 4: Deploy
- [ ] Click "Deploy" button
- [ ] Wait for deployment to complete
- [ ] Check deployment logs for errors
- [ ] Note the deployment URL

### Step 5: Initialize Production Database
```bash
# Using curl (replace URL with your Vercel URL)
curl -X POST https://your-app.vercel.app/api/setup/initialize
curl -X POST https://your-app.vercel.app/api/setup/seed
```

Or visit in browser:
```
https://your-app.vercel.app/setup
```

Click "Start Setup" button.

- [ ] Database initialization succeeds
- [ ] `/api/health` shows "healthy"

### Step 6: Verification in Production
- [ ] Homepage loads
- [ ] Sign up works
- [ ] Login works
- [ ] Dashboard loads
- [ ] Tests are available
- [ ] Can submit a test
- [ ] Results display properly
- [ ] Admin panel accessible
- [ ] Blog articles show

## Post-Deployment Checks

### Monitoring
- [ ] Set up error monitoring (Sentry recommended)
- [ ] Monitor Supabase dashboard for queries
- [ ] Check Vercel analytics
- [ ] Monitor server response times

### Performance
- [ ] Homepage loads in < 2 seconds
- [ ] Dashboard loads in < 1 second
- [ ] Test page loads in < 1 second
- [ ] Submit test completes in < 3 seconds

### Functionality
- [ ] Take a full test end-to-end
- [ ] Verify scoring is correct
- [ ] Check explanations load
- [ ] Verify test history saves

### Security
- [ ] HTTPS is enabled (Vercel default)
- [ ] Can't access protected routes without auth
- [ ] User data is isolated (see own data only)
- [ ] No sensitive data in browser storage

## Custom Domain Setup (Optional)

### Add Custom Domain
- [ ] Go to Vercel Dashboard → Domains
- [ ] Add your custom domain
- [ ] Update DNS settings (follow Vercel instructions)
- [ ] Wait for DNS propagation (up to 48 hours)
- [ ] Verify domain works

```
Example: prepindia.com → your-app.vercel.app
```

## SSL Certificate (Automatic)

- [ ] Vercel provides free SSL
- [ ] HTTPS is enabled automatically
- [ ] Certificate auto-renews
- [ ] No action needed

## Database Backups

### Supabase Backups
- [ ] Enable automated backups in Supabase
- [ ] Test restore procedure
- [ ] Document backup policy

## Monitoring & Logs

### Vercel Logs
- [ ] Go to Vercel Dashboard → Logs
- [ ] Monitor for errors
- [ ] Set up alerts (Pro plan)

### Supabase Logs
- [ ] Go to Supabase Dashboard → Logs
- [ ] Monitor slow queries
- [ ] Check API requests

## User Support Resources

Create/prepare:
- [ ] FAQ page
- [ ] Contact form
- [ ] Email support setup
- [ ] Documentation links in footer

## Optional Enhancements

### Email Notifications
- [ ] Set up email service (SendGrid, Resend)
- [ ] Send welcome email on signup
- [ ] Send test score notifications
- [ ] Send weekly digest

### Analytics
- [ ] Integrate Google Analytics
- [ ] Track user behavior
- [ ] Monitor test completion rates
- [ ] Track subscription metrics

### Payments
- [ ] Activate Razorpay production keys
- [ ] Test payment flow
- [ ] Set up subscription management
- [ ] Add invoice email

### CDN
- [ ] Images served via CDN (Vercel default)
- [ ] Enable caching headers
- [ ] Optimize image formats

## Rollback Plan

If something goes wrong:

```bash
# Revert to previous commit
git revert <commit-hash>
git push origin main

# Vercel will auto-redeploy
```

Or in Vercel Dashboard:
- [ ] Click "Deployments"
- [ ] Find previous successful deployment
- [ ] Click "..." → "Promote to Production"

## Launch Checklist

### 24 Hours Before Launch
- [ ] Final testing on production
- [ ] Team review complete
- [ ] Documentation reviewed
- [ ] Support team trained

### Launch Day
- [ ] All checklists completed
- [ ] Announce on social media (optional)
- [ ] Monitor logs closely
- [ ] Support team on standby

### Post-Launch
- [ ] Monitor error rates
- [ ] Respond to user feedback
- [ ] Fix critical bugs immediately
- [ ] Plan improvements based on feedback

## Troubleshooting Deployment

### White Screen / 500 Error
- [ ] Check Vercel logs
- [ ] Verify environment variables
- [ ] Check database connection
- [ ] Run `/api/health` check

### Database Connection Failed
- [ ] Verify `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Check Supabase project is active
- [ ] Verify IP whitelist (if configured)

### Setup Fails on Production
- [ ] Check service role key is correct
- [ ] Verify database has correct permissions
- [ ] Check Supabase logs for errors
- [ ] Try running via curl first

### Tests Not Showing
- [ ] Verify seeding completed
- [ ] Check database has test_categories table
- [ ] Check tests table has rows
- [ ] Run `/api/health` to verify

### Sign Up/Login Not Working
- [ ] Check environment variables
- [ ] Verify auth settings in Supabase
- [ ] Check browser console errors
- [ ] Verify email is valid format

## Success Criteria

✅ All checks passed:
- [ ] Homepage accessible
- [ ] User can sign up
- [ ] User can login
- [ ] Database initialized
- [ ] Tests are available
- [ ] Can submit and score tests
- [ ] No console errors
- [ ] No 500 errors in logs
- [ ] Performance acceptable
- [ ] Mobile responsive

## Documentation for Users

Share with users:
- [ ] README.md - Overview
- [ ] QUICK_START.md - Getting started
- [ ] SETUP_GUIDE.md - Detailed setup
- [ ] TROUBLESHOOTING.md - Common issues

## Communication

### Announcement Template
```
🎉 PrepIndia is now live!

Prepare for your placements with:
✅ 50+ full-length tests
✅ 200+ practice questions
✅ Real-time feedback
✅ Mock interviews
✅ Resume review

Sign up: [URL]
Join 1000+ students preparing!
```

## Maintenance Plan

### Weekly
- [ ] Monitor error rates
- [ ] Check server performance
- [ ] Review user feedback

### Monthly
- [ ] Update content (new tests/questions)
- [ ] Review analytics
- [ ] Plan improvements

### Quarterly
- [ ] Security audit
- [ ] Performance optimization
- [ ] Major feature releases

---

**Status:** Ready for deployment ✅

Use this checklist for each deployment to ensure consistency and quality.

For issues, check the troubleshooting section or review the documentation files.
