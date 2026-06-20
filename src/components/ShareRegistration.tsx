'use client';

import { useEffect } from 'react';
import { useShare } from '@/components/ShareProvider';
import type { ShareCardPayload } from '@/lib/share';

interface ShareRegistrationProps {
  payload: ShareCardPayload;
}

export default function ShareRegistration({ payload }: ShareRegistrationProps) {
  const { setSharePayload } = useShare();

  useEffect(() => {
    setSharePayload(payload);

    return () => {
      setSharePayload(null);
    };
  }, [payload, setSharePayload]);

  return null;
}
