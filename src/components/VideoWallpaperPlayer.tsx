'use client';

import { useRef, useState } from 'react';
import { trackAnalyticsEvent, type AnalyticsEventParams } from '@/lib/analytics';
import { RefreshCw } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';

type Props = {
  url: string; poster?: string; label: string; refreshToken: number;
  immersive?: boolean; onToggleImmersive?: () => void;
  analyticsParams?: AnalyticsEventParams; onReady?: () => void;
};

export default function VideoWallpaperPlayer({ url, poster, label, refreshToken, immersive = false, onToggleImmersive, analyticsParams, onReady }: Props) {
  const { texts } = useLanguage();
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const source = `${url}&reload=${refreshToken}-${attempt}`;
  const playback = useRef({ source, startedAt: performance.now(), played: false, bufferingAt: 0, milestones: new Set<number>() });
  if (playback.current.source !== source) {
    playback.current = { source, startedAt: performance.now(), played: false, bufferingAt: 0, milestones: new Set<number>() };
  }

  return (
    <div className="relative h-full w-full">
      <video key={source} src={source} poster={poster || undefined}
        controls={!immersive && !loading && !failed} autoPlay playsInline loop muted preload="metadata" aria-label={label} tabIndex={0}
        title={immersive ? texts.videoExitImmersive : texts.videoEnterImmersive}
        className={`h-full w-full ${immersive ? 'object-contain cursor-zoom-out' : 'object-cover cursor-zoom-in'}`}
        onClick={(event) => {
          // Native playback/seek/fullscreen controls occupy the bottom of the video.
          if (!immersive && event.clientY > event.currentTarget.getBoundingClientRect().bottom - 64) return;
          onToggleImmersive?.();
        }}
        onWaiting={() => {
          setLoading(true);
          if (playback.current.played && !playback.current.bufferingAt) playback.current.bufferingAt = performance.now();
        }}
        onCanPlay={() => setLoading(false)}
        onPlaying={() => {
          setLoading(false);
          if (!playback.current.played) {
            playback.current.played = true;
            onReady?.();
            trackAnalyticsEvent('w_video_play', { ...analyticsParams, playback_mode: 'autoplay',
              load_ms: Math.round(performance.now() - playback.current.startedAt) });
          }
          if (playback.current.bufferingAt) {
            trackAnalyticsEvent('w_video_buffer', { ...analyticsParams,
              duration_ms: Math.round(performance.now() - playback.current.bufferingAt) });
            playback.current.bufferingAt = 0;
          }
        }}
        onTimeUpdate={(event) => {
          const { currentTime, duration } = event.currentTarget;
          if (!Number.isFinite(duration) || duration <= 0) return;
          [25, 50, 75].forEach(percent => {
            if (currentTime / duration * 100 >= percent && !playback.current.milestones.has(percent)) {
              playback.current.milestones.add(percent);
              trackAnalyticsEvent('w_video_progress', { ...analyticsParams, percent });
            }
          });
        }}
        onError={(event) => {
          setLoading(false); setFailed(true);
          trackAnalyticsEvent('w_media_error', { ...analyticsParams, media_location: 'preview',
            error_code: 'video_load', media_error_code: event?.currentTarget.error?.code });
        }} />
      {loading && !failed && (
        <div role="status" aria-label={texts.videoLoading} className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/50 border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
        </div>
      )}
      {failed && (
        <div role="alert" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 px-8 text-center text-sm text-white/80">
          <p>{texts.videoLoadFailed}</p>
          <button type="button" onClick={() => {
            trackAnalyticsEvent('w_video_retry', analyticsParams);
            setFailed(false); setLoading(true); setAttempt(value => value + 1);
          }}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-white hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />{texts.retryVideo}
          </button>
        </div>
      )}
    </div>
  );
}
