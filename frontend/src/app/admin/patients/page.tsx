'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { MainNav, NAV_ACTION_BUTTON_CLASSES } from '@/components/MainNav';
import api from '@/lib/api';

interface PatientUser {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
}

interface PatientCounts {
  evaluations: number;
  audiograms: number;
}

interface PatientListItem {
  id: string;
  medicalRecordNumber: string;
  primaryCondition?: string | null;
  createdAt: string;
  user?: PatientUser | null;
  _count?: PatientCounts;
}

const statCardClasses = Array(3).fill('bg-slate-100 text-slate-900 border border-slate-200 shadow-sm');

function PatientsContent() {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, evaluations: 0, audiograms: 0 });

  const fetchPatients = async (search?: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/patients', {
        params: { limit: 50, search: search || undefined }
      });
      const data = response.data.data;
      const list: PatientListItem[] = data.patients || [];
      setPatients(list);
      setStats({
        total: data.pagination?.total || list.length,
        evaluations: list.reduce((sum, p) => sum + (p._count?.evaluations || 0), 0),
        audiograms: list.reduce((sum, p) => sum + (p._count?.audiograms || 0), 0)
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load patients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    fetchPatients(searchTerm.trim() || undefined);
  };

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
            onClick={async () => {
              try {
                await api.post('/auth/logout');
              } catch (err) {
                console.error('Logout error:', err);
              } finally {
                window.location.href = '/';
              }
            }}
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
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Patient Directory</p>
              <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">Manage patient records</h1>
              <p className="mt-3 max-w-xl text-sm sm:text-base text-slate-600">
                Search, review, and invite patients to the portal in one place.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                ← Dashboard
              </Link>
              <Link
                href="/admin/patients/new"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-slate-700"
              >
                + Add Patient
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Total Patients', value: stats.total },
              { label: 'Evaluations Logged', value: stats.evaluations },
              { label: 'Audiograms Uploaded', value: stats.audiograms }
            ].map((item, index) => (
              <div key={item.label} className={`rounded-2xl px-5 py-5 ${statCardClasses[index]}`}>
                <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/50">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <input
              type="text"
              placeholder="Search by name, email, or MRN"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="input flex-1"
            />
            <button type="submit" className="btn btn-primary w-full sm:w-auto">
              {loading ? 'Searching…' : 'Search'}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Patient Directory</h2>
              <p className="text-sm text-slate-600">{stats.total} patients • {stats.evaluations} evaluations • {stats.audiograms} audiograms</p>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-500" />
            </div>
          ) : patients.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">No patients found. Try a different search.</div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/70">
              <div className="hidden bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[1.2fr_1fr_0.9fr_1fr_1fr_1fr_120px]">
                <span>Patient</span>
                <span>MRN</span>
                <span>Status</span>
                <span>Condition</span>
                <span>Activity</span>
                <span>Summary</span>
                <span className="text-right">Actions</span>
              </div>
              <div className="divide-y divide-slate-200 bg-white">
                {patients.map((patient) => {
                  const condition = patient.primaryCondition?.replace('_', ' ') || 'Not specified';
                  const statusLabel = patient.user
                    ? patient.user.isActive
                      ? 'Active'
                      : 'Pending'
                    : 'Invite required';
                  const statusClasses = patient.user
                    ? patient.user.isActive
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-100 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-500 border border-slate-200';
                  const evaluations = patient._count?.evaluations ?? 0;
                  const audiograms = patient._count?.audiograms ?? 0;
                  return (
                    <div
                      key={patient.id}
                      className="grid gap-4 px-6 py-5 text-sm text-slate-700 md:grid-cols-[1.2fr_1fr_0.9fr_1fr_1fr_1fr_120px] md:items-center hover:bg-slate-50/70 transition"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {patient.user
                            ? `${patient.user.firstName} ${patient.user.lastName}`
                            : 'Unassigned'}
                        </p>
                        <p className="text-xs text-slate-500">{patient.user?.email || 'No email on file'}</p>
                      </div>
                      <p className="font-mono text-xs text-slate-600">{patient.medicalRecordNumber}</p>
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}`}
                      >
                        {statusLabel}
                      </span>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{condition}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-600">
                          {evaluations} eval
                        </span>
                        <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 font-semibold text-sky-600">
                          {audiograms} audio
                        </span>
                      </div>
                      <div className="text-xs">
                        <Link
                          href={`/admin/patients/${patient.id}#summaries`}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-100"
                        >
                          Edit summary
                        </Link>
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
                })}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function AdminPatientsPage() {
  return (
    <ProtectedRoute requireAdmin>
      <PatientsContent />
    </ProtectedRoute>
  );
}
