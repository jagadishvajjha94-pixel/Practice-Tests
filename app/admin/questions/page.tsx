'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Question, TestCategory } from '@/lib/types';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function QuestionsManagementPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<TestCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    question_text: '',
    category_id: '',
    difficulty: 'medium',
    type: 'MCQ',
    options: '',
    correct_answer: '',
    explanation: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/auth/login');
          return;
        }

        // Check admin
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!adminUser) {
          router.push('/dashboard');
          return;
        }

        setIsAdmin(true);

        // Fetch data
        const { data: questionsData } = await supabase
          .from('questions')
          .select('*')
          .order('created_at', { ascending: false });

        const { data: categoriesData } = await supabase
          .from('test_categories')
          .select('*');

        setQuestions(questionsData || []);
        setCategories(categoriesData || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());

      const newQuestions = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const questionObj: any = {};

        headers.forEach((header, index) => {
          questionObj[header] = values[index];
        });

        if (questionObj.question_text && questionObj.category_id && questionObj.correct_answer) {
          newQuestions.push({
            question_text: questionObj.question_text,
            category_id: questionObj.category_id,
            difficulty: questionObj.difficulty || 'medium',
            type: questionObj.type || 'MCQ',
            options: questionObj.options ? JSON.parse(questionObj.options) : null,
            correct_answer: questionObj.correct_answer,
            explanation: questionObj.explanation || null,
            tags: questionObj.tags ? JSON.parse(questionObj.tags) : null,
          });
        }
      }

      if (newQuestions.length > 0) {
        const { error } = await supabase.from('questions').insert(newQuestions);

        if (error) throw error;

        // Refresh questions
        const { data } = await supabase
          .from('questions')
          .select('*')
          .order('created_at', { ascending: false });
        setQuestions(data || []);

        alert(`${newQuestions.length} questions imported successfully`);
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      alert('Error importing questions');
    } finally {
      setUploading(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from('questions').insert({
        question_text: formData.question_text,
        category_id: formData.category_id,
        difficulty: formData.difficulty,
        type: formData.type,
        options: formData.type === 'MCQ' ? formData.options.split('|').map(o => o.trim()) : null,
        correct_answer: formData.correct_answer,
        explanation: formData.explanation,
      });

      if (error) throw error;

      // Refresh
      const { data } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });
      setQuestions(data || []);

      setFormData({
        question_text: '',
        category_id: '',
        difficulty: 'medium',
        type: 'MCQ',
        options: '',
        correct_answer: '',
        explanation: '',
      });
      setShowAddForm(false);

      alert('Question added successfully');
    } catch (error) {
      alert('Error adding question');
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question_text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || q.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Question Management</h1>
            <Link href="/admin">
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Controls */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Add Question Manually
            </Button>

            <label className="inline-block">
              <Button variant="outline" className="cursor-pointer">
                Import from CSV
              </Button>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex gap-4">
            <Input
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Question</h2>
            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                <textarea
                  value={formData.question_text}
                  onChange={(e) => setFormData({...formData, question_text: e.target.value})}
                  placeholder="Enter question..."
                  required
                  className="w-full border border-gray-300 rounded-lg p-2 min-h-24"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    required
                    className="w-full border border-gray-300 rounded-lg p-2"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="MCQ">MCQ</option>
                  <option value="numeric">Numeric</option>
                  <option value="verbal">Verbal</option>
                </select>
              </div>

              {formData.type === 'MCQ' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Options (separate with |)</label>
                  <Input
                    value={formData.options}
                    onChange={(e) => setFormData({...formData, options: e.target.value})}
                    placeholder="Option 1 | Option 2 | Option 3"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                <Input
                  value={formData.correct_answer}
                  onChange={(e) => setFormData({...formData, correct_answer: e.target.value})}
                  placeholder="Correct answer"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Explanation</label>
                <textarea
                  value={formData.explanation}
                  onChange={(e) => setFormData({...formData, explanation: e.target.value})}
                  placeholder="Explain why this is correct..."
                  className="w-full border border-gray-300 rounded-lg p-2 min-h-20"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Add Question
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Questions List */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Question</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Difficulty</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-500">
                      No questions found
                    </td>
                  </tr>
                ) : (
                  filteredQuestions.map((q) => {
                    const category = categories.find(c => c.id === q.category_id);
                    return (
                      <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">{q.question_text.substring(0, 50)}...</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{category?.name}</td>
                        <td className="py-3 px-4 text-sm"><span className="px-2 py-1 bg-gray-100 rounded text-gray-700 capitalize">{q.difficulty}</span></td>
                        <td className="py-3 px-4 text-sm text-gray-600">{q.type}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-sm text-gray-600 mt-4">
          Total: {filteredQuestions.length} / {questions.length} questions
        </p>
      </div>
    </div>
  );
}
