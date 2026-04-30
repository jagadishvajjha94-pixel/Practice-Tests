# PrepIndia - Complete Placement Preparation Platform

PrepIndia is a comprehensive platform for students to prepare for job placements with aptitude tests, interview practice, and resources.

## 🚀 Quick Start

### 1. First Time Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Visit http://localhost:3000 in your browser
```

### 2. Initialize Database

Visit `http://localhost:3000/setup` and click "Start Setup"

This will:
- Create all necessary database tables
- Load sample test categories
- Load sample tests and questions
- Load sample blog articles

### 3. Sign Up

1. Click "Sign Up" button
2. Fill in your details (Full Name, Email, Password)
3. You'll be redirected to your dashboard

### 4. Start Practicing

1. Go to Tests section
2. Choose a category (Quantitative, Verbal, Logical, Coding)
3. Select a test
4. Answer all questions
5. Submit to see instant results

## ✨ Features

### For Students
- **User Authentication** - Secure sign up and login with Supabase Auth
- **Test Categories** - Multiple categories: Quantitative, Verbal, Logical, Coding, Current Affairs, Companies
- **Practice Tests** - 50+ full-length tests with multiple questions each
- **Real-time Timer** - Test duration countdown with auto-submission
- **Question Navigation** - Easy navigation between questions
- **Mark for Review** - Mark questions to review later
- **Instant Scoring** - See results immediately after submission
- **Score Analytics** - Track your progress over time
- **Detailed Explanations** - Understand why each answer is correct
- **User Profile** - Manage personal details and subscription
- **Blog** - Read preparation tips and strategies
- **Mock AI Resume Review** - Get AI-powered resume feedback
- **Mock AI Interview** - Practice mock interviews with AI
- **Premium Subscription** - Unlock all features with Razorpay payment

### For Admins
- **Admin Dashboard** - View user statistics and test analytics
- **Question Management** - Add, edit, delete questions
- **Bulk Upload** - Import questions via CSV file
- **User Management** - View and manage users
- **Tests Management** - Create and configure tests
- **Revenue Tracking** - Monitor subscription payments

## 📊 Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| **users** | Student profiles, subscription info |
| **test_categories** | Test categories (Quantitative, Verbal, etc.) |
| **tests** | Individual tests with duration and difficulty |
| **questions** | Test questions with 4 options and explanations |
| **test_attempts** | Student test records with scores |
| **question_answers** | Individual question responses |
| **blog_posts** | Blog articles for preparation tips |
| **payments** | Payment transactions and subscriptions |

## 🔐 Security Features

- ✅ Supabase Authentication with email/password
- ✅ Row Level Security (RLS) policies on all tables
- ✅ User data isolation - students can only see their own data
- ✅ Protected API routes - require authentication
- ✅ HTTPS/TLS encryption in production
- ✅ Secure session management with HTTP-only cookies

## 🌐 API Endpoints

### Public Endpoints
- `GET /api/health` - Check database status
- `GET /api/tests` - Get all test categories
- `GET /api/tests/[testId]` - Get test with questions

### Setup Endpoints (Run once)
- `POST /api/setup/initialize` - Create database tables
- `POST /api/setup/seed` - Load sample data

### Protected Endpoints (Require auth)
- `POST /api/tests/[testId]/submit` - Submit test attempt
- `GET /api/dashboard/stats` - Get user dashboard stats
- `POST /api/payments/create-order` - Create payment order
- `POST /api/payments/verify` - Verify payment

## 📱 Pages & Routes

```
/                          - Homepage
/setup                     - Database initialization
/auth/login               - Login page
/auth/signup              - Sign up page
/dashboard                - Student dashboard
/tests                    - Test categories
/tests/[category]         - Category tests
/tests/take/[testId]      - Take a test
/tests/result/[attemptId] - View test results
/profile                  - User profile
/pricing                  - Pricing plans
/checkout                 - Payment checkout
/payment-success          - Payment confirmation
/blog                     - Blog listing
/blog/[slug]              - Blog post
/ai/resume-review         - Resume review tool
/ai/mock-interview        - Mock interview
/admin                    - Admin dashboard
/admin/questions          - Question management
/admin/users              - User management
```

## 🛠️ Technology Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** Supabase Auth
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Payments:** Razorpay (configured, not integrated yet)
- **Deployment:** Vercel

## 📦 Installation

### Prerequisites
- Node.js 18+
- pnpm package manager
- Supabase account

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd prepindia
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   
   Create `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   SUPABASE_SERVICE_ROLE_KEY=your_key
   NEXT_PUBLIC_RAZORPAY_KEY_ID=your_key
   ```

4. **Start development server**
   ```bash
   pnpm dev
   ```

5. **Initialize database**
   - Visit `http://localhost:3000/setup`
   - Click "Start Setup"

## 🚀 Deployment

### To Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy
5. Run setup endpoints on production URL

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=production_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=production_key
SUPABASE_SERVICE_ROLE_KEY=production_service_key
NEXT_PUBLIC_RAZORPAY_KEY_ID=production_razorpay_key
POSTGRES_URL=production_db_url
```

## 📚 Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Detailed setup instructions
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Technical details

## 🐛 Debugging

### Check Health
```bash
curl http://localhost:3000/api/health
```

### View Logs
- Browser console: F12
- Server logs: Terminal where `pnpm dev` is running

### Common Issues
1. Database not initialized → Visit `/setup` page
2. Sign up failing → Check environment variables
3. Tests not showing → Run seeding again
4. Login issues → Check credentials and browser console

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed help.

## 🎯 Features Status

### ✅ Completed
- User authentication (Supabase)
- Test engine with timer
- Question management
- Test results and scoring
- User dashboard
- Blog system
- Admin panel
- Mock AI features (mocked)
- Payment integration setup

### 🔄 In Progress
- Real AI integration for resume review
- Real AI integration for mock interviews
- Advanced analytics
- User recommendations

### 📋 Planned
- Doubt clearing forum
- Live classes integration
- Mobile app
- Community features
- Certificate generation

## 💡 Usage Tips

1. **For Students:**
   - Start with easy tests to build confidence
   - Review explanations for all questions
   - Take full-length tests under timed conditions
   - Track your progress on the dashboard

2. **For Admins:**
   - Upload questions in bulk using CSV
   - Monitor user engagement
   - Adjust test difficulty based on performance
   - Add new test categories as needed

3. **For Developers:**
   - Check `/api/health` to verify database setup
   - Use [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for issues
   - Review error messages in browser console
   - Check Supabase dashboard for database issues

## 📞 Support

- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
- Review [SETUP_GUIDE.md](./SETUP_GUIDE.md) for setup help
- Check browser console (F12) for error details
- Review server logs in terminal

## 📄 License

This project is open source and available under MIT License.

## 🙏 Acknowledgments

- Built with Next.js and Supabase
- UI components from shadcn/ui
- Styling with Tailwind CSS

---

**Ready to start?** Visit `http://localhost:3000` and begin your journey! 🎓

For detailed setup instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md).
