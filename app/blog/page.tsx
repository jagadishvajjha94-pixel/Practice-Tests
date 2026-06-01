'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { BlogPost } from '@/lib/types';

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch('/api/blog', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load blog posts');
        const json = (await res.json()) as { posts?: BlogPost[] };
        setPosts(json.posts ?? []);
      } catch (error) {
        console.error('Error fetching blog posts:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Loading blog posts...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">PrepIndia Blog</h1>
          <p className="text-blue-100 text-lg">Tips, tricks, and insights for placement success</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No blog posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <Card className="h-full p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer">
                  {post.featured_image && (
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      className="w-full h-40 object-cover rounded-lg mb-4"
                    />
                  )}
                  <div className="mb-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      {post.category || 'General'}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{post.title}</h2>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {post.content.substring(0, 150)}...
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{post.author}</span>
                    <span>
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString()
                        : ''}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
