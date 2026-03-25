'use client';

import Script from 'next/script';

export default function AdSenseScript() {
  if (process.env.NEXT_PUBLIC_ENABLE_ADS !== 'true') {
    return null;
  }

  return (
    <Script
      id="adsense-script"
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4449597016215208"
      crossOrigin="anonymous"
      strategy="lazyOnload"
    />
  );
}
