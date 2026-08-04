'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useDocumentStore } from '@/lib/store/document-store';

/**
 * Bridges NextAuth session state into the document store so the app
 * automatically switches between cloud (signed in) and offline (guest) modes
 * and refetches the user's documents on sign-in/sign-out.
 */
export function useAuthSync() {
  const { status } = useSession();
  const setAuthStatus = useDocumentStore((s) => s.setAuthStatus);

  useEffect(() => {
    setAuthStatus(status);
  }, [status, setAuthStatus]);
}
