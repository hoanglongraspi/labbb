'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { MainNav, NAV_ACTION_BUTTON_CLASSES } from '@/components/MainNav';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface ProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: 'ADMIN' | 'PATIENT';
}

interface PreferencesResponse {
  therapy: boolean;
  consulting: boolean;
  supportGroups: boolean;
  clinicalTrials: boolean;
  digitalTools: boolean;
  emailUpdates: boolean;
}

function SettingsContent() {
  const { user, updateUser, logout } = useAuthStore();
const [profileForm, setProfileForm] = useState({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
});
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [preferences, setPreferences] = useState<PreferencesResponse>({
    therapy: false,
    consulting: false,
    supportGroups: false,
    clinicalTrials: false,
    digitalTools: false,
    emailUpdates: false,
  });
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferencesSuccess, setPreferencesSuccess] = useState('');
  const [preferencesError, setPreferencesError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setProfileLoading(true);
        const response = await api.get('/users/profile');
        const profile: ProfileResponse = response.data.data.user;
        setProfileForm({
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          email: profile.email || '',
          phone: profile.phone || '',
        });
        updateUser({
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phone: profile.phone || undefined,
        });
      } catch (err: any) {
        setProfileError(err.response?.data?.message || 'Failed to load profile.');
      } finally {
        setProfileLoading(false);
      }
    };

    const fetchPreferences = async () => {
      try {
        setPreferencesLoading(true);
        const response = await api.get('/users/preferences');
        const prefs: PreferencesResponse = response.data.data.preferences;
        setPreferences(prefs);
      } catch (err: any) {
        setPreferencesError(
          err.response?.data?.message || 'Failed to load communication preferences.'
        );
      } finally {
        setPreferencesLoading(false);
      }
    };

    fetchProfile();
    fetchPreferences();
  }, [updateUser]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    try {
      setProfileSaving(true);
      const response = await api.put('/users/profile', {
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim() || undefined,
      });
      const updated: ProfileResponse = response.data.data.user;
      setProfileSuccess('Profile updated successfully.');
      updateUser({
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        phone: updated.phone || undefined,
      });
    } catch (err: any) {
      setProfileError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    try {
      setPasswordSaving(true);
      await api.put('/users/profile/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess('Password updated successfully.');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to change password.');
      if (err.response?.status === 401) {
        logout();
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const handlePreferencesChange = (key: keyof PreferencesResponse) =>
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPreferencesError('');
    setPreferencesSuccess('');

    try {
      setPreferencesSaving(true);
      await api.put('/users/preferences', {
        therapy: preferences.therapy,
        consulting: preferences.consulting,
        supportGroups: preferences.supportGroups,
        clinicalTrials: preferences.clinicalTrials,
        digitalTools: preferences.digitalTools,
        emailUpdates: preferences.emailUpdates,
      });
      setPreferencesSuccess('Communication preferences saved.');
    } catch (err: any) {
      setPreferencesError(
        err.response?.data?.message || 'Failed to update communication preferences.'
      );
    } finally {
      setPreferencesSaving(false);
    }
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
          <button
            onClick={async () => {
              try {
                await api.post('/auth/logout');
              } catch (error) {
                console.error('Logout error:', error);
              } finally {
                logout();
                window.location.href = '/';
              }
            }}
            className={NAV_ACTION_BUTTON_CLASSES}
          >
            Logout
          </button>
        }
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
            <p className="text-gray-600 mt-1">
              Manage your personal details and keep your password up to date.
            </p>
          </div>
          <Link href="/dashboard" className="text-primary-600 hover:text-primary-700">
            ← Back to Dashboard
          </Link>
        </div>

        {profileLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
              <p className="text-sm text-gray-500 mb-4">
                Update the contact details associated with your account.
              </p>

              {profileError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {profileError}
                </div>
              )}
              {profileSuccess && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  {profileSuccess}
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label className="label" htmlFor="firstName">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    className="input"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label" htmlFor="lastName">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    className="input"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label" htmlFor="email">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="input"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label" htmlFor="phone">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    className="input"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full disabled:opacity-50"
                  disabled={profileSaving}
                >
                  {profileSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>

            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Change Password</h2>
              <p className="text-sm text-gray-500 mb-4">
                Choose a strong password to keep your account secure.
              </p>

              {passwordError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  {passwordSuccess}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="label" htmlFor="currentPassword">
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    className="input"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="label" htmlFor="newPassword">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    className="input"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                    }
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Must include uppercase, lowercase, number, and special character.
                  </p>
                </div>

                <div>
                  <label className="label" htmlFor="confirmPassword">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="input"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                    }
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full disabled:opacity-50"
                  disabled={passwordSaving}
                >
                  {passwordSaving ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>

            <div className="card lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4">Research & Program Preferences</h2>
              <p className="text-sm text-gray-500 mb-4">
                Tell us which opportunities interest you. We’ll only email you if you opt in for
                updates.
              </p>

              {preferencesError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {preferencesError}
                </div>
              )}

              {preferencesSuccess && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  {preferencesSuccess}
                </div>
              )}

              {preferencesLoading ? (
                <div className="flex justify-center py-10">
                  <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <form onSubmit={handlePreferencesSubmit} className="space-y-6">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                        checked={preferences.therapy}
                        onChange={() => handlePreferencesChange('therapy')}
                      />
                      <span>
                        <span className="font-medium text-gray-900">Therapy & Coaching</span>
                        <span className="block text-sm text-gray-500">
                          Guided therapy sessions or one-on-one coaching to support your hearing health.
                        </span>
                      </span>
                    </label>

                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                        checked={preferences.consulting}
                        onChange={() => handlePreferencesChange('consulting')}
                      />
                      <span>
                        <span className="font-medium text-gray-900">Expert Consultations</span>
                        <span className="block text-sm text-gray-500">
                          Invitations to speak with specialists about emerging treatments and tools.
                        </span>
                      </span>
                    </label>

                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                        checked={preferences.supportGroups}
                        onChange={() => handlePreferencesChange('supportGroups')}
                      />
                      <span>
                        <span className="font-medium text-gray-900">Community Groups</span>
                        <span className="block text-sm text-gray-500">
                          Peer-led meetups or online patient communities focused on shared experience.
                        </span>
                      </span>
                    </label>

                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                        checked={preferences.clinicalTrials}
                        onChange={() => handlePreferencesChange('clinicalTrials')}
                      />
                      <span>
                        <span className="font-medium text-gray-900">Research Participation</span>
                        <span className="block text-sm text-gray-500">
                          Opportunities to join clinical studies or pilot new therapies.
                        </span>
                      </span>
                    </label>

                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                        checked={preferences.digitalTools}
                        onChange={() => handlePreferencesChange('digitalTools')}
                      />
                      <span>
                        <span className="font-medium text-gray-900">Digital Health Tools</span>
                        <span className="block text-sm text-gray-500">
                          Early access to mobile apps, trackers, or remote monitoring experiences.
                        </span>
                      </span>
                    </label>
                  </div>

                  <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300"
                      checked={preferences.emailUpdates}
                      onChange={() => handlePreferencesChange('emailUpdates')}
                    />
                    <span>
                      <span className="font-medium text-gray-900">Email me when there&apos;s something relevant</span>
                      <span className="block text-sm text-gray-500">
                        You can opt out anytime. We&apos;ll only reach out about the interests you select.
                      </span>
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="btn btn-primary w-full sm:w-auto disabled:opacity-50"
                    disabled={preferencesSaving}
                  >
                    {preferencesSaving ? 'Saving Preferences...' : 'Save Preferences'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
