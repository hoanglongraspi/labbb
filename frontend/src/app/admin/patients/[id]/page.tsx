'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { MainNav, NAV_ACTION_BUTTON_CLASSES } from '@/components/MainNav';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';

type SeverityLevel = 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE' | 'CRITICAL';

interface EvaluationResults {
  hearingLossSeverity?: SeverityLevel | null;
  tinnitusSeverity?: SeverityLevel | null;
  hyperacusisSeverity?: SeverityLevel | null;
  misophoniaSeverity?: SeverityLevel | null;
  [key: string]: unknown;
}

interface EvaluationAudiogramLink {
  id: string;
  testDate: string;
  fileType: string;
}

interface Evaluation {
  id: string;
  evaluationType: string;
  evaluationDate: string;
  evaluatorName?: string | null;
  conditionCategory?: string | null;
  conditionSeverity?: string | null;
  notes?: string | null;
  results?: EvaluationResults | null;
  audiograms?: EvaluationAudiogramLink[];
}

interface AudiogramEvaluationSummary {
  id: string;
  evaluationType: string;
  evaluationDate: string;
  conditionCategory?: string | null;
  conditionSeverity?: string | null;
}

interface Audiogram {
  id: string;
  testDate: string;
  fileType: string;
  fileUrl: string;
  summary?: string | null;
  summaryPrompt?: string | null;
  summaryGeneratedAt?: string | null;
  summaryCreator?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  uploader?: {
    firstName: string;
    lastName: string;
  } | null;
  evaluation?: AudiogramEvaluationSummary | null;
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

interface Patient {
  id: string;
  medicalRecordNumber: string;
  primaryCondition?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    isActive: boolean;
  } | null;
  testResults?: TestResult[];
}

interface EvaluationFormState {
  evaluationDate: string;
  evaluationType: string;
  evaluatorName: string;
  notes: string;
  testDate: string;
  file: File | null;
  leftEarData: string;
  rightEarData: string;
  severity: {
    hearingLoss: SeverityLevel;
    tinnitus: SeverityLevel;
    hyperacusis: SeverityLevel;
    misophonia: SeverityLevel;
  };
  autoGenerateSummary: boolean;
  summaryPrompt: string;
}

const severityChoices: SeverityLevel[] = ['NONE', 'MILD', 'MODERATE', 'SEVERE', 'CRITICAL'];

const severityRank: Record<SeverityLevel, number> = {
  NONE: 0,
  MILD: 1,
  MODERATE: 2,
  SEVERE: 3,
  CRITICAL: 4
};

const conditionKeyToCategory: Record<keyof EvaluationFormState['severity'], string> = {
  hearingLoss: 'HEARING_LOSS',
  tinnitus: 'TINNITUS',
  hyperacusis: 'HYPERACUSIS',
  misophonia: 'MISOPHONIA'
};

const severityLabels: Record<keyof EvaluationFormState['severity'], string> = {
  hearingLoss: 'Hearing Loss',
  tinnitus: 'Tinnitus',
  hyperacusis: 'Hyperacusis',
  misophonia: 'Misophonia'
};

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

const defaultSeveritySelection = () => ({
  hearingLoss: 'NONE' as SeverityLevel,
  tinnitus: 'NONE' as SeverityLevel,
  hyperacusis: 'NONE' as SeverityLevel,
  misophonia: 'NONE' as SeverityLevel
});

const createDefaultEvaluationForm = (evaluatorName = ''): EvaluationFormState => ({
  evaluationDate: '',
  evaluationType: 'INITIAL',
  evaluatorName,
  notes: '',
  testDate: '',
  file: null,
  leftEarData: '',
  rightEarData: '',
  severity: defaultSeveritySelection(),
  autoGenerateSummary: true,
  summaryPrompt: ''
});

const evaluationTypeOptions = [
  { value: 'INITIAL', label: 'Initial Assessment' },
  { value: 'FOLLOW_UP', label: 'Follow Up' },
  { value: 'ANNUAL', label: 'Annual Review' },
  { value: 'OTHER', label: 'Other' }
] as const;

function PatientDetailContent() {
  const params = useParams();
  const router = useRouter();
  const patientId = params?.id as string | undefined;

  const logout = useAuthStore((state) => state.logout);
  const authUser = useAuthStore((state) => state.user);
  const defaultEvaluatorName =
    authUser ? `${authUser.firstName} ${authUser.lastName}`.trim() || authUser.email : '';
  const [patient, setPatient] = useState<Patient | null>(null);
  const [audiograms, setAudiograms] = useState<Audiogram[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testResultsLoading, setTestResultsLoading] = useState(false);
  const [downloadingTestFileKey, setDownloadingTestFileKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summaryDrafts, setSummaryDrafts] = useState<Record<string, string>>({});
  const [summaryLoading, setSummaryLoading] = useState<Record<string, boolean>>({});
  const [summaryFeedback, setSummaryFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [evaluationModalMode, setEvaluationModalMode] = useState<'create' | 'edit'>('create');
  const [activeEvaluation, setActiveEvaluation] = useState<Evaluation | null>(null);
  const [evaluationForm, setEvaluationForm] = useState<EvaluationFormState>(() =>
    createDefaultEvaluationForm(defaultEvaluatorName)
  );
  const [isEvaluatorNameEdited, setIsEvaluatorNameEdited] = useState(false);
  const [evaluationModalError, setEvaluationModalError] = useState('');
  const [evaluationModalSuccess, setEvaluationModalSuccess] = useState('');
  const [evaluationModalLoading, setEvaluationModalLoading] = useState(false);

  const [activationGenerating, setActivationGenerating] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState('');
  const [activationInfo, setActivationInfo] = useState<{
    code: string;
    expiresAt: string;
    link?: string;
    sentTo?: string;
  } | null>(null);
  const [activationEmail, setActivationEmail] = useState('');

  useEffect(() => {
    if (!defaultEvaluatorName) {
      return;
    }

    setEvaluationForm((prev) => {
      if (isEvaluatorNameEdited || prev.evaluatorName === defaultEvaluatorName) {
        return prev;
      }

      return {
        ...prev,
        evaluatorName: defaultEvaluatorName
      };
    });
  }, [defaultEvaluatorName, isEvaluatorNameEdited]);

  const patientName = useMemo(() => {
    if (!patient?.user) return 'Unassigned patient';
    return `${patient.user.firstName} ${patient.user.lastName}`;
  }, [patient]);

  const primaryConditionLabel = patient?.primaryCondition
    ? patient.primaryCondition.replace(/_/g, ' ')
    : 'Not specified';

  const genderLabel = patient?.gender ?? 'Not specified';

  const totalTestResults = testResults.length;

  const latestEvaluation = useMemo(() => {
    if (evaluations.length === 0) {
      return null;
    }
    return evaluations[0];
  }, [evaluations]);

  const latestMobileTest = useMemo(() => {
    if (testResults.length === 0) {
      return null;
    }
    return testResults[0];
  }, [testResults]);

  const dateOfBirthLabel = patient?.dateOfBirth
    ? new Date(patient.dateOfBirth).toLocaleDateString()
    : 'N/A';

  const accountStatusLabel = patient?.user
    ? patient.user.isActive
      ? 'Active'
      : 'Activation Required'
    : 'No portal account';

  const accountStatusBadgeClass = patient?.user
    ? patient.user.isActive
      ? 'bg-emerald-200/80 text-emerald-900 ring-1 ring-inset ring-emerald-400/70'
      : 'bg-amber-200/80 text-amber-900 ring-1 ring-inset ring-amber-400/70'
    : 'bg-white/30 text-white/80 ring-1 ring-inset ring-white/40';
  const isEvaluatorNameUsingDefault =
    !!defaultEvaluatorName && evaluationForm.evaluatorName === defaultEvaluatorName && !isEvaluatorNameEdited;

  const fetchPatientDetails = async () => {
    if (!patientId) return;
    const patientResponse = await api.get(`/patients/${patientId}`);
    const patientData: Patient = patientResponse.data.data.patient;
    setPatient(patientData);
    setActivationEmail(patientData?.user?.email || '');
    if (patientData?.testResults) {
      setTestResults(patientData.testResults);
    }
  };

  const fetchAudiograms = async () => {
    if (!patientId) return;
    const response = await api.get(`/audiograms/patient/${patientId}`);
    const list: Audiogram[] = response.data.data.audiograms || [];
    setAudiograms(list);
    setSummaryDrafts(
      list.reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.summary ?? '';
        return acc;
      }, {})
    );
  };

  const fetchEvaluations = async () => {
    if (!patientId) return;
    const response = await api.get(`/evaluations/patient/${patientId}`);
    setEvaluations(response.data.data.evaluations || []);
  };

  const fetchTestResults = async () => {
    if (!patientId) return;
    setTestResultsLoading(true);
    try {
      const response = await api.get(`/mobile/patients/${patientId}/test-results`, {
        params: { limit: 50 }
      });
      const list: TestResult[] = response.data.data.testResults || [];
      setTestResults(list);
    } catch (err: any) {
      console.error('Failed to load test results', err);
      setError(err.response?.data?.message || 'Failed to load test results.');
    } finally {
      setTestResultsLoading(false);
    }
  };

  const refreshAudiograms = async () => {
    try {
      await fetchAudiograms();
    } catch (err: any) {
      console.error('Failed to refresh audiograms', err);
      setError(err.response?.data?.message || 'Failed to refresh audiograms.');
    }
  };

  const refreshEvaluations = async () => {
    try {
      await fetchEvaluations();
    } catch (err: any) {
      console.error('Failed to refresh evaluations', err);
      setError(err.response?.data?.message || 'Failed to refresh evaluations.');
    }
  };

  const refreshTestResults = async () => {
    try {
      await fetchTestResults();
    } catch (err: any) {
      console.error('Failed to refresh test results', err);
      setError(err.response?.data?.message || 'Failed to refresh test results.');
    }
  };

  const refreshPatient = async () => {
    try {
      await fetchPatientDetails();
    } catch (err: any) {
      console.error('Failed to refresh patient', err);
      setError(err.response?.data?.message || 'Failed to refresh patient details.');
    }
  };

  const initializeData = async () => {
    if (!patientId) return;
    setLoading(true);
    setError('');
    try {
      await Promise.all([fetchPatientDetails(), fetchEvaluations(), fetchAudiograms(), fetchTestResults()]);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load patient details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const openCreateEvaluationModal = () => {
    setEvaluationModalMode('create');
    setActiveEvaluation(null);
    setIsEvaluatorNameEdited(false);
    setEvaluationForm(createDefaultEvaluationForm(defaultEvaluatorName));
    setEvaluationModalError('');
    setEvaluationModalSuccess('');
    setIsEvaluationModalOpen(true);
  };

  const openEditEvaluationModal = (evaluation: Evaluation) => {
    setEvaluationModalMode('edit');
    setActiveEvaluation(evaluation);
    const baseForm = createDefaultEvaluationForm(defaultEvaluatorName);
    const evaluationDate = evaluation.evaluationDate
      ? new Date(evaluation.evaluationDate).toISOString().slice(0, 10)
      : '';
    baseForm.evaluationDate = evaluationDate;
    baseForm.testDate = evaluationDate;
    baseForm.evaluationType = evaluation.evaluationType || 'INITIAL';
    baseForm.evaluatorName = evaluation.evaluatorName || defaultEvaluatorName;
    baseForm.notes = evaluation.notes || '';
    baseForm.severity = {
      hearingLoss: (evaluation.results?.hearingLossSeverity as SeverityLevel) || 'NONE',
      tinnitus: (evaluation.results?.tinnitusSeverity as SeverityLevel) || 'NONE',
      hyperacusis: (evaluation.results?.hyperacusisSeverity as SeverityLevel) || 'NONE',
      misophonia: (evaluation.results?.misophoniaSeverity as SeverityLevel) || 'NONE'
    };
    const hasCustomEvaluatorName =
      !!evaluation.evaluatorName && evaluation.evaluatorName !== defaultEvaluatorName;
    setIsEvaluatorNameEdited(hasCustomEvaluatorName);
    setEvaluationForm(baseForm);
    setEvaluationModalError('');
    setEvaluationModalSuccess('');
    setIsEvaluationModalOpen(true);
  };

  const closeEvaluationModal = () => {
    setIsEvaluationModalOpen(false);
    setActiveEvaluation(null);
    setEvaluationModalLoading(false);
    setEvaluationModalError('');
    setEvaluationModalSuccess('');
    setIsEvaluatorNameEdited(false);
    setEvaluationForm(createDefaultEvaluationForm(defaultEvaluatorName));
  };

  const setEvaluationField = <K extends keyof EvaluationFormState>(key: K, value: EvaluationFormState[K]) => {
    if (key === 'evaluatorName') {
      const nextValue = value as string;
      setIsEvaluatorNameEdited(nextValue !== defaultEvaluatorName);
    }
    setEvaluationForm((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const setEvaluationSeverity = (key: keyof EvaluationFormState['severity'], value: SeverityLevel) => {
    setEvaluationForm((prev) => ({
      ...prev,
      severity: {
        ...prev.severity,
        [key]: value
      }
    }));
  };

  const handleEvaluationDateChange = (value: string) => {
    setEvaluationForm((prev) => ({
      ...prev,
      evaluationDate: value,
      testDate: prev.testDate || value
    }));
  };

  const handleEvaluationFileChange = (file: File | null) => {
    setEvaluationForm((prev) => ({
      ...prev,
      file,
      // If file is cleared, keep other fields
    }));
  };

  const determinePrimaryCondition = (severity: EvaluationFormState['severity']) => {
    let selectedCategory: string | null = null;
    let selectedSeverity: SeverityLevel | null = null;
    let highestRank = 0;

    (Object.keys(severity) as Array<keyof EvaluationFormState['severity']>).forEach((key) => {
      const level = severity[key];
      const rank = severityRank[level];
      if (rank > highestRank) {
        highestRank = rank;
        selectedCategory = level === 'NONE' ? null : conditionKeyToCategory[key];
        selectedSeverity = level === 'NONE' ? null : level;
      }
    });

    return {
      conditionCategory: selectedCategory,
      conditionSeverity: selectedSeverity
    };
  };

  const getSeverityBadgeStyles = (level: SeverityLevel) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 ring-1 ring-inset ring-red-200';
      case 'SEVERE':
        return 'bg-red-100 text-red-700 ring-1 ring-inset ring-red-200';
      case 'MODERATE':
        return 'bg-orange-100 text-orange-700 ring-1 ring-inset ring-orange-200';
      case 'MILD':
        return 'bg-yellow-100 text-yellow-700 ring-1 ring-inset ring-yellow-200';
      case 'NONE':
      default:
        return 'bg-green-100 text-green-700 ring-1 ring-inset ring-green-200';
    }
  };

  const formatSeverityLabel = (level: SeverityLevel) => {
    if (level === 'NONE') {
      return 'Healthy';
    }
    return level.charAt(0) + level.slice(1).toLowerCase();
  };

  const handleEvaluationSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!patientId) return;

    if (!evaluationForm.evaluationDate) {
      setEvaluationModalError('Evaluation date is required.');
      return;
    }

    if (evaluationForm.file && !evaluationForm.testDate) {
      setEvaluationModalError('Provide a test date for the uploaded audiogram.');
      return;
    }

    try {
      setEvaluationModalLoading(true);
      setEvaluationModalError('');
      setEvaluationModalSuccess('');

      const { conditionCategory, conditionSeverity } = determinePrimaryCondition(evaluationForm.severity);

      const evaluationPayload = {
        evaluationDate: evaluationForm.evaluationDate,
        evaluationType: evaluationForm.evaluationType,
        evaluatorName:
          evaluationForm.evaluatorName ||
          (patient?.user ? `${patient.user.firstName} ${patient.user.lastName}` : 'Admin User'),
        notes: evaluationForm.notes || undefined,
        results: {
          hearingLossSeverity: evaluationForm.severity.hearingLoss,
          tinnitusSeverity: evaluationForm.severity.tinnitus,
          hyperacusisSeverity: evaluationForm.severity.hyperacusis,
          misophoniaSeverity: evaluationForm.severity.misophonia
        },
        conditionCategory,
        conditionSeverity
      };

      let evaluationId = activeEvaluation?.id;

      if (evaluationModalMode === 'create') {
        const response = await api.post(`/evaluations/patient/${patientId}`, evaluationPayload);
        evaluationId = response.data.data.evaluation.id;
      } else if (evaluationId) {
        await api.put(`/evaluations/${evaluationId}`, evaluationPayload);
      }

      let newAudiogramId: string | null = null;

      if (evaluationForm.file) {
        const formData = new FormData();
        formData.append('file', evaluationForm.file);
        formData.append('testDate', evaluationForm.testDate || evaluationForm.evaluationDate);
        if (evaluationId) {
          formData.append('evaluationId', evaluationId);
        }
        if (evaluationForm.leftEarData.trim()) {
          formData.append('leftEarData', evaluationForm.leftEarData.trim());
        }
        if (evaluationForm.rightEarData.trim()) {
          formData.append('rightEarData', evaluationForm.rightEarData.trim());
        }

        const uploadResponse = await api.post(`/audiograms/patient/${patientId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        newAudiogramId = uploadResponse.data?.data?.audiogram?.id || null;

        if (newAudiogramId && evaluationForm.autoGenerateSummary) {
          await api.post(`/audiograms/${newAudiogramId}/summary/generate`, {
            prompt: evaluationForm.summaryPrompt?.trim() || undefined
          });
        }
      }

      await Promise.all([refreshEvaluations(), refreshAudiograms(), refreshPatient(), refreshTestResults()]);

      setEvaluationModalSuccess(
        evaluationModalMode === 'create'
          ? 'Evaluation created successfully.'
          : 'Evaluation updated successfully.'
      );

      // Automatically close modal after brief success message
      setTimeout(() => {
        closeEvaluationModal();
      }, 800);
    } catch (err: any) {
      console.error('Failed to save evaluation', err);
      setEvaluationModalError(err.response?.data?.message || 'Failed to save evaluation.');
    } finally {
      setEvaluationModalLoading(false);
    }
  };

  const handleGenerateActivationCode = async () => {
    if (!patientId) return;

    try {
      setActivationGenerating(true);
      setActivationError('');
      setActivationSuccess('');
      setActivationInfo(null);

      const response = await api.post(`/patients/${patientId}/activation-code`, {
        email: activationEmail.trim() || undefined,
      });
      const { activationCode, activationLink, expiresAt, sentTo } = response.data.data;
      setActivationInfo({
        code: activationCode,
        expiresAt,
        link: activationLink,
        sentTo,
      });
      if (sentTo) {
        setActivationSuccess(`Activation email sent to ${sentTo}.`);
      } else if (activationEmail.trim()) {
        setActivationError('Activation code generated, but email could not be delivered.');
      } else {
        setActivationSuccess('Activation code generated. Share the code with the patient.');
      }
    } catch (err: any) {
      setActivationError(err.response?.data?.message || 'Failed to generate activation code.');
    } finally {
      setActivationGenerating(false);
    }
  };

  const handleDownload = async (audiogramId: string) => {
    try {
      const response = await api.get(`/audiograms/${audiogramId}/download`);
      const url = response.data.data.downloadUrl;
      if (url) {
        window.open(url, '_blank');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate download link.');
    }
  };

  const handleDownloadTestFile = async (testId: string, fileType: 'video' | 'csv' | 'questions') => {
    try {
      const key = `${testId}:${fileType}`;
      setDownloadingTestFileKey(key);
      const response = await api.get(`/mobile/test-results/${testId}/download/${fileType}`);
      const url = response.data.data.downloadUrl;
      if (url) {
        window.open(url, '_blank');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to download ${fileType}.`);
    } finally {
      setDownloadingTestFileKey(null);
    }
  };

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

  const updateSummaryDraft = (id: string, value: string) => {
    setSummaryDrafts((prev) => ({
      ...prev,
      [id]: value
    }));
  };

  const handleGenerateSummary = async (audiogramId: string) => {
    setSummaryFeedback(null);
    setSummaryLoading((prev) => ({ ...prev, [audiogramId]: true }));

    try {
      const response = await api.post(`/audiograms/${audiogramId}/summary/generate`, {});

      const { summary, generatedAt, generatedBy } = response.data.data;

      updateSummaryDraft(audiogramId, summary);

      setAudiograms((prev) =>
        prev.map((item) =>
          item.id === audiogramId
            ? {
                ...item,
                summary,
                summaryGeneratedAt: generatedAt,
                summaryCreator: generatedBy
              }
            : item
        )
      );

      setSummaryFeedback({ type: 'success', message: 'Summary generated successfully.' });
    } catch (err: any) {
      setSummaryFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Unable to generate summary. Double-check OpenAI configuration.'
      });
    } finally {
      setSummaryLoading((prev) => ({ ...prev, [audiogramId]: false }));
    }
  };

  const handleSaveSummary = async (audiogramId: string) => {
    const draft = summaryDrafts[audiogramId];
    if (!draft || !draft.trim()) {
      setSummaryFeedback({ type: 'error', message: 'Summary text cannot be empty.' });
      return;
    }

    setSummaryFeedback(null);
    setSummaryLoading((prev) => ({ ...prev, [audiogramId]: true }));

    try {
      const response = await api.put(`/audiograms/${audiogramId}/summary`, {
        summary: draft
      });

      const { summary, generatedAt, generatedBy } = response.data.data;

      setAudiograms((prev) =>
        prev.map((item) =>
          item.id === audiogramId
            ? {
                ...item,
                summary,
                summaryGeneratedAt: generatedAt,
                summaryCreator: generatedBy
              }
            : item
        )
      );

      setSummaryFeedback({ type: 'success', message: 'Summary saved successfully.' });
    } catch (err: any) {
      setSummaryFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Unable to save summary.'
      });
    } finally {
      setSummaryLoading((prev) => ({ ...prev, [audiogramId]: false }));
    }
  };

  if (!patientId) {
    return (
      <div className="p-8 text-center text-red-600">
        Invalid patient identifier.{' '}
        <button className="text-primary-600 underline" onClick={() => router.push('/admin/patients')}>
          Go back
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-2xl">
          <div className="card border border-red-200 bg-red-50 text-red-600">
            <p className="font-semibold">Unable to load patient</p>
            <p className="mt-2 text-sm">{error}</p>
            <button
              className="mt-4 text-primary-600 underline"
              onClick={() => router.push('/admin/patients')}
            >
              Back to patients list
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 text-center text-gray-500">
        Patient not found.
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

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
        <section
          id="summaries"
          className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-xl sm:p-12"
        >
          <div className="flex flex-col-reverse gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Patient Profile</p>
              <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">{patientName}</h1>
              <p className="mt-3 text-sm sm:text-base text-slate-600">
                Medical Record Number:{' '}
                <span className="font-medium text-slate-900">{patient.medicalRecordNumber}</span>
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 self-end md:self-start">
              <span
                className={`rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide ${accountStatusBadgeClass}`}
              >
                {accountStatusLabel}
              </span>
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <span aria-hidden>←</span> Back to Dashboard
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">Primary Condition</p>
              <p className="mt-2 text-xl font-semibold capitalize text-slate-900">{primaryConditionLabel}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">Gender</p>
              <p className="mt-2 text-xl font-semibold capitalize text-slate-900">{genderLabel.toLowerCase()}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">Date of Birth</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{dateOfBirthLabel}</p>
            </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Account Status</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{accountStatusLabel}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Mobile Tests</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {testResultsLoading ? 'Loading…' : totalTestResults}
            </p>
          </div>
        </div>
      </section>

        {(latestEvaluation || latestMobileTest) && (
          <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/40">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Recent Activity</h2>
                <p className="text-sm text-slate-600">
                  Quick snapshot of the latest clinical evaluation and mobile session captured for this patient.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {latestEvaluation ? (
                <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-200/60">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                    Latest Evaluation
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {latestEvaluation.evaluationType || 'Evaluation'}
                  </p>
                  <p className="text-sm text-slate-600">
                    {latestEvaluation.evaluationDate
                      ? new Date(latestEvaluation.evaluationDate).toLocaleString()
                      : 'Date unavailable'}
                  </p>
                  {latestEvaluation.notes && (
                    <p className="mt-3 text-sm text-slate-600 line-clamp-3">
                      {latestEvaluation.notes}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                    {(Object.keys(severityLabels) as Array<keyof EvaluationFormState['severity']>).map((key) => {
                      const propertyName = `${key}Severity` as keyof EvaluationResults;
                      const level = (latestEvaluation.results?.[propertyName] as SeverityLevel) || 'NONE';
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
                </article>
              ) : (
                <article className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-5 text-center text-slate-500">
                  <p className="text-sm font-medium text-slate-600">No evaluations recorded yet</p>
                </article>
              )}

              {latestMobileTest ? (
                <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-200/60">
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-500">
                    Latest Mobile Session
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {formatTestType(latestMobileTest.testType)}
                  </p>
                  <p className="text-sm text-slate-600">
                    {new Date(latestMobileTest.testDate).toLocaleString()}
                  </p>
                  {latestMobileTest.summary && (
                    <p className="mt-3 text-sm text-slate-600 line-clamp-3">
                      {latestMobileTest.summary}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {latestMobileTest.videoUrl && (
                      <button
                        type="button"
                        onClick={() => handleDownloadTestFile(latestMobileTest.id, 'video')}
                        className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={downloadingTestFileKey === `${latestMobileTest.id}:video`}
                      >
                        {downloadingTestFileKey === `${latestMobileTest.id}:video`
                          ? 'Preparing video…'
                          : 'Download video'}
                      </button>
                    )}
                    {latestMobileTest.csvUrl && (
                      <button
                        type="button"
                        onClick={() => handleDownloadTestFile(latestMobileTest.id, 'csv')}
                        className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={downloadingTestFileKey === `${latestMobileTest.id}:csv`}
                      >
                        {downloadingTestFileKey === `${latestMobileTest.id}:csv`
                          ? 'Preparing data…'
                          : 'Download CSV'}
                      </button>
                    )}
                    {latestMobileTest.questionsUrl && (
                      <button
                        type="button"
                        onClick={() => handleDownloadTestFile(latestMobileTest.id, 'questions')}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={downloadingTestFileKey === `${latestMobileTest.id}:questions`}
                      >
                        {downloadingTestFileKey === `${latestMobileTest.id}:questions`
                          ? 'Preparing responses…'
                          : 'Download JSON'}
                      </button>
                    )}
                  </div>
                </article>
              ) : (
                <article className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-5 text-center text-slate-500">
                  <p className="text-sm font-medium text-slate-600">No mobile sessions recorded yet</p>
                </article>
              )}
            </div>
          </section>
        )}

        {patient.user && !patient.user.isActive && (
          <section className="rounded-3xl border border-amber-100 bg-white p-6 shadow-lg shadow-amber-100/40 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-amber-900">Activate Portal Access</h2>
                <p className="mt-1 text-sm text-amber-700/80">
                  Send the activation code directly to the patient or copy it to share manually.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-200">
                Activation required
              </span>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div>
                <label htmlFor="activationEmail" className="text-sm font-semibold text-amber-900">
                  Recipient Email
                </label>
                <input
                  id="activationEmail"
                  type="email"
                  className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-inner focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  value={activationEmail}
                  onChange={(e) => setActivationEmail(e.target.value)}
                  placeholder="patient@example.com"
                />
                <p className="mt-2 text-xs text-amber-700/70">
                  Leave blank to generate a code you can copy and share securely through another channel.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleGenerateActivationCode}
                  disabled={activationGenerating}
                  className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-200 transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {activationGenerating ? 'Generating…' : 'Generate Activation Code'}
                </button>
                {activationError && (
                  <p className="text-sm font-medium text-red-600">{activationError}</p>
                )}
                {activationSuccess && (
                  <p className="text-sm font-medium text-emerald-700">{activationSuccess}</p>
                )}
              </div>
            </div>

            {activationInfo && (
              <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50/80 p-5 text-sm text-amber-900 shadow-inner">
                <p className="font-semibold">
                  Code:{' '}
                  <span className="rounded-lg bg-white px-2 py-1 font-mono text-base tracking-wide">
                    {activationInfo.code}
                  </span>
                </p>
                <p className="mt-2 text-amber-800/80">
                  Expires: {new Date(activationInfo.expiresAt).toLocaleString()}
                </p>
                {activationInfo.sentTo && (
                  <p className="mt-1 text-amber-800/80">
                    Sent to: <strong>{activationInfo.sentTo}</strong>
                  </p>
                )}
                {activationInfo.link && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <span className="flex-1 break-all rounded-lg bg-white/80 px-3 py-2 text-xs text-amber-800/90 shadow-inner">
                      {activationInfo.link}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(activationInfo.link!);
                          setActivationError('');
                          setActivationSuccess('Invitation link copied to clipboard.');
                        } catch (copyError) {
                          console.error('Clipboard copy failed', copyError);
                          setActivationSuccess('');
                          setActivationError('Unable to copy the invitation link.');
                        }
                      }}
                      className="inline-flex items-center justify-center rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-amber-600"
                    >
                      Copy Link
                    </button>
                  </div>
                )}
                <p className="mt-3 text-xs text-amber-700/70">
                  Share this secure invite with the patient so they can finish activating their account.
                </p>
              </div>
            )}
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Mobile Test</h2>
              <p className="text-sm text-slate-600">
                Review uploads captured in the AudioSight mobile app and access their source files.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                {testResultsLoading ? 'Refreshing…' : `${totalTestResults} recorded`}
              </span>
              <button
                type="button"
                onClick={refreshTestResults}
                disabled={testResultsLoading}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {testResultsLoading && testResults.length === 0 ? (
            <div className="mt-10 flex justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
            </div>
          ) : testResults.length > 0 ? (
            <div className="mt-6 space-y-5">
              {testResults.map((test) => {
                const testDate = new Date(test.testDate).toLocaleString();
                const uploadedAt = new Date(test.createdAt).toLocaleString();
                const metadataEntries =
                  test.metadata && typeof test.metadata === 'object' && !Array.isArray(test.metadata)
                    ? Object.entries(test.metadata as Record<string, unknown>)
                    : [];
                const analysisEntries =
                  test.analysis && typeof test.analysis === 'object' && !Array.isArray(test.analysis)
                    ? Object.entries(test.analysis as Record<string, unknown>)
                    : [];

                return (
                  <article
                    key={test.id}
                    className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-200/50"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {formatTestType(test.testType)}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">Recorded {testDate}</p>
                        <p className="text-xs text-slate-400">Test ID: {test.testId}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {test.videoUrl && (
                          <button
                            type="button"
                            onClick={() => handleDownloadTestFile(test.id, 'video')}
                            className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={downloadingTestFileKey === `${test.id}:video`}
                          >
                            {downloadingTestFileKey === `${test.id}:video` ? 'Preparing video…' : 'Download video'}
                          </button>
                        )}
                        {test.csvUrl && (
                          <button
                            type="button"
                            onClick={() => handleDownloadTestFile(test.id, 'csv')}
                            className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={downloadingTestFileKey === `${test.id}:csv`}
                          >
                            {downloadingTestFileKey === `${test.id}:csv` ? 'Preparing data…' : 'Download CSV'}
                          </button>
                        )}
                        {test.questionsUrl && (
                          <button
                            type="button"
                            onClick={() => handleDownloadTestFile(test.id, 'questions')}
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
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

                    {metadataEntries.length > 0 && (
                      <div className="mt-5">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Metadata</h3>
                        <dl className="mt-2 grid gap-3 sm:grid-cols-2">
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
                      <div className="mt-5">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Analysis</h3>
                        <dl className="mt-2 grid gap-3 sm:grid-cols-2">
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

                    <div className="mt-6 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                      <span>Recorded {testDate}</span>
                      <span className="sm:text-right">Uploaded {uploadedAt}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
              <span className="text-3xl font-semibold text-slate-500">No Data</span>
              <p className="mt-3 text-base font-semibold text-slate-600">No mobile tests recorded yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Once the patient completes a mobile session, it will be visible here automatically.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Clinical Test</h2>
              <p className="text-sm text-slate-600">
                Monitor clinical assessments, linked audiograms, and condition progress.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateEvaluationModal}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-slate-700"
            >
              <span aria-hidden>＋</span> New Evaluation
            </button>
          </div>

          {summaryFeedback && (
            <div
              className={`mt-4 rounded-2xl border p-3 text-sm ${
                summaryFeedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50/90 text-emerald-700'
                  : 'border-red-200 bg-red-50/90 text-red-700'
              }`}
            >
              {summaryFeedback.message}
            </div>
          )}

          {evaluations.length > 0 ? (
            <div className="mt-6 space-y-5">
              {evaluations.map((evaluation) => {
                const evaluationDate = evaluation.evaluationDate
                  ? new Date(evaluation.evaluationDate).toLocaleDateString()
                  : 'N/A';
                const severityEntries = (
                  Object.keys(severityLabels) as Array<keyof EvaluationFormState['severity']>
                ).map((key) => {
                  const propertyName = `${key}Severity` as keyof EvaluationResults;
                  const level = (evaluation.results?.[propertyName] as SeverityLevel) || 'NONE';
                  return {
                    key,
                    label: severityLabels[key],
                    level
                  };
                });
                const linkedAudiograms = (evaluation.audiograms || []).map((link) => {
                  return (
                    audiograms.find((item) => item.id === link.id) || {
                      id: link.id,
                      testDate: link.testDate,
                      fileType: link.fileType,
                      summary: null,
                      summaryGeneratedAt: null
                    }
                  );
                });

                return (
                  <article
                    key={evaluation.id}
                    className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-200/50"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {evaluationDate}
                        </p>
                        <p className="mt-1 text-xl font-semibold text-slate-900">
                          {evaluation.evaluationType}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openEditEvaluationModal(evaluation)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                      >
                        ✎ Edit
                      </button>
                    </div>

                    <div className="mt-6 grid gap-5 lg:grid-cols-12 lg:items-stretch">
                      <div className="flex h-full flex-col space-y-4 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-5 lg:col-span-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{evaluation.evaluationType}</p>
                          <p className="text-xs text-slate-500">Evaluated on {evaluationDate}</p>
                        </div>

                        {evaluation.evaluatorName && (
                          <div className="border-t border-slate-200 pt-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evaluator</p>
                            <p className="mt-1 text-sm text-slate-700">{evaluation.evaluatorName}</p>
                          </div>
                        )}

                        {evaluation.conditionCategory && evaluation.conditionSeverity && (
                          <div className="border-t border-slate-200 pt-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Primary Outcome
                            </p>
                            <p className="mt-1 text-sm text-slate-700">
                              {evaluation.conditionCategory.replace(/_/g, ' ')}
                            </p>
                            <span
                              className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getSeverityBadgeStyles(evaluation.conditionSeverity as SeverityLevel)}`}
                            >
                              {formatSeverityLabel(evaluation.conditionSeverity as SeverityLevel)}
                            </span>
                          </div>
                        )}

                        {evaluation.notes && (
                          <div className="border-t border-slate-200 pt-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Clinical Notes
                            </p>
                            <p className="mt-2 text-sm leading-relaxed text-slate-700">{evaluation.notes}</p>
                          </div>
                        )}

                        <div className="border-t border-slate-200 pt-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Condition Details
                          </p>
                          <div className="space-y-2">
                            {severityEntries.map(({ key, label, level }) => (
                              <div key={key} className="flex items-center justify-between">
                                <span className="text-xs text-slate-600">{label}</span>
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getSeverityBadgeStyles(level)}`}
                                >
                                  {formatSeverityLabel(level)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex h-full flex-col rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 lg:col-span-8">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Linked Audiograms & Summaries
                        </p>
                        <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
                          {linkedAudiograms.length > 0 ? (
                            linkedAudiograms.map((item) => {
                              const isBusy = summaryLoading[item.id];
                              const summaryReady = !!item.summary;
                              const currentDraft = summaryDrafts[item.id] || '';

                              return (
                                <div
                                  key={item.id}
                                  className="space-y-4 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm font-semibold text-indigo-900">Summary</span>
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleDownload(item.id)}
                                        className="inline-flex items-center justify-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm ring-1 ring-inset ring-indigo-200 transition hover:bg-indigo-600 hover:text-white"
                                      >
                                        Open
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleGenerateSummary(item.id)}
                                        disabled={isBusy}
                                        className="inline-flex items-center justify-center rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-70"
                                      >
                                        {isBusy ? 'Generating…' : summaryReady ? 'Regenerate' : 'Generate Summary'}
                                      </button>
                                    </div>
                                  </div>

                                  {summaryReady ? (
                                    <>
                                      <textarea
                                        value={currentDraft}
                                        onChange={(event) => updateSummaryDraft(item.id, event.target.value)}
                                        rows={6}
                                        className="w-full rounded-xl border border-indigo-100 bg-indigo-50/40 px-3 py-3 text-sm leading-relaxed text-slate-900 shadow-inner focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                        placeholder="AI-generated summary will appear here..."
                                      />
                                      <div className="flex justify-end">
                                        <button
                                          type="button"
                                          onClick={() => handleSaveSummary(item.id)}
                                          disabled={isBusy}
                                          className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                          {isBusy ? 'Saving…' : 'Save Summary'}
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <p className="text-xs text-indigo-500/80 italic">
                                      No summary available. Click &quot;Generate Summary&quot; to create one.
                                    </p>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="rounded-2xl border border-dashed border-indigo-200 bg-white/60 p-4 text-xs text-indigo-600">
                              No audiograms linked yet. Add one when editing this evaluation.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
              <span className="text-4xl">🩺</span>
              <p className="mt-3 text-base font-semibold text-slate-600">No evaluations recorded yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Capture a new clinical evaluation to begin tracking outcomes and summaries.
              </p>
            </div>
          )}
        </section>
      </div>

      {isEvaluationModalOpen && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeEvaluationModal} />
            <div className="relative z-10 flex min-h-full w-full items-start justify-center overflow-y-auto px-4 py-6 sm:py-12">
              <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                <form
                  onSubmit={handleEvaluationSubmit}
                  className="max-h-[calc(100vh-4rem)] overflow-y-auto space-y-6 p-6 sm:p-8"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">
                        {evaluationModalMode === 'create' ? 'New Evaluation' : 'Edit Evaluation'}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {evaluationModalMode === 'create'
                          ? 'Record a clinical assessment, attach audiograms, and let AI create summaries.'
                          : 'Update the evaluation details or attach additional audiogram data.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeEvaluationModal}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                    >
                      Close
                    </button>
                  </div>

                  {evaluationModalError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                      {evaluationModalError}
                    </div>
                  )}
                  {evaluationModalSuccess && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                      {evaluationModalSuccess}
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                      Evaluation Date *
                      <input
                        type="date"
                        value={evaluationForm.evaluationDate}
                        onChange={(event) => handleEvaluationDateChange(event.target.value)}
                        required
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                      Evaluation Type
                      <select
                        value={evaluationForm.evaluationType}
                        onChange={(event) =>
                          setEvaluationField('evaluationType', event.target.value as EvaluationFormState['evaluationType'])
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      >
                        {evaluationTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                      Evaluator Name
                      <input
                        type="text"
                        placeholder={defaultEvaluatorName || 'Dr. Jane Doe'}
                        value={evaluationForm.evaluatorName}
                        onChange={(event) => setEvaluationField('evaluatorName', event.target.value)}
                        className={`rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 ${
                          isEvaluatorNameUsingDefault ? 'text-slate-500' : 'text-slate-900'
                        }`}
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                      Clinical Notes
                      <textarea
                        value={evaluationForm.notes}
                        onChange={(event) => setEvaluationField('notes', event.target.value)}
                        rows={3}
                        placeholder="Key findings, patient feedback, follow-up considerations…"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Condition Results</h4>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {(Object.keys(severityLabels) as Array<keyof EvaluationFormState['severity']>).map((key) => (
                        <label
                          key={key}
                          className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-sm font-medium text-slate-700"
                        >
                          {severityLabels[key]}
                          <select
                            value={evaluationForm.severity[key]}
                            onChange={(event) => setEvaluationSeverity(key, event.target.value as SeverityLevel)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                          >
                            {severityChoices.map((choice) => (
                              <option key={choice} value={choice}>
                                {formatSeverityLabel(choice)}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Audiogram Attachment
                      </h4>
                      <span className="text-xs text-slate-400">
                        Optional — attach to auto-link this evaluation with an audiogram.
                      </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                        File
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.webp"
                          onChange={(event) => handleEvaluationFileChange(event.target.files?.[0] || null)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                        Test Date
                        <input
                          type="date"
                          value={evaluationForm.testDate}
                          onChange={(event) => setEvaluationField('testDate', event.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                        Left Ear Data (JSON)
                        <textarea
                          value={evaluationForm.leftEarData}
                          onChange={(event) => setEvaluationField('leftEarData', event.target.value)}
                          placeholder='{"250": 20, "500": 25}'
                          rows={3}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                        Right Ear Data (JSON)
                        <textarea
                          value={evaluationForm.rightEarData}
                          onChange={(event) => setEvaluationField('rightEarData', event.target.value)}
                          placeholder='{"250": 15, "500": 20}'
                          rows={3}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={evaluationForm.autoGenerateSummary}
                        onChange={(event) => setEvaluationField('autoGenerateSummary', event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Generate AI summary automatically after upload
                    </label>
                    {evaluationForm.autoGenerateSummary && (
                      <textarea
                        value={evaluationForm.summaryPrompt}
                        onChange={(event) => setEvaluationField('summaryPrompt', event.target.value)}
                        rows={3}
                        placeholder="Optional: Provide guidance for the AI summary."
                        className="w-full rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-sm text-indigo-900 shadow-inner focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-500">
                      Saved evaluations can be revisited and edited at any time.
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={closeEvaluationModal}
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={evaluationModalLoading}
                        className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {evaluationModalLoading
                          ? 'Saving…'
                          : evaluationModalMode === 'create'
                          ? 'Save Evaluation'
                          : 'Update Evaluation'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default function PatientDetailPage() {
  return (
    <ProtectedRoute requireAdmin>
      <PatientDetailContent />
    </ProtectedRoute>
  );
}
