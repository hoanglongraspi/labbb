'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { MainNav, NAV_ACTION_BUTTON_CLASSES } from '@/components/MainNav';

interface DashboardStats {
  totalPatients: number;
  totalEvaluations: number;
  totalAudiograms: number;
}

type SeverityLevel = 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE' | 'CRITICAL';

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

const statTileClasses = [
  'bg-slate-100 text-slate-900 border border-slate-200 shadow-sm',
  'bg-slate-100 text-slate-900 border border-slate-200 shadow-sm',
  'bg-slate-100 text-slate-900 border border-slate-200 shadow-sm'
];

function AdminDashboardContent() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [patients, setPatients] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    totalEvaluations: 0,
    totalAudiograms: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get('/patients', {
          params: {
            limit: 50,
            search: searchQuery
          }
        });
        const patientsData = response.data.data.patients || [];
        const totalPatients = response.data.data.pagination?.total ?? patientsData.length;
        const totalEvaluations = patientsData.reduce(
          (sum: number, patient: any) => sum + (patient._count?.evaluations || 0),
          0
        );
        const totalAudiograms = patientsData.reduce(
          (sum: number, patient: any) => sum + (patient._count?.audiograms || 0),
          0
        );

        setPatients(patientsData);
        setStats({
          totalPatients,
          totalEvaluations,
          totalAudiograms
        });
      } catch (err: any) {
        setError(err.response?.data?.message || 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchQuery]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      logout();
      router.push('/');
    }
  };

  const adminName = useMemo(() => {
    if (!user) return 'Administrator';
    if (user.firstName || user.lastName) {
      return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    }
    return user.email ?? 'Administrator';
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
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

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-xl sm:p-12">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Admin Overview</p>
              <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">Welcome back, {adminName}</h1>
              <p className="mt-3 max-w-xl text-sm sm:text-base text-slate-600">
                Track patient engagement, monitor evaluations, and keep the care team synchronized.
              </p>
            </div>
            <Link
              href="/admin/patients/new"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-slate-700"
            >
              <span aria-hidden>＋</span> Add Patient
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Active Patients', value: stats.totalPatients },
              { label: 'Total Evaluations', value: stats.totalEvaluations },
              { label: 'Total Audiograms', value: stats.totalAudiograms }
            ].map((item, index) => (
              <div
                key={item.label}
                className={`rounded-2xl px-5 py-5 ${statTileClasses[index]}`}
              >
                <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow">
            {error}
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/50">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Patients</h2>
                <p className="text-sm text-slate-600">
                  Search and view all patient records and their engagement.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search by name, email, or medical record..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80">
            <div className="hidden bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[1.2fr_1fr_0.9fr_1fr_1fr_120px]">
              <span>Patient</span>
              <span className="text-center">Medical Record</span>
              <span className="text-center">Status</span>
              <span className="text-center">Condition</span>
              <span className="text-center">Activity</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y divide-slate-200 bg-white">
              {patients.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-slate-500">
                  No patients to display yet. Add a patient to get started.
                </div>
              ) : (
                patients.map((patient) => {
                  const evaluations = patient._count?.evaluations ?? 0;
                  const audiograms = patient._count?.audiograms ?? 0;
                  const mobileTests = patient._count?.testResults ?? 0;
                  const hasAccount = !!patient.user;
                  const isActive = patient.user?.isActive ?? false;
                  const statusLabel = hasAccount ? (isActive ? 'Active' : 'Pending') : '';
                  const statusClasses = isActive
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-100 text-amber-700 border border-amber-200';

                  // Get the latest evaluation results
                  const latestEvaluation = patient.evaluations?.[0];
                  const hasEvaluationResults = latestEvaluation != null;

                  return (
                    <div
                      key={patient.id}
                      className="grid gap-4 px-6 py-5 text-sm text-slate-700 md:grid-cols-[1.2fr_1fr_0.9fr_1fr_1fr_120px] md:items-center hover:bg-slate-50/70 transition"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {hasAccount
                            ? `${patient.user?.firstName} ${patient.user?.lastName}`
                            : 'Unassigned'}
                        </p>
                        <p className="text-xs text-slate-500">{patient.user?.email || 'No email on file'}</p>
                      </div>
                      <p className="font-mono text-xs text-slate-600 text-center">{patient.medicalRecordNumber}</p>
                      <div className="text-xs font-semibold text-slate-500 flex justify-center">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold gap-2 ${statusClasses}`}>
                          {statusLabel || 'No account'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 text-xs items-center">
                        {hasEvaluationResults ? (
                          <>
                            {(() => {
                              // Get from results JSON field
                              const results = latestEvaluation.results as any;
                              const conditions = [
                                { key: 'hearingLoss', label: 'Hearing', severity: results?.hearingLossSeverity || 'NONE' },
                                { key: 'tinnitus', label: 'Tinnitus', severity: results?.tinnitusSeverity || 'NONE' },
                                { key: 'hyperacusis', label: 'Hyperacusis', severity: results?.hyperacusisSeverity || 'NONE' },
                                { key: 'misophonia', label: 'Misophonia', severity: results?.misophoniaSeverity || 'NONE' }
                              ];

                              // Sort by severity: CRITICAL/SEVERE → MODERATE → MILD → NONE
                              const severityOrder: Record<string, number> = {
                                'CRITICAL': 0,
                                'SEVERE': 1,
                                'MODERATE': 2,
                                'MILD': 3,
                                'NONE': 4
                              };

                              const sortedConditions = conditions.sort((a, b) => {
                                const orderA = severityOrder[a.severity] ?? 5;
                                const orderB = severityOrder[b.severity] ?? 5;
                                return orderA - orderB;
                              });

                              return (
                                <>
                                  {sortedConditions.map((condition) => (
                                    <span key={condition.key} className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${getSeverityBadgeStyles(condition.severity as SeverityLevel)}`}>
                                      {condition.label}: {formatSeverityLabel(condition.severity as SeverityLevel)}
                                    </span>
                                  ))}
                                </>
                              );
                            })()}
                          </>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200">
                            Test needed
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-center gap-1 text-xs text-slate-500">
                        <span className="inline-flex items-center rounded-full bg-purple-50 px-3 py-1 font-semibold text-purple-600">
                          {mobileTests} Mobile Test{mobileTests !== 1 ? 's' : ''}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-600">
                          {evaluations} Clinical Test{evaluations !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="text-right">
                        <Link
                          href={`/admin/patients/${patient.id}`}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 underline-offset-4 hover:underline"
                        >
                          View →
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
