# PrepIndia Setup Guide

Welcome to PrepIndia! Follow these steps to get started.

## Prerequisites

- Node.js 18+ installed
- pnpm package manager
- Supabase account and project created
- Environment variables configured

## Quick Start

### Step 1: Environment Variables Setup

Make sure you have these environment variables set in your project:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` - Your Razorpay public key (optional for now)

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Database Initialization

You have two options to initialize the database:

#### Option A: Using the Setup Page (Recommended)

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Visit `http://localhost:3000/setup` in your browser

3. Click "Start Setup" button

4. Wait for the initialization to complete

5. You'll be redirected to the home page

#### Option B: Using API Endpoints

Initialize the database:
```bash
curl -X POST http://localhost:3000/api/setup/initialize
```

Seed sample data:
```bash
curl -X POST http://localhost:3000/api/setup/seed
```

### Step 4: Create Your Account

1. Go to `http://localhost:3000`
2. Click "Sign Up"
3. Fill in your details:
   - Full Name
   - Email
   - Password (min 6 characters)
4. Click "Sign Up"
5. You'll be redirected to your dashboard

### Step 5: Start Taking Tests

1. Click "Tests" in the navigation
2. Choose a test category
3. Click on a test to start
4. Answer all questions
5. Submit to see your results

## Features Available

### For Students
- ✅ User Authentication (Sign up / Sign in)
- ✅ Test Categories (Quantitative, Verbal, Logical, Coding, etc.)
- ✅ Practice Tests with multiple questions
- ✅ Real-time Timer for tests
- ✅ Instant Results and Scoring
- ✅ Question Navigation and Review
- ✅ Test History and Analytics
- ✅ User Profile Management
- ✅ Blog Articles for preparation tips
- ✅ Mock AI Resume Review
- ✅ Mock AI Mock Interview
- ✅ Premium Subscription (Razorpay integration)

### For Admins
- ✅ Admin Dashboard with Analytics
- ✅ Question Management
- ✅ CSV Bulk Upload for Questions
- ✅ User Management
- ✅ Tests Management

## Troubleshooting

### Database Tables Not Created

If you get errors about missing tables:

1. Visit `http://localhost:3000/setup`
2. Click "Start Setup" again
3. Check the browser console for detailed errors

### Sign Up Failing

1. Check that Supabase environment variables are correctly set
2. Ensure the user table exists (run setup again)
3. Check browser console for specific error messages

### Questions Not Showing in Tests

1. Make sure the setup completed successfully
2. Check that test categories and tests were created
3. Visit setup page again if needed

### Payment Integration Not Working

1. Add `NEXT_PUBLIC_RAZORPAY_KEY_ID` to environment variables
2. Restart the development server
3. The payment integration will only work in production with proper Razorpay keys

## Directory Structure

```
app/
├── auth/              # Authentication pages (signup, login)
├── tests/             # Test taking interface
├── dashboard/         # Student dashboard
├── admin/             # Admin panel
├── ai/                # AI features (resume review, mock interview)
├── blog/              # Blog articles
├── api/               # API routes
│   ├── setup/         # Database initialization
│   ├── tests/         # Test-related endpoints
│   ├── payments/      # Payment processing
│   └── admin/         # Admin endpoints
└── page.tsx           # Homepage

lib/
├── supabase.ts        # Supabase client
├── auth.ts            # Authentication utilities
├── constants.ts       # App constants
└── types.ts           # TypeScript types

scripts/
└── 01-initial-schema.sql  # Database schema
```

## Database Schema

### Main Tables

- **users** - Student profiles and subscription info
- **test_categories** - Test categories (Quantitative, Verbal, etc.)
- **tests** - Individual tests
- **questions** - Test questions with options and answers
- **test_attempts** - Student test attempts and scores
- **question_answers** - Individual question responses
- **blog_posts** - Blog articles
- **payments** - Payment transactions

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Sign up new user
- `POST /api/auth/login` - Login user

### Tests
- `GET /api/tests` - Get all test categories
- `GET /api/tests/[testId]` - Get specific test with questions

### Setup
- `POST /api/setup/initialize` - Initialize database tables
- `POST /api/setup/seed` - Seed sample data

## Support & Troubleshooting

For detailed error messages, check:

1. Browser Console (F12)
2. Server logs (terminal where you ran `pnpm dev`)
3. Supabase Dashboard for database logs

## Next Steps

1. Customize test categories and questions in the database
2. Set up Razorpay account for payment integration
3. Add more blog content
4. Customize the homepage with your branding
5. Deploy to production

## Production Deployment

When deploying to production:

1. Set all environment variables in Vercel/hosting dashboard
2. Run the setup API endpoints on the production URL
3. Ensure Supabase is properly configured
4. Update Razorpay keys to production keys
5. Test the complete flow including payments

Enjoy using PrepIndia! 🚀
