'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';

interface TestResultDetail {
  id: string;
  testId: string;
  testType: string;
  testDate: string;
  videoUrl?: string | null;
  csvUrl?: string | null;
  questionsUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  analysis?: Record<string, unknown> | null;
  summary?: string | null;
  createdAt: string;
  patient?: {
    user?: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
    } | null;
  } | null;
}

const testTypeLabels: Record<string, string> = {
  AUDIOMETRY: 'Audiometry (Mobile)',
  BPPV: 'BPPV',
  LOUDNESS: 'Loudness',
  SPEECH_IN_NOISE: 'Speech In Noise',
  OTHER: 'Other Test'
};

const formatTestType = (type: string) => {
  if (!type) return 'Unknown';
  return testTypeLabels[type] ?? type.charAt(0) + type.slice(1).toLowerCase();
};

const formatMetadataValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  }

  return String(value);
};

function MobileTestDetailContent() {
  const params = useParams();
  const router = useRouter();
  const testResultId = params?.id as string | undefined;

  const [testResult, setTestResult] = useState<TestResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!testResultId) {
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get(`/mobile/test-results/${testResultId}`);
        setTestResult(response.data.data.testResult);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Unable to load test result.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [testResultId]);

  const handleDownload = async (fileType: 'video' | 'csv' | 'questions') => {
    if (!testResultId) {
      return;
    }

    try {
      const key = `${testResultId}:${fileType}`;
      setDownloadingKey(key);
      const response = await api.get(`/mobile/test-results/${testResultId}/download/${fileType}`);
      const url = response.data.data.downloadUrl;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error(`Failed to download ${fileType}:`, err);
    } finally {
      setDownloadingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !testResult) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Test result unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">
            {error || 'We could not find that test result. It may have been removed.'}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-6 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Return to dashboard
          </button>
        </main>
      </div>
    );
  }

  const metadataEntries =
    testResult.metadata && typeof testResult.metadata === 'object' && !Array.isArray(testResult.metadata)
      ? Object.entries(testResult.metadata as Record<string, unknown>)
      : [];

  const analysisEntries =
    testResult.analysis && typeof testResult.analysis === 'object' && !Array.isArray(testResult.analysis)
      ? Object.entries(testResult.analysis as Record<string, unknown>)
      : [];

  const testDate = new Date(testResult.testDate).toLocaleString();
  const uploadedAt = new Date(testResult.createdAt).toLocaleString();
  const patientName = testResult.patient?.user
    ? `${testResult.patient.user.firstName ?? ''} ${testResult.patient.user.lastName ?? ''}`.trim()
    : 'Patient';

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Mobile Test Session</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              {formatTestType(testResult.testType)}
            </h1>
            <p className="mt-1 text-sm text-slate-600">Recorded {testDate}</p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
          >
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto mt-10 max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lg shadow-slate-200/50">
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Test ID</p>
              <p className="text-sm font-semibold text-slate-900">{testResult.testId}</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-indigo-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-indigo-500">Recording</p>
                <p className="mt-1 text-sm text-indigo-900">
                  {testResult.videoUrl ? 'Video available' : 'No video uploaded'}
                </p>
              </div>
              <div className="rounded-2xl bg-sky-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-sky-500">Sensor Data</p>
                <p className="mt-1 text-sm text-sky-900">
                  {testResult.csvUrl ? 'CSV file available' : 'No CSV uploaded'}
                </p>
              </div>
            </div>

            {testResult.summary && (
              <div className="mt-6 rounded-2xl bg-emerald-50/70 px-5 py-4">
                <p className="text-xs uppercase tracking-wide text-emerald-500">Summary</p>
                <p className="mt-2 text-sm text-emerald-900">{testResult.summary}</p>
              </div>
            )}

            {metadataEntries.length > 0 && (
              <div className="mt-6">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Metadata</h2>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  {metadataEntries.map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                        {formatMetadataValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {analysisEntries.length > 0 && (
              <div className="mt-6">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Analysis</h2>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  {analysisEntries.map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                        {formatMetadataValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lg shadow-slate-200/50">
              <h2 className="text-sm font-semibold text-slate-900">Download files</h2>
              <p className="mt-1 text-xs text-slate-500">
                Files are stored securely in AudioSight cloud storage. Download links expire after a few minutes.
              </p>

              <div className="mt-4 space-y-2">
                <button
                  onClick={() => handleDownload('video')}
                  className="w-full rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!testResult.videoUrl || downloadingKey === `${testResult.id}:video`}
                >
                  {downloadingKey === `${testResult.id}:video` ? 'Preparing video…' : 'Download video'}
                </button>
                <button
                  onClick={() => handleDownload('csv')}
                  className="w-full rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-600 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!testResult.csvUrl || downloadingKey === `${testResult.id}:csv`}
                >
                  {downloadingKey === `${testResult.id}:csv` ? 'Preparing CSV…' : 'Download CSV'}
                </button>
                <button
                  onClick={() => handleDownload('questions')}
                  className="w-full rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!testResult.questionsUrl || downloadingKey === `${testResult.id}:questions`}
                >
                  {downloadingKey === `${testResult.id}:questions` ? 'Preparing responses…' : 'Download questions'}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lg shadow-slate-200/50">
              <h2 className="text-sm font-semibold text-slate-900">Session info</h2>
              <dl className="mt-3 space-y-3 text-sm text-slate-600">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Patient</dt>
                  <dd className="mt-1 font-medium text-slate-800">{patientName}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Test type</dt>
                  <dd className="mt-1 font-medium text-slate-800">{formatTestType(testResult.testType)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Recorded</dt>
                  <dd className="mt-1 font-medium text-slate-800">{testDate}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Uploaded</dt>
                  <dd className="mt-1 font-medium text-slate-800">{uploadedAt}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function MobileTestDetailPage() {
  return (
    <ProtectedRoute>
      <MobileTestDetailContent />
    </ProtectedRoute>
  );
}
