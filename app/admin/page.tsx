'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTests: 0,
    activeUsers: 0,
    avgTestsPerUser: 0,
  });

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/auth/login');
          return;
        }

        // Check if user is admin
        const { data: adminUser, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error || !adminUser) {
          router.push('/dashboard');
          return;
        }

        setIsAdmin(true);

        // Fetch statistics
        const { data: users } = await supabase
          .from('users')
          .select('*');

        const { data: attempts } = await supabase
          .from('test_attempts')
          .select('*');

        const totalUsers = users?.length || 0;
        const totalTests = attempts?.length || 0;

        setStats({
          totalUsers,
          totalTests,
          activeUsers: totalUsers,
          avgTestsPerUser: totalUsers > 0 ? Number((totalTests / totalUsers).toFixed(1)) : 0,
        });
      } catch (error) {
        console.error('Error checking admin access:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading admin panel...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Access denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">Total Users</p>
            <p className="text-4xl font-bold text-blue-600">{stats.totalUsers}</p>
          </Card>
          <Card className="p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">Active Users</p>
            <p className="text-4xl font-bold text-purple-600">{stats.activeUsers}</p>
          </Card>
          <Card className="p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">Tests Taken</p>
            <p className="text-4xl font-bold text-green-600">{stats.totalTests}</p>
          </Card>
          <Card className="p-6">
            <p className="text-gray-600 text-sm font-medium mb-2">Avg Tests / User</p>
            <p className="text-4xl font-bold text-orange-600">{stats.avgTestsPerUser}</p>
          </Card>
        </div>

        {/* Navigation Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 hover:shadow-lg transition cursor-pointer">
            <Link href="/admin/questions">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Questions</h2>
              <p className="text-gray-600 mb-4">Manage question bank, add new questions, and import from CSV</p>
              <div className="text-blue-600 font-medium">Manage Questions →</div>
            </Link>
          </Card>

          <Card className="p-6 hover:shadow-lg transition cursor-pointer">
            <Link href="/admin/tests">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Tests</h2>
              <p className="text-gray-600 mb-4">Create test sets, assign questions, and manage test settings</p>
              <div className="text-blue-600 font-medium">Manage Tests →</div>
            </Link>
          </Card>

          <Card className="p-6 hover:shadow-lg transition cursor-pointer">
            <Link href="/admin/users">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Users</h2>
              <p className="text-gray-600 mb-4">View users and track learning analytics</p>
              <div className="text-blue-600 font-medium">Manage Users →</div>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
