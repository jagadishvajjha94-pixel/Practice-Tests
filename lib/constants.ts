export const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';

/** Guest users can practise this many questions per test without signing in; full paper unlocks after login. */
export const PRACTICE_PREVIEW_QUESTION_LIMIT = 10;

/** Psychometric paper: full attempt after sign-in (must match take-test runtime). */
export const PSYCHOMETRIC_FULL_QUESTIONS = 200;
export const PSYCHOMETRIC_FULL_MINUTES = 30;
/** Guest preview timer for psychometric (questions use PRACTICE_PREVIEW_QUESTION_LIMIT). */
export const PSYCHOMETRIC_GUEST_MINUTES = 5;

/** All India competitive MCQ exam — `/tests/competitive-exam`. */
export const COMPETITIVE_ALL_INDIA_QUESTIONS = 60;
export const COMPETITIVE_ALL_INDIA_MINUTES = 90;

// Payment Plans
export const PAYMENT_AMOUNTS = {
  premium: 499, // ₹499 per month
};

export const PRICING_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    duration: null,
    features: [
      '5 free tests per month',
      'Basic question bank access',
      'View explanations',
      'Progress tracking',
    ],
  },
  premium: {
    name: 'Premium',
    price: 499,
    duration: '1 month',
    features: [
      'Unlimited tests',
      'Complete question bank',
      'Mock interviews with AI',
      'Resume review with AI',
      'Performance analytics',
      'Custom study plans',
      'Priority support',
    ],
  },
};

export const TEST_CATEGORIES = [
  { id: 'psychometric', name: 'Psychometric Tests', icon: '🧠' },
  { id: 'swarx', name: 'SWARX Communication', icon: '🗣️' },
];

/** All student-facing practice modules shown on home + tests hub. */
export const PRACTICE_HUB_ITEMS = [
  {
    id: 'psychometric',
    href: '/tests/psychometric',
    name: 'Psychometric Tests',
    icon: '🧠',
    description:
      'Quick visual and pattern drills — think fast in seconds per item, not long reading.',
    accent: 'default' as const,
  },
  {
    id: 'swarx',
    href: '/tests/swarx',
    name: 'SWARX Communication',
    icon: '🗣️',
    description: 'Grammar, vocal practice, and situation-based English drills.',
    accent: 'default' as const,
  },
  {
    id: 'ai-interview',
    href: '/ai/interview',
    name: 'AI Interview Studio',
    icon: '🎙️',
    badge: 'Voice · Resume',
    description:
      'Resume analysis plus a spoken mock interview — AI asks aloud and listens to your answers.',
    accent: 'blue' as const,
  },
  {
    id: 'competitive-exam',
    href: '/tests/competitive-exam',
    name: 'All India Competitive Paper',
    icon: '📝',
    badge: '60 Q · 90 min',
    description:
      '60 MCQs · 90 minutes · Maths, Science, Chemistry, Aptitude, Reasoning, Logic, English & Computer.',
    accent: 'emerald' as const,
  },
  {
    id: 'programming',
    href: '/tests/programming',
    name: 'Programming',
    icon: '💻',
    badge: '60 min · 7 languages',
    description:
      'HackerRank-style timed test: problem panel, Monaco editor, run & submit. Python, Java, C, C++, JavaScript, Go, C#.',
    accent: 'blue' as const,
    cta: 'Open programming test →',
  },
];

export const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const;

export const QUESTION_TYPES = ['MCQ', 'numeric', 'verbal'] as const;

export const SUBSCRIPTION_STATUSES = ['free', 'premium', 'cancelled'] as const;

export const TEST_STATUS = ['in_progress', 'completed', 'abandoned'] as const;

export const PAYMENT_STATUS = ['pending', 'success', 'failed'] as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  DASHBOARD: '/dashboard',
  TEST_CATEGORIES: '/tests',
  TEST: (testId: string) => `/tests/${testId}`,
  TEST_RESULT: (attemptId: string) => `/tests/result/${attemptId}`,
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_QUESTIONS: '/admin/questions',
  ADMIN_TESTS: '/admin/tests',
  ADMIN_USERS: '/admin/users',
  BLOG: '/blog',
  BLOG_POST: (slug: string) => `/blog/${slug}`,
  PRICING: '/pricing',
  CHECKOUT: '/checkout',
  PROFILE: '/profile',
  AI_INTERVIEW: '/ai/interview',
};

export const API_ROUTES = {
  QUESTIONS: '/api/questions',
  TESTS: '/api/tests',
  ATTEMPTS: '/api/attempts',
  PAYMENTS: '/api/payments',
  USERS: '/api/users',
  ADMIN: '/api/admin',
};

export const TOAST_MESSAGES = {
  SUCCESS: 'Success',
  ERROR: 'Error',
  LOADING: 'Loading...',
};
