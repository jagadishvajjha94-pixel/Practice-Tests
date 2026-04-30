# PrepIndia - Quick Start Guide (5 Minutes)

## TL;DR

```bash
# 1. Install
pnpm install

# 2. Run
pnpm dev

# 3. Setup (visit in browser)
http://localhost:3000/setup

# 4. Click "Start Setup" button

# 5. Sign Up
http://localhost:3000/auth/signup

# 6. Start Testing
http://localhost:3000/tests
```

## Step-by-Step

### Step 1: Install Dependencies
```bash
pnpm install
```
Takes 1-2 minutes.

### Step 2: Start Development Server
```bash
pnpm dev
```
Server starts at `http://localhost:3000`

### Step 3: Initialize Database
Open browser, go to:
```
http://localhost:3000/setup
```

Click **"Start Setup"** button. Wait for "Setup completed successfully!" message.

This creates:
- Database tables
- Sample test categories
- Sample tests with questions
- Sample blog posts

### Step 4: Sign Up
Go to:
```
http://localhost:3000/auth/signup
```

Fill in:
- Full Name: Your name
- Email: Any email
- Password: min 6 characters
- Confirm Password: Same as above

Click "Sign Up" → You're logged in!

### Step 5: Start Testing
Click "Tests" in navigation. You now have:

- **Quantitative Tests** - 2 tests with 30+ questions each
- **Verbal Tests** - 2 tests with 25+ questions each
- **Logical Tests** - 2 tests with 30+ questions each
- **Coding Tests** - 2 tests with 25+ questions each

### Step 6: Take a Test
1. Click any test
2. Answer questions
3. Click "Submit Test"
4. See instant results!

## What's Available

### Student Features
✅ Sign up & Login
✅ Take tests (8 tests, 200+ questions)
✅ See results instantly
✅ Track test history
✅ View explanations
✅ Edit profile
✅ Read blog articles
✅ Mock resume review
✅ Mock interview practice

### Admin Features
✅ Dashboard with stats
✅ Add/edit questions
✅ Upload CSV questions
✅ Manage users
✅ Manage tests

### Pages
- `/` - Home
- `/setup` - Initialize database
- `/auth/login` - Login
- `/auth/signup` - Sign up
- `/dashboard` - Your dashboard
- `/tests` - All tests
- `/tests/[category]` - Tests by category
- `/tests/take/[id]` - Take a test
- `/tests/result/[id]` - View results
- `/profile` - Edit profile
- `/blog` - Read articles
- `/ai/resume-review` - AI resume review
- `/ai/mock-interview` - AI interview
- `/admin` - Admin panel

## Common Commands

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Run production build locally
pnpm start

# Check linting
pnpm lint
```

## Environment Setup

Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

Get these from your Supabase dashboard.

## Troubleshooting

### Database Not Working?
Visit: `http://localhost:3000/setup` and click "Start Setup" again

### Can't Sign Up?
Check browser console (F12) for error messages

### Tests Not Showing?
Try signing in again, or visit `/setup` page

### Still Stuck?
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Check browser console (F12)
3. Check server logs (terminal output)

## What Happens When You Sign Up?

1. Your account is created in Supabase
2. Your profile is added to database
3. Subscription set to "free"
4. You see your dashboard
5. 10 tests available to take
6. Your scores are tracked

## What Happens When You Take a Test?

1. Timer starts counting down
2. Answer each question
3. Skip questions if needed
4. Mark questions for review
5. Submit the test
6. See scores instantly
7. Review answers & explanations
8. Results saved to your history

## Sample Account

Use any email and password:
- Email: `test@example.com`
- Password: `password123`

## Quick Test

```bash
# Check if database is healthy
curl http://localhost:3000/api/health

# Should return:
# {"status":"healthy","message":"Database is initialized and working",...}
```

## Next Steps

After initial setup:

1. **Add More Tests** - Add questions via admin panel
2. **Customize** - Edit homepage and styling
3. **Deploy** - Push to Vercel
4. **Enable Payments** - Add Razorpay keys for premium

## Need Full Documentation?

- **Setup Details** → See [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **Troubleshooting** → See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Technical Details** → See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **Full Readme** → See [README.md](./README.md)

---

**You're ready!** Go to `http://localhost:3000` and start! 🚀

Questions? Check the docs above or review browser console errors.
