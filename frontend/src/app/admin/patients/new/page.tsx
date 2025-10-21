'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { MainNav, NAV_ACTION_BUTTON_CLASSES } from '@/components/MainNav';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const genderOptions = [
  { value: '', label: 'Select gender' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' }
];

const conditionOptions = [
  { value: '', label: 'Select primary condition' },
  { value: 'TINNITUS', label: 'Tinnitus' },
  { value: 'HEARING_LOSS', label: 'Hearing Loss' },
  { value: 'BOTH', label: 'Both' },
  { value: 'MISOPHONIA', label: 'Misophonia' },
  { value: 'HYPERACUSIS', label: 'Hyperacusis' },
  { value: 'OTHER', label: 'Other' }
];

interface InviteInfo {
  link?: string;
  code?: string;
  expiresAt?: string;
}

function NewPatientContent() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    primaryCondition: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [createdPatientId, setCreatedPatientId] = useState<string | null>(null);

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

  const handleChange = (field: keyof typeof formData) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setInviteInfo(null);

    if (!formData.email.trim()) {
      setError('Email address is required so we can send the invitation link.');
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/patients', {
        email: formData.email.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim() || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        primaryCondition: formData.primaryCondition || undefined,
        notes: formData.notes.trim() || undefined
      });

      const { patient, activationCode } = response.data.data;
      setCreatedPatientId(patient.id);
      setInviteInfo({
        link: activationCode?.link,
        code: activationCode?.code,
        expiresAt: activationCode?.expiresAt
      });
      setSuccess('Patient added successfully. An invitation email has been sent if an address was provided.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add patient.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteInfo?.link) return;
    try {
      await navigator.clipboard.writeText(inviteInfo.link);
      setSuccess('Invitation link copied to clipboard.');
    } catch (clipboardError) {
      setError('Unable to copy link. Please copy it manually.');
    }
  };

  const handleReset = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
      primaryCondition: '',
      notes: ''
    });
    setInviteInfo(null);
    setCreatedPatientId(null);
    setError('');
    setSuccess('');
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
            onClick={handleLogout}
            className={NAV_ACTION_BUTTON_CLASSES}
          >
            Logout
          </button>
        }
      />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Add Patient</h1>
          <p className="mt-2 text-sm text-slate-600">
            Create a patient record and send an invitation link so they can activate their portal account.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/50">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                First Name *
                <input
                  type="text"
                  className="input"
                  value={formData.firstName}
                  onChange={handleChange('firstName')}
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Last Name *
                <input
                  type="text"
                  className="input"
                  value={formData.lastName}
                  onChange={handleChange('lastName')}
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Email Address *
                <input
                  type="email"
                  className="input"
                  value={formData.email}
                  onChange={handleChange('email')}
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Phone Number
                <input
                  type="tel"
                  className="input"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  placeholder="Optional"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Date of Birth
                <input
                  type="date"
                  className="input"
                  value={formData.dateOfBirth}
                  onChange={handleChange('dateOfBirth')}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Gender
                <select className="input" value={formData.gender} onChange={handleChange('gender')}>
                  {genderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Primary Condition
                <select
                  className="input"
                  value={formData.primaryCondition}
                  onChange={handleChange('primaryCondition')}
                >
                  {conditionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Clinical Notes
              <textarea
                className="input min-h-[120px]"
                value={formData.notes}
                onChange={handleChange('notes')}
                placeholder="Optional notes for clinicians"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Create Patient'}
              </button>
              <button type="button" onClick={handleReset} className="btn btn-secondary">
                Clear Form
              </button>
            </div>
          </form>

          {inviteInfo && (inviteInfo.link || inviteInfo.code) && (
            <div className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 text-sm text-indigo-900">
              <h3 className="text-base font-semibold text-indigo-900">Invitation Details</h3>
              {inviteInfo.link && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <span className="flex-1 break-all rounded-lg bg-white px-3 py-2 text-xs text-indigo-800 shadow-inner">
                    {inviteInfo.link}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-indigo-700"
                  >
                    Copy Link
                  </button>
                </div>
              )}
              {inviteInfo.code && (
                <p className="mt-3 text-xs text-indigo-700">
                  Activation Code: <span className="font-mono text-sm font-semibold">{inviteInfo.code}</span>
                </p>
              )}
              {inviteInfo.expiresAt && (
                <p className="mt-1 text-xs text-indigo-600/90">
                  Expires: {new Date(inviteInfo.expiresAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {createdPatientId && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => router.push(`/admin/patients/${createdPatientId}`)}
                className="btn btn-secondary"
              >
                View Patient Record
              </button>
              <button type="button" onClick={handleReset} className="btn btn-primary">
                Add Another Patient
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function NewPatientPage() {
  return (
    <ProtectedRoute requireAdmin>
      <NewPatientContent />
    </ProtectedRoute>
  );
}
