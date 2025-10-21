'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { MainNav, NAV_ACTION_BUTTON_CLASSES } from '@/components/MainNav';

interface UnassignedTest {
  id: string;
  participantId: string;
  testId: string;
  testType: string;
  testDate: string;
  videoUrl: string | null;
  csvUrl: string | null;
  questionsUrl: string | null;
  createdAt: string;
}

interface Patient {
  id: string;
  medicalRecordNumber: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

function UnassignedTestsContent() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [tests, setTests] = useState<UnassignedTest[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchTests();
      fetchPatients();
    }
  }, [searchQuery, mounted]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/mobile/test-results/unassigned', {
        params: {
          participantId: searchQuery || undefined,
          limit: 50
        }
      });
      setTests(response.data.data.testResults || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load unassigned tests.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await api.get('/patients', {
        params: { limit: 100 }
      });
      setPatients(response.data.data.patients || []);
    } catch (err: any) {
      console.error('Unable to load patients:', err);
    }
  };

  const handleAssign = async (testId: string) => {
    if (!selectedPatient) {
      alert('Please select a patient');
      return;
    }

    try {
      setAssigning(true);
      await api.post(`/mobile/test-results/${testId}/assign`, {
        patientId: selectedPatient
      });

      // Refresh tests list
      await fetchTests();
      setSelectedTest(null);
      setSelectedPatient('');
      alert('Test successfully assigned to patient!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign test');
    } finally {
      setAssigning(false);
    }
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'BPPV': 'BPPV',
      'AUDIOMETRY': 'Audiometry',
      'LOUDNESS': 'Loudness',
      'SPEECH_IN_NOISE': 'Speech in Noise',
      'OTHER': 'Other'
    };
    return labels[type] || type;
  };

  if (!mounted) {
    return null;
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

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Test Management</p>
              <h1 className="mt-3 text-4xl font-semibold">Unassigned Tests</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                View and assign tests uploaded with participant IDs to patient accounts.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <input
              type="text"
              placeholder="Search by participant ID..."
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
        </section>

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow">
            {error}
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80">
            <div className="hidden bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[1fr_1fr_1fr_1fr_0.8fr_140px]">
              <span>Participant ID</span>
              <span>Test Type</span>
              <span>Test Date</span>
              <span>Files</span>
              <span>Uploaded</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <div className="px-6 py-10 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
                  <p className="mt-2 text-sm text-slate-500">Loading tests...</p>
                </div>
              ) : tests.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-slate-500">
                  {searchQuery ? 'No matching tests found.' : 'No unassigned tests to display.'}
                </div>
              ) : (
                tests.map((test) => (
                  <div key={test.id}>
                    <div className="grid gap-4 px-6 py-5 text-sm text-slate-700 md:grid-cols-[1fr_1fr_1fr_1fr_0.8fr_140px] md:items-center hover:bg-slate-50/70 transition">
                      <div>
                        <p className="font-mono text-sm font-semibold text-slate-900">
                          {test.participantId}
                        </p>
                        <p className="font-mono text-xs text-slate-500">ID: {test.testId.slice(0, 8)}...</p>
                      </div>
                      <div>
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                          {getTestTypeLabel(test.testType)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{formatDate(test.testDate)}</p>
                      <div className="flex flex-wrap gap-1">
                        {test.videoUrl && (
                          <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                            Video
                          </span>
                        )}
                        {test.csvUrl && (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                            CSV
                          </span>
                        )}
                        {test.questionsUrl && (
                          <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                            Questions
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{formatDate(test.createdAt)}</p>
                      <div className="text-right">
                        <button
                          onClick={() => setSelectedTest(selectedTest === test.id ? null : test.id)}
                          className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                        >
                          {selectedTest === test.id ? 'Cancel' : 'Assign'}
                        </button>
                      </div>
                    </div>

                    {selectedTest === test.id && (
                      <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
                        <div className="max-w-2xl">
                          <h3 className="text-sm font-semibold text-slate-900 mb-3">
                            Assign to Patient
                          </h3>
                          <div className="flex gap-3">
                            <select
                              value={selectedPatient}
                              onChange={(e) => setSelectedPatient(e.target.value)}
                              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                              <option value="">Select a patient...</option>
                              {patients.map((patient) => (
                                <option key={patient.id} value={patient.id}>
                                  {patient.user
                                    ? `${patient.user.firstName} ${patient.user.lastName} (${patient.medicalRecordNumber})`
                                    : `MRN: ${patient.medicalRecordNumber}`}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleAssign(test.id)}
                              disabled={!selectedPatient || assigning}
                              className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {assigning ? 'Assigning...' : 'Confirm'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function UnassignedTestsPage() {
  return (
    <ProtectedRoute requireAdmin>
      <UnassignedTestsContent />
    </ProtectedRoute>
  );
}
