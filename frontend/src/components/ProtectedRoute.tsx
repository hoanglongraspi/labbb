'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const useStoreHydration = () => {
  const storePersist = (useAuthStore as any).persist;
  const [hydrated, setHydrated] = useState(storePersist?.hasHydrated?.() ?? false);

  useEffect(() => {
    const finishHydration = storePersist?.onFinishHydration?.(() => setHydrated(true));
    const startHydration = storePersist?.onHydrate?.(() => setHydrated(false));

    setHydrated(storePersist?.hasHydrated?.() ?? false);

    return () => {
      finishHydration?.();
      startHydration?.();
    };
  }, [storePersist]);

  return hydrated;
};

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isAdmin } = useAuthStore();
  const isHydrated = useStoreHydration();

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (requireAdmin && !isAdmin()) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isAdmin, requireAdmin, router, isHydrated]);

  if (!isHydrated || !isAuthenticated() || (requireAdmin && !isAdmin())) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
