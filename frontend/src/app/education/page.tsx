'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { MainNav, NAV_ACTION_BUTTON_CLASSES } from '@/components/MainNav';
import { useAuthStore } from '@/lib/store';

type EducationArticle = {
  id: string;
  title: string;
  slug: string;
  category: string;
  content?: string | null;
  viewCount: number;
  createdAt: string;
  author?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  summary?: string | null;
  heroImageUrl?: string | null;
  resourceUrl?: string | null;
  pdfUrl?: string | null;
  pdfFileName?: string | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const CATEGORIES = [
  { label: 'All Topics', value: 'ALL' },
  { label: 'Tinnitus', value: 'TINNITUS' },
  { label: 'Hearing Loss', value: 'HEARING_LOSS' },
  { label: 'Prevention', value: 'PREVENTION' },
  { label: 'Treatment', value: 'TREATMENT' },
  { label: 'General Knowledge', value: 'GENERAL' },
];

export default function EducationPage() {
  const { logout } = useAuthStore();
  const [articles, setArticles] = useState<EducationArticle[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

  const fetchArticles = useCallback(
    async (opts?: { page?: number; append?: boolean }) => {
      const page = opts?.page ?? 1;
      const append = opts?.append ?? false;

      setLoading(true);
      setError('');

      try {
        const response = await api.get('/education', {
          params: {
            page,
            limit: 6,
            search: searchTerm.trim() || undefined,
            category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          },
        });

        const { articles: incoming, pagination: pageInfo } = response.data.data as {
          articles: EducationArticle[];
          pagination: Pagination;
        };

        setPagination(pageInfo);
        setArticles((prev) => (append ? [...prev, ...incoming] : incoming));
      } catch (err: any) {
        setError(err.response?.data?.message || 'Unable to load education resources.');
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    },
    [searchTerm, selectedCategory],
  );

  useEffect(() => {
    fetchArticles({ page: 1, append: false }).catch(() => undefined);
  }, [fetchArticles]);

  const allowLoadMore = useMemo(() => {
    if (!pagination) return false;
    return pagination.page < pagination.totalPages;
  }, [pagination]);

  const toggleExpanded = (articleId: string) => {
    setExpandedArticleId((current) => (current === articleId ? null : articleId));
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    fetchArticles({ page: 1, append: false }).catch(() => undefined);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setExpandedArticleId(null);
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

  const renderArticleExcerpt = (article: EducationArticle) => {
    if (article.pdfUrl) {
      // PDF-based article
      return (
        <p className="text-gray-600">
          {article.summary || 'View the complete PDF document for detailed information.'}
        </p>
      );
    }

    // Text-based article
    const isExpanded = expandedArticleId === article.id;
    const maxChars = 320;
    const baseText = article.summary?.trim() || article.content?.replace(/<[^>]+>/g, '') || '';
    const displayContent =
      isExpanded || baseText.length <= maxChars
        ? baseText
        : `${baseText.slice(0, maxChars)}…`;

    return (
      <>
        <p className="text-gray-600 whitespace-pre-line">{displayContent}</p>
        {baseText.length > maxChars && (
          <button
            type="button"
            className="mt-3 text-primary-600 hover:text-primary-700 text-sm font-medium"
            onClick={() => toggleExpanded(article.id)}
          >
            {isExpanded ? 'Show Less' : 'Read More'}
          </button>
        )}
      </>
    );
  };

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
      <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl sm:p-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Patient Education</p>
              <h1 className="mt-3 text-4xl font-semibold text-slate-900 sm:text-5xl">
                Empowering you with knowledge for confident care decisions
              </h1>
              <p className="mt-4 max-w-3xl text-sm sm:text-base text-slate-600">
                Explore trusted resources prepared by our clinical team to help you understand symptoms,
                treatment options, and everyday strategies for hearing health.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: '📘', label: 'Clinician curated', sub: 'Evidence-based articles' },
                { icon: '🎧', label: 'Focused insights', sub: 'Tinnitus & hearing health' },
                { icon: '🧭', label: 'Actionable guides', sub: 'Support for day-to-day care' }
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600 shadow-sm"
                >
                  <div className="text-2xl">{item.icon}</div>
                  <p className="mt-2 font-semibold text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="card mb-10">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="label" htmlFor="education-search">
                Search resources
              </label>
              <input
                id="education-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search for topics, symptoms, or keywords"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="education-category">
                Filter by category
              </label>
              <select
                id="education-category"
                className="input"
                value={selectedCategory}
                onChange={(event) => handleCategoryChange(event.target.value)}
              >
                {CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary sm:w-40">
              Search
            </button>
          </form>
        </div>

        {initialLoad && loading ? (
          <div className="flex justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
          </div>
        ) : error ? (
          <div className="card border border-red-200 bg-red-50 text-red-600">
            <p className="font-semibold">We couldn&apos;t load the education library.</p>
            <p className="mt-2 text-sm">{error}</p>
            <button
              type="button"
              className="mt-4 text-primary-600 hover:text-primary-700 font-medium text-sm"
              onClick={() => fetchArticles({ page: 1, append: false })}
            >
              Try again
            </button>
          </div>
        ) : articles.length === 0 ? (
          <div className="card text-center text-gray-500">
            <p>No education resources match your filters just yet. Try adjusting your search.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              {articles.map((article) => (
                <article
                  key={article.id}
                  className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg md:grid-cols-[160px_1fr]"
                >
                  <div className="flex items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    {article.pdfUrl ? (
                      <div className="flex flex-col items-center justify-center p-4">
                        <svg className="h-20 w-20 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
                          <path d="M14 2v6h6M10 13H8v-2h2v2zm0 2H8v2h2v-2zm4-2h-2v4h2v-4z" fill="white"/>
                        </svg>
                        <p className="mt-2 text-xs font-semibold text-slate-600">PDF Article</p>
                      </div>
                    ) : article.heroImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={article.heroImageUrl} alt={article.title} className="h-36 w-full object-cover" />
                    ) : (
                      <span className="text-xs font-medium text-slate-400">No image provided</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-wide text-primary-600">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 font-semibold text-primary-600">
                          {article.category.replace(/_/g, ' ')}
                        </span>
                        {article.pdfUrl && (
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                            PDF
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400">{new Date(article.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold text-slate-900">{article.title}</h2>
                      {article.author && (
                        <p className="text-sm text-slate-500">
                          By {article.author.firstName} {article.author.lastName}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-slate-600 space-y-2">{renderArticleExcerpt(article)}</div>
                    {article.resourceUrl && (
                      <a
                        href={article.resourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-primary-600 hover:text-primary-700"
                      >
                        View attached resource →
                      </a>
                    )}
                    <div className="mt-auto flex items-center justify-between text-xs text-slate-400">
                      <span>Views: {article.viewCount}</span>
                      <Link
                        href={`/education/${article.slug}`}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        {article.pdfUrl ? 'View PDF →' : 'Open Article →'}
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {allowLoadMore && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={loading}
                  onClick={() =>
                    fetchArticles({ page: (pagination?.page || 1) + 1, append: true }).catch(
                      () => undefined,
                    )
                  }
                >
                  {loading ? 'Loading...' : 'Load More Articles'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
