'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BlogPost } from '@/lib/types';
import ReactMarkdown from 'react-markdown';

export default function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/blog/${encodeURIComponent(slug)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Post not found');
        const json = (await res.json()) as { post?: BlogPost };
        setPost(json.post ?? null);
      } catch (error) {
        console.error('Error fetching blog post:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Loading post...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <p className="text-gray-600 mb-4">Blog post not found</p>
          <Link href="/blog">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Back to Blog
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link href="/blog" className="text-blue-600 hover:text-blue-700 font-medium">
          ← Back to Blog
        </Link>
      </div>

      <div className="bg-white border-b border-gray-200 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="mb-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded">
              {post.category || 'General'}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
          <div className="flex items-center gap-4 text-gray-600">
            <span>{post.author}</span>
            <span>•</span>
            <span>
              {post.published_at
                ? new Date(post.published_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {post.featured_image && (
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-96 object-cover rounded-lg mb-8"
          />
        )}

        <div className="bg-white rounded-lg p-8 prose prose-sm max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-6 mb-4 text-gray-900" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mt-6 mb-3 text-gray-900" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-xl font-bold mt-4 mb-2 text-gray-900" {...props} />,
              p: ({ node, ...props }) => <p className="text-gray-600 mb-4 leading-relaxed" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 text-gray-600" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 text-gray-600" {...props} />,
              li: ({ node, ...props }) => <li className="mb-2 text-gray-600" {...props} />,
              blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 my-4" {...props} />,
              code: ({ node, ...props }) => <code className="bg-gray-100 px-2 py-1 rounded text-red-600 font-mono" {...props} />,
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 flex gap-2 flex-wrap">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-600 text-white py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Continue Your Learning Journey</h2>
          <p className="mb-6">Check out more helpful resources on our blog</p>
          <Link href="/blog">
            <Button className="bg-white text-blue-600 hover:bg-gray-100">
              Read More Articles
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
