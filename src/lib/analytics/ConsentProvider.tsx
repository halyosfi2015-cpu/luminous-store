'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getConsent, grantConsent, revokeConsent } from './client';

type ConsentContextType = {
  ready: boolean;
  granted: boolean | null;
  grant: () => void;
  revoke: () => void;
};

const ConsentContext = createContext<ConsentContextType | null>(null);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    // Defer localStorage read to avoid synchronous setState cascading renders.
    const id = setTimeout(() => {
      setGranted(getConsent());
      setReady(true);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const grant = useCallback(() => {
    grantConsent();
    setGranted(true);
  }, []);

  const revoke = useCallback(() => {
    revokeConsent();
    setGranted(false);
  }, []);

  return (
    <ConsentContext.Provider value={{ ready, granted, grant, revoke }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextType {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent must be used within ConsentProvider');
  return ctx;
}
