'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export default function GoogleGridAds() {
  if (process.env.NEXT_PUBLIC_ENABLE_ADS !== 'true') {
    return null;
  }

  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error('GoogleGridAds error:', error);
    }
  }, []);

  return (
    <>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-format="autorelaxed"
        data-ad-client="ca-pub-4449597016215208"
        data-ad-slot="2920735124"
      />
    </>
  );
}
