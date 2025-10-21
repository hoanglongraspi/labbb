'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface AudiogramDetail {
  id: string;
  testDate: string;
  fileType: string;
  fileUrl: string;
  leftEarData: Record<string, number> | null;
  rightEarData: Record<string, number> | null;
  summary?: string | null;
  summaryPrompt?: string | null;
  summaryGeneratedAt?: string | null;
  summaryCreator?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  patient?: {
    medicalRecordNumber: string;
  } | null;
  evaluation?: {
    evaluationType: string;
    evaluationDate: string;
    conditionCategory?: string | null;
    conditionSeverity?: string | null;
    notes?: string | null;
  } | null;
}

function AudiogramDetailContent() {
  const params = useParams();
  const router = useRouter();
  const audiogramId = (params?.id as string | undefined) ?? undefined;

  const [audiogram, setAudiogram] = useState<AudiogramDetail | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshingDownload, setRefreshingDownload] = useState(false);

  useEffect(() => {
    if (!audiogramId) {
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const [detailResponse, downloadResponse] = await Promise.all([
          api.get(`/audiograms/${audiogramId}`),
          api.get(`/audiograms/${audiogramId}/download`),
        ]);

        setAudiogram(detailResponse.data.data.audiogram);
        setDownloadUrl(downloadResponse.data.data.downloadUrl);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Unable to load audiogram.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [audiogramId]);

  const refreshDownloadUrl = async () => {
    if (!audiogramId) return;
    try {
      setRefreshingDownload(true);
      const response = await api.get(`/audiograms/${audiogramId}/download`);
      setDownloadUrl(response.data.data.downloadUrl);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to refresh download link.');
    } finally {
      setRefreshingDownload(false);
    }
  };

  const frequencies = useMemo(() => {
    if (!audiogram) return [];
    const leftKeys = audiogram.leftEarData ? Object.keys(audiogram.leftEarData) : [];
    const rightKeys = audiogram.rightEarData ? Object.keys(audiogram.rightEarData) : [];
    const allKeys = Array.from(new Set([...leftKeys, ...rightKeys]));
    return allKeys.sort((a, b) => Number(a) - Number(b));
  }, [audiogram]);

  const chartData = useMemo(() => {
    if (!audiogram || frequencies.length === 0) return null;

    return {
      labels: frequencies,
      datasets: [
        {
          label: 'Left Ear',
          data: frequencies.map((f) => {
            const value = audiogram.leftEarData?.[f];
            if (value === null || value === undefined) return null;
            return typeof value === 'number' ? value : Number(value);
          }),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.3)',
          tension: 0.3,
          spanGaps: true,
        },
        {
          label: 'Right Ear',
          data: frequencies.map((f) => {
            const value = audiogram.rightEarData?.[f];
            if (value === null || value === undefined) return null;
            return typeof value === 'number' ? value : Number(value);
          }),
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.3)',
          tension: 0.3,
          spanGaps: true,
        },
      ],
    };
  }, [audiogram, frequencies]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: 'Audiogram Thresholds (dB HL)',
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Frequency (Hz)',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Hearing Level (dB HL)',
          },
          reverse: true,
          suggestedMin: -10,
          suggestedMax: 120,
        },
      },
    }),
    []
  );

  const renderPreview = () => {
    if (!downloadUrl || !audiogram) {
      return <p className="text-sm text-gray-500">Preview not available.</p>;
    }

    if (audiogram.fileType?.startsWith('image/')) {
      return (
        <div className="relative mx-auto h-[700px] w-full">
          <Image
            src={downloadUrl}
            alt="Audiogram"
            fill
            unoptimized
            className="rounded-lg object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 60vw"
            priority
          />
        </div>
      );
    }

    if (audiogram.fileType?.includes('pdf')) {
      return (
        <iframe
          src={downloadUrl}
          className="h-[700px] w-full rounded-lg"
          title="Audiogram PDF"
        />
      );
    }

    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white/70 p-4 text-sm text-gray-600">
        Inline preview is not supported for this file type. Use the download button below to open
        the file.
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="card border border-red-200 bg-red-50 text-red-600">
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="mt-2 text-sm">{error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-6 text-primary-600 hover:text-primary-700 font-medium"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!audiogram) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audiogram Detail</h1>
            <p className="text-gray-600 mt-1">
              Test Date: {new Date(audiogram.testDate).toLocaleDateString()}
            </p>
          </div>
          <Link href="/dashboard" className="text-primary-600 hover:text-primary-700 font-medium">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Evaluation Result - Top Section */}
        {audiogram.evaluation && (
          <div className="card">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Evaluation Result</h2>
              <span className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
                {audiogram.evaluation.evaluationType}
              </span>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Evaluation Date</p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {new Date(audiogram.evaluation.evaluationDate).toLocaleDateString()}
                </p>
              </div>

              {audiogram.evaluation.conditionCategory && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Condition Category</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {audiogram.evaluation.conditionCategory.replace(/_/g, ' ')}
                  </p>
                </div>
              )}

              {audiogram.evaluation.conditionSeverity && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Severity</p>
                  <p className="mt-1">
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
                      {audiogram.evaluation.conditionSeverity}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {audiogram.evaluation.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Clinical Notes</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {audiogram.evaluation.notes}
                </p>
              </div>
            )}

            {chartData && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Interactive Audiogram</h3>
                <div className="h-[280px]">
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Content - Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)]">
          {/* Left: File Preview */}
          <div className="card space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">File Preview</h2>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="min-h-[700px]">
                {renderPreview()}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
              <button
                onClick={() => downloadUrl && window.open(downloadUrl, '_blank', 'noopener,noreferrer')}
                className="btn btn-primary w-full sm:w-auto"
                disabled={!downloadUrl}
              >
                Download Audiogram
              </button>
              <button
                onClick={refreshDownloadUrl}
                className="text-sm text-gray-600 hover:text-primary-600 font-medium"
                disabled={refreshingDownload}
              >
                {refreshingDownload ? 'Refreshing link…' : 'Refresh download link'}
              </button>
            </div>
          </div>

          {/* Right: Report (LLM Summary) */}
          <div className="card space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">AI-Generated Report</h2>

            {audiogram.summary ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-primary-100 bg-primary-50 p-5">
                  <p className="whitespace-pre-line leading-relaxed text-sm text-primary-900">
                    {audiogram.summary}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">Last updated:</span>
                    <span>
                      {audiogram.summaryGeneratedAt
                        ? new Date(audiogram.summaryGeneratedAt).toLocaleString()
                        : 'Just now'}
                    </span>
                  </div>
                  {audiogram.summaryCreator && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">Prepared by:</span>
                      <span>
                        {audiogram.summaryCreator.firstName} {audiogram.summaryCreator.lastName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <p className="text-sm text-gray-500">
                  A detailed summary will appear here once your care team reviews this audiogram.
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 grid grid-cols-1 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">File Type</span>
                <span className="font-medium">{audiogram.fileType || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Record ID</span>
                <span className="font-mono text-xs text-gray-700">{audiogram.id}</span>
              </div>
              {audiogram.patient?.medicalRecordNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Medical Record Number</span>
                  <span className="font-medium">{audiogram.patient.medicalRecordNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Feedback Section - Bottom */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Feedback</h2>
          <p className="text-sm text-gray-600 mb-4">
            Share your overall experience with this audiogram report, including the evaluation results, AI summary, and file preview. Your feedback helps us improve our services.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
                Comments (Optional)
              </label>
              <textarea
                id="feedback"
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                placeholder="Share your thoughts about the evaluation results, AI summary accuracy, file quality, or any questions you have for your care team..."
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-6 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary-700"
              >
                Submit Feedback
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AudiogramDetailPage() {
  return (
    <ProtectedRoute>
      <AudiogramDetailContent />
    </ProtectedRoute>
  );
}
