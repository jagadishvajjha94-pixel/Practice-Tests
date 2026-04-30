export const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';

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
  { id: 'psychometric', name: 'Psychometric Tests', icon: '🎭' },
  { id: 'swarx', name: 'SWARX Communication', icon: '🗣️' },
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
