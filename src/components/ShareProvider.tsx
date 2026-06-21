'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { normalizeShareImages, type ShareCardPayload } from '@/lib/share';

interface ShareContextValue {
  sharePayload: ShareCardPayload | null;
  setSharePayload: (payload: ShareCardPayload | null) => void;
}

const ShareContext = createContext<ShareContextValue | undefined>(undefined);

export function ShareProvider({ children }: { children: ReactNode }) {
  const [sharePayload, setSharePayloadState] = useState<ShareCardPayload | null>(null);

  const setSharePayload = useCallback((payload: ShareCardPayload | null) => {
    if (!payload) {
      setSharePayloadState(null);
      return;
    }

    setSharePayloadState({
      ...payload,
      title: String(payload.title || '').trim(),
      url: String(payload.url || '').trim(),
      brand: String(payload.brand || '').trim(),
      images: normalizeShareImages(payload.images),
    });
  }, []);

  const value = useMemo(
    () => ({
      sharePayload,
      setSharePayload,
    }),
    [setSharePayload, sharePayload]
  );

  return (
    <ShareContext.Provider value={value}>
      {children}
    </ShareContext.Provider>
  );
}

export function useShare() {
  const context = useContext(ShareContext);

  if (!context) {
    throw new Error('useShare must be used within a ShareProvider');
  }

  return context;
}
