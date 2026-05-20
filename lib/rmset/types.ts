export type RmsetTopic = {
  id: string;
  name: string;
  slug: string;
  question_count: number;
};

export type RmsetPaperRow = {
  id: string;
  title: string;
  description: string | null;
  test_id: string | null;
  topic_ids: string[];
  questions_per_topic: number;
  duration_minutes: number;
  status: 'draft' | 'published' | 'archived';
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RmsetPaperWithTopics = RmsetPaperRow & {
  topics: RmsetTopic[];
  total_questions: number;
};

export type StudentRmsetPaper = {
  paper_id: string;
  test_id: string;
  title: string;
  description: string;
  duration_minutes: number;
  questions_per_topic: number;
  total_questions: number;
  topics: { id: string; name: string; slug: string }[];
  is_live: boolean;
  notice: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

export const RMSET_CATEGORY_SLUG = 'rmset';
export const RMSET_DEFAULT_QUESTIONS_PER_TOPIC = 10;
export const RMSET_DEFAULT_DURATION_MINUTES = 60;
