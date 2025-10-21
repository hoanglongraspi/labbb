'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';

export default function ActivateAccountPage() {
  const searchParams = useSearchParams();
  const [prefilledFromLink, setPrefilledFromLink] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    activationCode: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (prefilledFromLink) return;
    const inviteEmail = searchParams.get('email');
    const inviteCode = searchParams.get('code');
    if (inviteEmail || inviteCode) {
      setFormData((prev) => ({
        ...prev,
        email: inviteEmail ?? prev.email,
        activationCode: inviteCode ? inviteCode.toUpperCase() : prev.activationCode,
      }));
      setPrefilledFromLink(true);
    }
  }, [prefilledFromLink, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/activate', {
        email: formData.email,
        activationCode: formData.activationCode.trim().toUpperCase(),
        password: formData.password,
      });
      setSuccess('Account activated successfully. You can now sign in.');
      setFormData({
        email: '',
        activationCode: '',
        password: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Activation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Activate Your Account</h1>
          <p className="text-gray-600 mt-2">
            Enter the activation code provided by your clinician to finish setting up your portal
            access.
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <div>
              <label className="label" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="input"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="activationCode">
                Activation Code
              </label>
              <input
                id="activationCode"
                type="text"
                className="input uppercase"
                required
                value={formData.activationCode}
                onChange={(e) =>
                  setFormData({ ...formData, activationCode: e.target.value.toUpperCase() })
                }
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                New Password
              </label>
              <input
                id="password"
                type="password"
                className="input"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-500">
                Minimum 8 characters, include uppercase, lowercase, number, and special character.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="input"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary w-full disabled:opacity-50" disabled={loading}>
              {loading ? 'Activating...' : 'Activate Account'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          Already activated?{' '}
          <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign in here
          </Link>
        </div>

        <div className="mt-2 text-center text-sm text-gray-500">
          Need help? Contact your clinic if you did not receive an activation code.
        </div>
      </div>
    </div>
  );
}
