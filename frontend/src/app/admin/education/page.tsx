'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { MainNav, NAV_ACTION_BUTTON_CLASSES } from '@/components/MainNav';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const CATEGORIES = [
  { label: 'Tinnitus', value: 'TINNITUS' },
  { label: 'Hearing Loss', value: 'HEARING_LOSS' },
  { label: 'Prevention', value: 'PREVENTION' },
  { label: 'Treatment', value: 'TREATMENT' },
  { label: 'General', value: 'GENERAL' }
];

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  content?: string | null;
  summary?: string | null;
  heroImageUrl?: string | null;
  resourceUrl?: string | null;
  pdfUrl?: string | null;
  pdfFileName?: string | null;
}

function EducationAdminContent() {
  const { logout } = useAuthStore();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('TINNITUS');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/education/admin/all');
      setArticles(response.data.data.articles || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load educational content.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handlePDFUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    if (!pdfFile && !content.trim()) {
      setError('Either PDF file or text content is required.');
      return;
    }

    try {
      setSaving(true);

      if (pdfFile) {
        // Upload with PDF
        const formData = new FormData();
        formData.append('file', pdfFile);
        formData.append('title', title.trim());
        formData.append('category', category);
        if (summary.trim()) {
          formData.append('summary', summary.trim());
        }
        if (content.trim()) {
          formData.append('content', content.trim());
        }
        formData.append('isPublished', isPublished.toString());

        await api.post('/education/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // Create text-only article
        await api.post('/education', {
          title: title.trim(),
          category,
          summary: summary.trim() || undefined,
          content: content.trim(),
          isPublished
        });
      }

      setSuccess('Article created successfully!');
      setTitle('');
      setCategory('TINNITUS');
      setSummary('');
      setContent('');
      setPdfFile(null);
      setIsPublished(false);
      await fetchArticles();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to create article.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async (article: Article) => {
    try {
      await api.put(`/education/${article.id}`, {
        isPublished: !article.isPublished
      });
      await fetchArticles();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to update publication status.');
    }
  };

  const handleDelete = async (articleId: string) => {
    if (!confirm('Delete this article? This cannot be undone.')) return;
    try {
      await api.delete(`/education/${articleId}`);
      await fetchArticles();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to delete article.');
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <MainNav
        title="Admin Portal"
        links={[
          { href: '/admin/dashboard', label: 'Dashboard' },
          { href: '/admin/education', label: 'Education' },
          { href: '/admin/unassigned-tests', label: 'Unassigned Tests' }
        ]}
        rightSlot={
          <button
            onClick={handleLogout}
            className={NAV_ACTION_BUTTON_CLASSES}
          >
            Logout
          </button>
        }
      />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="card mb-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Upload Educational Content</h1>
              <p className="mt-2 text-sm text-gray-500">
                Create content in Google Docs, download as PDF, and upload here. Published articles appear in the patient education library.
              </p>
            </div>
            <div className="flex-shrink-0 rounded-full bg-primary-50 p-3">
              <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handlePDFUpload} className="mt-6 space-y-6">
            <div>
              <label className="label" htmlFor="title">
                Article Title
              </label>
              <input
                id="title"
                type="text"
                className="input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g., Understanding Tinnitus Management"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="category">
                Category
              </label>
              <select
                id="category"
                className="input"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="summary">
                Summary <span className="text-xs text-gray-400">Optional</span>
              </label>
              <textarea
                id="summary"
                className="input min-h-[90px]"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="Brief description shown in article listings (e.g., Learn about common causes and effective management strategies)"
              />
            </div>

            <div>
              <label className="label" htmlFor="content">
                Article Content <span className="text-xs text-gray-400">Recommended for blog-style reading</span>
              </label>
              <textarea
                id="content"
                className="input min-h-[300px]"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Paste the text content from your Google Doc here. This will be displayed in a blog-style format for easy reading. PDF file is optional for download purposes."
              />
              <p className="mt-2 text-xs text-gray-500">
                💡 Tip: Copy text from your Google Doc and paste here for best reading experience. The PDF file below is optional for downloads.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="pdfFile">
                PDF File <span className="text-xs text-gray-400">Optional - for downloads</span>
              </label>
              <input
                id="pdfFile"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => setPdfFile(event.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary-50 file:text-primary-700
                  hover:file:bg-primary-100
                  cursor-pointer"
                required
              />
              {pdfFile && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-700">
                    📄 {pdfFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Maximum file size: 15MB. Only PDF files are accepted.
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300"
                checked={isPublished}
                onChange={(event) => setIsPublished(event.target.checked)}
              />
              <span>
                <span className="font-medium text-gray-900">Publish immediately</span>
                <span className="block text-xs text-gray-500">
                  If unchecked, the article will remain in draft and only visible to admins.
                </span>
              </span>
            </label>

            <button
              type="submit"
              className="btn btn-primary w-full sm:w-auto"
              disabled={saving}
            >
              {saving ? 'Uploading…' : 'Upload PDF Article'}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Recent Posts</h2>
            <span className="text-sm text-gray-500">{articles.length} articles</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
            </div>
          ) : (
            <div className="mt-6 grid gap-5">
              {articles.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No education content yet. Create your first article above.
                </p>
              ) : (
                articles.map((article) => (
                  <div
                    key={article.id}
                    className="grid gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-lg md:grid-cols-[160px_1fr]"
                  >
                    <div className="flex items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                      {article.pdfUrl ? (
                        <div className="flex flex-col items-center justify-center p-4">
                          <svg className="h-16 w-16 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
                            <path d="M14 2v6h6M10 13H8v-2h2v2zm0 2H8v2h2v-2zm4-2h-2v4h2v-4z" fill="white"/>
                          </svg>
                          <p className="mt-2 text-xs font-semibold text-gray-600">PDF</p>
                        </div>
                      ) : article.heroImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={article.heroImageUrl} alt="Hero" className="h-32 w-full object-cover" />
                      ) : (
                        <span className="text-xs font-medium text-gray-400">No image</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900">{article.title}</h3>
                            {article.pdfUrl && (
                              <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                                PDF
                              </span>
                            )}
                          </div>
                          <p className="text-xs uppercase tracking-wide text-primary-600">
                            {article.category.replace('_', ' ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <button
                            onClick={() => handlePublishToggle(article)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                              article.isPublished
                                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {article.isPublished ? 'Published' : 'Draft'}
                          </button>
                          <button
                            onClick={() => handleDelete(article.id)}
                            className="text-xs font-medium text-red-500 hover:text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        {article.summary ? (
                          <p>{article.summary}</p>
                        ) : article.pdfUrl ? (
                          <p className="text-gray-500 italic">
                            PDF Document: {article.pdfFileName || 'Uploaded PDF'}
                          </p>
                        ) : article.content ? (
                          <p className="text-gray-500">
                            {article.content.length > 220
                              ? `${article.content.slice(0, 220)}…`
                              : article.content}
                          </p>
                        ) : (
                          <p className="text-gray-400 italic">No content preview available</p>
                        )}
                        {article.resourceUrl && (
                          <a
                            href={article.resourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-xs font-semibold text-primary-600 hover:text-primary-700"
                          >
                            View attachment →
                          </a>
                        )}
                      </div>

                      <p className="text-xs text-gray-400">
                        Updated {new Date(article.updatedAt).toLocaleString()} • Slug: {article.slug}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function EducationAdminPage() {
  return (
    <ProtectedRoute requireAdmin>
      <EducationAdminContent />
    </ProtectedRoute>
  );
}
