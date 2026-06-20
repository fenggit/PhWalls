'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import ShareCardDialog from '@/components/ShareCardDialog';
import { normalizeShareImages, type ShareCardPayload } from '@/lib/share';

interface ShareContextValue {
  sharePayload: ShareCardPayload | null;
  setSharePayload: (payload: ShareCardPayload | null) => void;
  openShare: () => void;
}

const ShareContext = createContext<ShareContextValue | undefined>(undefined);

export function ShareProvider({ children }: { children: ReactNode }) {
  const [sharePayload, setSharePayloadState] = useState<ShareCardPayload | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);

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

  const openShare = useCallback(() => {
    setIsShareOpen(true);
  }, []);

  const closeShare = useCallback(() => {
    setIsShareOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      sharePayload,
      setSharePayload,
      openShare,
    }),
    [openShare, setSharePayload, sharePayload]
  );

  return (
    <ShareContext.Provider value={value}>
      {children}
      <ShareCardDialog
        isOpen={isShareOpen}
        onClose={closeShare}
        payload={sharePayload}
      />
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
