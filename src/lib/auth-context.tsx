'use client';

import { useSession } from 'next-auth/react';
import type { UserRole } from '@/lib/workflow-engine';
import { ROLE_LABELS } from '@/lib/workflow-engine';
import { useEffect } from 'react';

export function useAuth() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated' && typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.href = '/';
    }
  }, [status]);

  if (!session?.user) {
    return {
      currentRole: null as unknown as UserRole, // Set to null to prevent showing admin controls
      currentUser: { name: '', email: '', id: '' },
      setCurrentRole: () => {},
      isLoading: status === ('loading' as string),
    };
  }

  return {
    currentRole: (session.user.role || 'ADMIN') as UserRole,
    currentUser: {
      name: session.user.name || '',
      email: session.user.email || '',
      id: session.user.id || '',
    },
    setCurrentRole: () => {
      console.warn('setCurrentRole is disabled in real auth mode');
    },
    isLoading: status === ('loading' as string),
  };
}

export { ROLE_LABELS };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
