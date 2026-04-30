# PrepIndia Testing Guide

## Quick Setup for Testing (No Email Confirmation)

### Step 1: Disable Email Verification in Supabase
This allows users to sign up and login immediately without email confirmation.

1. Go to https://app.supabase.com
2. Select your project
3. Click **Authentication** → **Providers** → **Email**
4. Toggle **OFF** the "Confirm email" option
5. Click **Save**

### Step 2: Access the Setup Page
1. Run `pnpm dev` to start the dev server
2. Open http://localhost:3000/setup
3. Click "Start Setup" button
4. Wait for database initialization and seeding
5. You'll see success messages when complete

### Step 3: Test Sign Up
1. Go to http://localhost:3000/auth/signup
2. Fill in the form:
   - Full Name: Test User
   - Email: test@example.com
   - Password: Password123
   - Confirm Password: Password123
3. Click "Sign Up"
4. You'll be redirected to login page
5. Login with the same email and password

### Step 4: Access Dashboard
1. After login, you'll see the dashboard
2. View your profile, test history, and statistics
3. Click "Browse Tests" to see available tests

## Testing Checklist

### Authentication Flow
- [ ] Sign up with new email works
- [ ] Login with correct credentials works
- [ ] Login with wrong password shows error
- [ ] Already registered email shows error on signup
- [ ] Profile is created after signup
- [ ] User can view their profile

### Test Engine
- [ ] Tests page shows all categories
- [ ] Category pages show available tests
- [ ] Can start a test
- [ ] Timer counts down correctly
- [ ] Can navigate between questions
- [ ] Can mark questions for review
- [ ] Can select answers (multiple choice)
- [ ] Can enter numeric answers
- [ ] Submit button works
- [ ] Score is calculated correctly
- [ ] Results page shows:
  - Score and percentage
  - Question-wise breakdown
  - Correct/incorrect answers
  - Explanations for answers

### Dashboard
- [ ] Shows recent test attempts
- [ ] Shows statistics (tests taken, score, etc.)
- [ ] Test history table displays attempts
- [ ] Can view results from history
- [ ] Profile page accessible
- [ ] Can edit profile information

### Questions & Answers
- [ ] All questions display properly
- [ ] Answer options are clearly shown
- [ ] Explanations are visible
- [ ] Different question types work:
  - Multiple choice
  - Numeric answers
  - True/False

## Test Data Available

### Categories (6)
1. **Quantitative Ability**
   - 2 tests (15 questions each)
   - Topics: Arithmetic, Algebra, Geometry

2. **Verbal Ability**
   - 2 tests (12 questions each)
   - Topics: Comprehension, Vocabulary

3. **Logical Reasoning**
   - 2 tests (15 questions each)
   - Topics: Puzzles, Series, Coding

4. **Coding**
   - 2 tests (10 questions each)
   - Topics: Basic Programming, Algorithms

5. **Current Affairs**
   - 2 placeholder tests

6. **Company Tests**
   - 2 placeholder tests

### Sample Questions
Each test contains realistic aptitude questions with:
- Clear question text
- Multiple answer options
- Correct answer marked
- Detailed explanations
- Difficulty level indicated

## Testing with Different Users

### Create Multiple Test Accounts
1. Test User 1: test1@example.com
2. Test User 2: test2@example.com
3. Test User 3: test3@example.com

Each user will have:
- Independent test history
- Individual scores
- Own profile

## Browser Console Debugging

Open browser DevTools (F12) to see:
- Network requests to API endpoints
- Any JavaScript errors
- Console logs marked with `[v0]`

Look for messages like:
- `[v0] Init response: 200` - Database initialized
- `[v0] Seed response: 200` - Sample data loaded
- API call logs for tests and attempts

## Common Test Scenarios

### Scenario 1: Full Test Taking
1. Sign up as new user
2. Navigate to Quantitative Ability
3. Click "Start Test"
4. Answer all 15 questions
5. Review marked questions
6. Submit test
7. View results page
8. Check test history in dashboard

### Scenario 2: Partial Test
1. Start a test
2. Answer 5 questions
3. Submit early
4. View partial score results

### Scenario 3: Test Navigation
1. Start a test
2. Jump to question 10
3. Jump to question 3
4. Go back to first question
5. Verify all navigation works

### Scenario 4: Mark for Review
1. Start test
2. Answer a few questions
3. Click "Mark for Review" on some questions
4. Continue test
5. Review marked questions section at end

## Troubleshooting During Testing

### If signup fails:
- Check if Supabase is connected
- Verify environment variables are set
- Check if database tables exist (visit /api/health)
- Look at console errors in browser DevTools

### If tests don't show:
- Run /setup page to seed sample data
- Check if test_categories table has data
- Check if tests table has data
- Look at API response in Network tab

### If scoring is wrong:
- Verify answers are being saved correctly
- Check if correct answers are marked in database
- Look at test attempt data in console

### If timer doesn't work:
- Check browser console for JavaScript errors
- Verify useEffect hook is running
- Clear browser cache and reload

## API Endpoints for Testing

You can test these endpoints directly:

```bash
# Check database health
curl http://localhost:3000/api/health

# Get all tests
curl http://localhost:3000/api/tests

# Get specific test
curl http://localhost:3000/api/tests/[testId]
```

## Next Steps After Testing

Once you've verified everything works:
1. Review the questions and answers
2. Add more questions via admin panel
3. Create custom test categories
4. Configure payment integration (Razorpay)
5. Set up email verification properly
6. Deploy to production

## Support

If you encounter any issues:
1. Check TROUBLESHOOTING.md
2. Review console logs
3. Visit /setup page to reinitialize
4. Check Supabase dashboard for database status
