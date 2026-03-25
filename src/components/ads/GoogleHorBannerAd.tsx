'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export default function GoogleHorBannerAd() {
  if (process.env.NEXT_PUBLIC_ENABLE_ADS !== 'true') {
    return null;
  }

  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error('GoogleHorBannerAd error:', error);
    }
  }, []);

  return (
    <>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-4449597016215208"
        data-ad-slot="6746989980"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </>
  );
}
