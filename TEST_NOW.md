# Quick Testing Guide - Start Here

## Step 1: Disable Email Verification (2 minutes)

Go to Supabase Console: https://app.supabase.com
1. Select your PrepIndia project
2. Click **Authentication** (left sidebar)
3. Click **Providers**
4. Click **Email**
5. **Turn OFF** "Confirm email"
6. Click **Save**

This allows users to sign up and login immediately without email confirmation.

---

## Step 2: Initialize Database (1 minute)

You have 2 options:

### Option A: Using the Manual Setup Endpoint
Open your browser and visit this URL:
```
http://localhost:3000/api/manual-setup
```

You'll see a JSON response with success status. If successful, your database is ready!

### Option B: Using the Setup Page
1. Go to http://localhost:3000/setup
2. Click "Start Setup"
3. Wait for "Setup Complete" message

---

## Step 3: Create Test Account (2 minutes)

1. Go to http://localhost:3000/auth/signup
2. Fill in:
   - Full Name: `Test User`
   - Email: `test@example.com`
   - Password: `Password123`
   - Confirm: `Password123`
3. Click "Sign Up"
4. You'll go directly to dashboard (no email needed!)

---

## Step 4: Explore the Portal

### Dashboard
- See your test statistics
- View recent test attempts
- Check your profile

### Take a Test
1. Click "Browse Tests"
2. Select a category (e.g., "Quantitative Ability")
3. Choose a test
4. Click "Start Test"

### Test Features
- **Timer**: Counts down in top right
- **Questions**: Displayed one at a time
- **Navigation**: Jump to any question
- **Mark for Review**: Mark questions to review later
- **Submit**: Submit when done
- **Results**: See score and explanations

### Check Results
1. From dashboard, click on a test result
2. See:
   - Your score and percentage
   - Question-wise breakdown
   - Correct answers with explanations
   - Marked for review questions

---

## Test Data Included

### 6 Test Categories
1. **Quantitative Ability** - 2 tests, 30+ questions
2. **Verbal Ability** - 2 tests, 24+ questions
3. **Logical Reasoning** - 2 tests, 30+ questions
4. **Coding** - 2 tests, 20+ questions
5. **Current Affairs** - Placeholder
6. **Company Tests** - Placeholder

### Sample Questions Include
- Multiple choice questions
- Numeric answer questions
- Detailed explanations
- Difficulty levels

---

## Testing Checklist

### Authentication
- [ ] Can sign up
- [ ] Can login
- [ ] Login shows error with wrong password
- [ ] Profile page works

### Tests & Questions
- [ ] Can see all test categories
- [ ] Can see tests in each category
- [ ] Can start a test
- [ ] Questions display correctly
- [ ] Can answer questions
- [ ] Timer works
- [ ] Can navigate between questions
- [ ] Can mark for review
- [ ] Can submit test

### Results
- [ ] Score is calculated correctly
- [ ] Can see question-wise breakdown
- [ ] Can see explanations
- [ ] Results saved in history
- [ ] Can view past attempts from dashboard

---

## Browser Console Tips

Open DevTools (Press F12) → Console tab

You'll see helpful debug logs:
- `[v0] Init response: 200` - Database ready
- `[v0] Seed response: 200` - Test data loaded
- Other `[v0]` logs for debugging

---

## Common Issues & Quick Fixes

### "Database initialization failed"
**Fix:** Make sure you have proper Supabase environment variables set

### "Email not found"
**Fix:** This means signup didn't create the user profile. Run `/api/manual-setup` endpoint

### "No tests showing"
**Fix:** Visit `/api/manual-setup` to seed the database with test data

### "Timer not working"
**Fix:** Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

### "Can't login after signup"
**Fix:** Make sure "Confirm email" is turned OFF in Supabase Authentication settings

---

## Next Steps

Once you've tested everything:
1. Try creating multiple test accounts
2. Take multiple tests
3. Check scores and results
4. Verify all features work
5. Then we'll add email confirmation for production

---

## Ready to Test?

Start here:
1. Disable email verification in Supabase (2 min)
2. Run `/api/manual-setup` endpoint (1 min)
3. Sign up at `/auth/signup` (2 min)
4. Take a test and see results (5 min)

**Total time: ~10 minutes to full test!**

---

## Questions or Issues?

Check these files:
- `TESTING_GUIDE.md` - Detailed testing guide
- `TROUBLESHOOTING.md` - Common issues and solutions
- `README.md` - Full documentation
