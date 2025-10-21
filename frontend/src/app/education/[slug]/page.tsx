'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { MainNav, NAV_ACTION_BUTTON_CLASSES } from '@/components/MainNav';
import { useAuthStore } from '@/lib/store';

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  content?: string | null;
  summary?: string | null;
  pdfUrl?: string | null;
  pdfFileName?: string | null;
  viewCount: number;
  createdAt: string;
  author?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

function ArticleContent() {
  const params = useParams();
  const { logout } = useAuthStore();
  const slug = params?.slug as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;

    const fetchArticle = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await api.get(`/education/${slug}`);
        const articleData = response.data.data.article;
        setArticle(articleData);

        if (articleData.pdfUrl) {
          const pdfResponse = await api.get(`/education/${articleData.id}/pdf`);
          setPdfUrl(pdfResponse.data.data.downloadUrl);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Unable to load article.');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [slug]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MainNav
          title="Patient Portal"
          links={[
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/education', label: 'Education' },
            { href: '/dashboard/settings', label: 'Preferences' }
          ]}
          rightSlot={
            <button onClick={handleLogout} className={NAV_ACTION_BUTTON_CLASSES}>
              Logout
            </button>
          }
        />
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="card border border-red-200 bg-red-50 text-red-600">
            <h2 className="text-lg font-semibold">Article Not Found</h2>
            <p className="mt-2 text-sm">{error || 'The article you are looking for does not exist.'}</p>
            <Link
              href="/education"
              className="mt-6 inline-block text-primary-600 hover:text-primary-700 font-medium"
            >
              ← Back to Education Library
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MainNav
        title="Patient Portal"
        links={[
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/education', label: 'Education' },
          { href: '/dashboard/settings', label: 'Preferences' }
        ]}
        rightSlot={
          <button onClick={handleLogout} className={NAV_ACTION_BUTTON_CLASSES}>
            Logout
          </button>
        }
      />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/education"
            className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            ← Back to Education Library
          </Link>
        </div>

        <div className="card mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-600">
                  {article.category.replace(/_/g, ' ')}
                </span>
                {article.pdfUrl && (
                  <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                    📄 PDF Document
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">{article.title}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                {article.author && (
                  <span>
                    By {article.author.firstName} {article.author.lastName}
                  </span>
                )}
                <span>•</span>
                <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                <span>•</span>
                <span>{article.viewCount} views</span>
              </div>
            </div>
          </div>

          {article.summary && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-lg text-gray-700 leading-relaxed">{article.summary}</p>
            </div>
          )}
        </div>

        {/* Blog-style Content */}
        <article className="card">
          <div className="prose prose-slate prose-lg max-w-none">
            {article.content ? (
              <div className="whitespace-pre-line text-gray-800 leading-relaxed">
                {article.content}
              </div>
            ) : (
              <div className="text-gray-700">
                <p className="text-lg leading-relaxed mb-6">
                  This educational resource provides important information about {article.title.toLowerCase()}.
                  The complete document is available for download below.
                </p>
                <p className="leading-relaxed">
                  Our clinical team has prepared this comprehensive guide to help you better understand your condition
                  and available treatment options. Please review the material carefully and discuss any questions
                  with your healthcare provider.
                </p>
              </div>
            )}
          </div>

          {/* PDF Download Section - if PDF exists */}
          {article.pdfUrl && pdfUrl && (
            <div className="mt-10 p-6 bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    <svg className="h-10 w-10 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
                      <path d="M14 2v6h6M10 13H8v-2h2v2zm0 2H8v2h2v-2zm4-2h-2v4h2v-4z" fill="white"/>
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    📥 Download Complete Resource
                  </h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Access the full PDF document for offline reading and reference
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-700 hover:shadow-lg"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View PDF
                    </a>
                    <a
                      href={pdfUrl}
                      download={article.pdfFileName || 'document.pdf'}
                      className="inline-flex items-center gap-2 rounded-lg bg-white border-2 border-primary-600 px-5 py-2.5 text-sm font-semibold text-primary-600 transition hover:bg-primary-50"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download PDF
                    </a>
                  </div>
                  {article.pdfFileName && (
                    <p className="mt-3 text-xs text-gray-600">
                      📄 {article.pdfFileName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </article>

        <div className="mt-8 card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Was this helpful?</h3>
          <p className="text-sm text-gray-600 mb-4">
            If you have questions about this content, please contact your care team through your patient portal.
          </p>
          <Link
            href="/education"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
          >
            ← Browse more education resources
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function ArticlePage() {
  return <ArticleContent />;
}
