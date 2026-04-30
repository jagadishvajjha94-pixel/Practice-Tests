export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  subscription_status: 'free' | 'premium' | 'cancelled';
  subscription_end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  order: number | null;
  created_at: string;
}

export interface Question {
  id: string;
  category_id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_text: string;
  type: 'MCQ' | 'numeric' | 'verbal';
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  /** Raw DB extras for seeded MCQs (option_a–d). */
  question_type?: string;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
}

export interface Test {
  id: string;
  name: string;
  category_id: string;
  duration: number;
  total_questions: number;
  passing_score: number | null;
  description: string | null;
  difficulty_level: 'easy' | 'medium' | 'hard' | null;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestQuestion {
  id: string;
  test_id: string;
  question_id: string;
  order: number;
  created_at: string;
}

export interface TestAttempt {
  id: string;
  user_id: string;
  test_id: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  answers: Record<string, any> | null;
  time_taken: number | null;
  status: 'in_progress' | 'completed' | 'abandoned';
  created_at: string;
}

export interface TestAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  user_answer: string | null;
  is_correct: boolean | null;
  time_spent: number | null;
  created_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  author: string | null;
  category: string | null;
  featured_image: string | null;
  tags: string[] | null;
  published_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator';
  permissions: Record<string, any> | null;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed';
  plan_type: string | null;
  created_at: string;
  updated_at: string;
}
