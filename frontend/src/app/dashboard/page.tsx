'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { MainNav, NAV_ACTION_BUTTON_CLASSES } from '@/components/MainNav';

type SeverityLevel = 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
type SeverityResultKey =
  | 'hearingLossSeverity'
  | 'tinnitusSeverity'
  | 'hyperacusisSeverity'
  | 'misophoniaSeverity';

type EvaluationResults = Partial<Record<SeverityResultKey, SeverityLevel | null>> & {
  [key: string]: unknown;
};

interface Evaluation {
  id: string;
  evaluationType: string;
  evaluationDate: string;
  evaluatorName?: string | null;
  notes?: string | null;
  conditionCategory?: string | null;
  conditionSeverity?: string | null;
  results?: EvaluationResults | null;
}

interface Audiogram {
  id: string;
  testDate: string;
  fileType: string;
  summary?: string | null;
  evaluation?: {
    id: string;
    evaluationDate: string;
    evaluationType: string;
    conditionCategory?: string | null;
    conditionSeverity?: string | null;
  } | null;
}

interface TestResult {
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
}

interface PatientRecord {
  medicalRecordNumber: string;
  primaryCondition?: string | null;
  evaluations?: Evaluation[];
  audiograms?: Audiogram[];
  testResults?: TestResult[];
  user?: {
    firstName: string;
    lastName: string;
  } | null;
}

const severityKeys: SeverityResultKey[] = [
  'hearingLossSeverity',
  'tinnitusSeverity',
  'hyperacusisSeverity',
  'misophoniaSeverity'
];

const severityLabels: Record<SeverityResultKey, string> = {
  hearingLossSeverity: 'Hearing Loss',
  tinnitusSeverity: 'Tinnitus',
  hyperacusisSeverity: 'Hyperacusis',
  misophoniaSeverity: 'Misophonia'
};

const testTypeLabels: Record<string, string> = {
  AUDIOMETRY: 'Audiometry (Mobile)',
  BPPV: 'BPPV',
  LOUDNESS: 'Loudness',
  SPEECH_IN_NOISE: 'Speech In Noise',
  OTHER: 'Other Test'
};

const getSeverityBadgeStyles = (level: SeverityLevel | null | undefined) => {
  switch (level) {
    case 'CRITICAL':
    case 'SEVERE':
      return 'bg-red-100 text-red-700 ring-1 ring-inset ring-red-200';
    case 'MODERATE':
      return 'bg-orange-100 text-orange-700 ring-1 ring-inset ring-orange-200';
    case 'MILD':
      return 'bg-yellow-100 text-yellow-700 ring-1 ring-inset ring-yellow-200';
    case 'NONE':
      return 'bg-green-100 text-green-700 ring-1 ring-inset ring-green-200';
    default:
      return 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200';
  }
};

const formatSeverityLabel = (level: SeverityLevel | null | undefined) => {
  if (!level || level === 'NONE') {
    return 'Healthy';
  }
  return level.charAt(0) + level.slice(1).toLowerCase();
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

function DashboardContent() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [patientData, setPatientData] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingTestFileKey, setDownloadingTestFileKey] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const response = await api.get('/patients/me');
        setPatientData(response.data.data.patient);
      } catch (error) {
        console.error('Error fetching patient data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      router.push('/');
    }
  };

  const handleDownloadAudiogram = async (audiogramId: string) => {
    try {
      setDownloadingId(audiogramId);
      const response = await api.get(`/audiograms/${audiogramId}/download`);
      const url = response.data.data.downloadUrl;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Failed to download audiogram:', error);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadTestFile = async (
    testResultId: string,
    fileType: 'video' | 'csv' | 'questions'
  ) => {
    try {
      const downloadKey = `${testResultId}:${fileType}`;
      setDownloadingTestFileKey(downloadKey);
      const response = await api.get(`/mobile/test-results/${testResultId}/download/${fileType}`);
      const url = response.data.data.downloadUrl;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error(`Failed to download ${fileType} file:`, error);
    } finally {
      setDownloadingTestFileKey(null);
    }
  };

  const patientName = useMemo(() => {
    if (patientData?.user) {
      return `${patientData.user.firstName} ${patientData.user.lastName}`;
    }
    return user?.firstName ? `${user.firstName}` : 'Patient';
  }, [patientData, user]);

  const totalEvaluations = patientData?.evaluations?.length ?? 0;
  const totalAudiograms = patientData?.audiograms?.length ?? 0;
  const totalTestResults = patientData?.testResults?.length ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <MainNav
        title="Patient Portal"
        links={[
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/education', label: 'Education' },
          { href: '/dashboard/settings', label: 'Preferences' }
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

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-400/90 via-indigo-400/80 to-purple-500/70 text-white shadow-xl">
          <div className="absolute -top-14 -right-16 h-44 w-44 rounded-full bg-white/25 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-indigo-300/30 blur-3xl" />
          <div className="relative p-8 sm:p-12">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/70">Patient Summary</p>
                <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Welcome back, {patientName}!</h1>
                <p className="mt-3 max-w-xl text-sm sm:text-base text-white/85">
                  Review your latest evaluations, download audiograms, and stay on top of your hearing health.
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 rounded-2xl bg-white/15 px-4 py-3 text-sm text-white shadow-sm sm:px-6">
                <span className="text-xs uppercase tracking-wide text-white/70">Medical Record</span>
                <span className="font-medium tracking-wide">
                  {patientData?.medicalRecordNumber || 'Unavailable'}
                </span>
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-white/70">Primary Condition</p>
                <p className="mt-2 text-xl font-semibold capitalize">
                  {patientData?.primaryCondition?.replace('_', ' ') || 'Not specified'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-white/70">Total Evaluations</p>
                <p className="mt-2 text-3xl font-bold">{totalEvaluations}</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-white/70">Audiograms</p>
                <p className="mt-2 text-3xl font-bold">{totalAudiograms}</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-white/70">Mobile Tests</p>
                <p className="mt-2 text-3xl font-bold">{totalTestResults}</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-white/70">Last Evaluation</p>
                <p className="mt-2 text-xl font-semibold">
                  {patientData?.evaluations?.[0]?.evaluationDate
                    ? new Date(patientData.evaluations[0].evaluationDate).toLocaleDateString()
                    : 'No records yet'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Mobile Test Sessions</h2>
              <p className="text-sm text-slate-600">
                Review recordings captured from the mobile app and download the associated files.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
              {totalTestResults} recorded
            </span>
          </div>

          {patientData?.testResults && patientData.testResults.length > 0 ? (
            <div className="mt-6 space-y-4">
              {patientData.testResults.map((test) => {
                const testDate = new Date(test.testDate).toLocaleString();
                const createdAt = new Date(test.createdAt).toLocaleString();
                const metadata =
                  test.metadata && typeof test.metadata === 'object' && !Array.isArray(test.metadata)
                    ? Object.entries(test.metadata as Record<string, unknown>)
                    : [];
                const analysis =
                  test.analysis && typeof test.analysis === 'object' && !Array.isArray(test.analysis)
                    ? Object.entries(test.analysis as Record<string, unknown>)
                    : [];

                return (
                  <article
                    key={test.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{formatTestType(test.testType)}</p>
                        <p className="text-xs text-slate-500">Recorded {testDate}</p>
                        <p className="text-xs text-slate-500">Test ID: {test.testId}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {test.videoUrl && (
                          <button
                            onClick={() => handleDownloadTestFile(test.id, 'video')}
                            className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
                            disabled={downloadingTestFileKey === `${test.id}:video`}
                          >
                            {downloadingTestFileKey === `${test.id}:video` ? 'Preparing video…' : 'Download video'}
                          </button>
                        )}
                        {test.csvUrl && (
                          <button
                            onClick={() => handleDownloadTestFile(test.id, 'csv')}
                            className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600 transition hover:bg-sky-100"
                            disabled={downloadingTestFileKey === `${test.id}:csv`}
                          >
                            {downloadingTestFileKey === `${test.id}:csv` ? 'Preparing data…' : 'Download CSV'}
                          </button>
                        )}
                        {test.questionsUrl && (
                          <button
                            onClick={() => handleDownloadTestFile(test.id, 'questions')}
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100"
                            disabled={downloadingTestFileKey === `${test.id}:questions`}
                          >
                            {downloadingTestFileKey === `${test.id}:questions`
                              ? 'Preparing responses…'
                              : 'Download questions'}
                          </button>
                        )}
                      </div>
                    </div>

                    {test.summary && (
                      <div className="mt-4 rounded-2xl bg-indigo-50/80 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-indigo-500">Summary</p>
                        <p className="mt-1 text-sm text-indigo-900">{test.summary}</p>
                      </div>
                    )}

                    {metadata.length > 0 && (
                      <div className="mt-5">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Metadata</h3>
                        <dl className="mt-2 grid gap-3 sm:grid-cols-2">
                          {metadata.map(([key, value]) => (
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

                    {analysis.length > 0 && (
                      <div className="mt-5">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Analysis</h3>
                        <dl className="mt-2 grid gap-3 sm:grid-cols-2">
                          {analysis.map(([key, value]) => (
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

                    <div className="mt-6 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                      <Link
                        href={`/dashboard/tests/${test.id}`}
                        className="text-indigo-600 transition hover:text-indigo-700"
                      >
                        View session →
                      </Link>
                      <span className="text-xs sm:text-right">Uploaded {createdAt}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
              <span className="text-4xl">📱</span>
              <p className="mt-3 text-base font-semibold text-slate-600">No mobile tests uploaded yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Complete a test in the AudioSight mobile app to see it appear here automatically.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Evaluations</h2>
              <p className="text-sm text-slate-600">
                Track assessment results and see how your condition trends over time.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
              {totalEvaluations} recorded
            </span>
          </div>

          {patientData?.evaluations && patientData.evaluations.length > 0 ? (
            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200/60">
              <div className="hidden bg-slate-50/80 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[180px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,160px)]">
                <span>Date &amp; Type</span>
                <span>Condition Summary</span>
                <span>Notes</span>
                <span className="text-right">Actions</span>
              </div>
              {patientData.evaluations.map((evaluation) => {
                const evaluationDate = new Date(evaluation.evaluationDate).toLocaleDateString();
                const attachedAudiograms =
                  patientData.audiograms?.filter(
                    (audiogram) => audiogram.evaluation?.id === evaluation.id
                  ) ?? [];
                const primaryAudiogram = attachedAudiograms[0];

                return (
                  <div
                    key={evaluation.id}
                    className="border-t border-slate-200/60 bg-white px-4 py-6 md:grid md:grid-cols-[180px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,160px)] md:items-center md:gap-6"
                  >
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-slate-900">{evaluation.evaluationType}</p>
                      <p className="text-xs text-slate-500">{evaluationDate}</p>
                      <p className="text-xs text-slate-500">
                        {evaluation.evaluatorName ? `Evaluator: ${evaluation.evaluatorName}` : 'Evaluator: Clinic team'}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs md:mt-0">
                      {severityKeys.map((key) => {
                        const level = evaluation.results?.[key] as SeverityLevel | undefined;
                        return (
                          <span
                            key={key}
                            className={`inline-flex items-center rounded-full px-3 py-1 font-semibold ${getSeverityBadgeStyles(
                              level
                            )}`}
                          >
                            {severityLabels[key]}: {formatSeverityLabel(level)}
                          </span>
                        );
                      })}
                    </div>

                    <div className="mt-4 text-sm text-slate-600 md:mt-0">
                      {evaluation.notes ? (
                        <p className="line-clamp-3">{evaluation.notes}</p>
                      ) : (
                        <p className="text-xs text-slate-400">No notes recorded for this visit.</p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-col items-start gap-2 text-sm font-medium md:mt-0 md:items-end">
                      {primaryAudiogram ? (
                        <>
                          <Link
                            href={`/dashboard/audiograms/${primaryAudiogram.id}`}
                            className="text-indigo-600 hover:text-indigo-700"
                          >
                            View audiogram →
                          </Link>
                          <button
                            onClick={() => handleDownloadAudiogram(primaryAudiogram.id)}
                            className="text-left text-slate-600 transition-colors hover:text-indigo-600"
                            disabled={downloadingId === primaryAudiogram.id}
                          >
                            {downloadingId === primaryAudiogram.id ? 'Preparing…' : 'Download file'}
                          </button>
                          {attachedAudiograms.length > 1 && (
                            <span className="text-xs text-slate-400">
                              + {attachedAudiograms.length - 1} additional file
                              {attachedAudiograms.length - 1 === 1 ? '' : 's'}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">No audiogram attached</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
              <span className="text-4xl">🩺</span>
              <p className="mt-3 text-base font-semibold text-slate-600">
                No clinical evaluations recorded yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Evaluations scheduled by your clinician will appear here for easy reference.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
