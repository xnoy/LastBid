/**
 * Video utility helpers for BidTok & product listing media galleries.
 * Supports YouTube Shorts, regular YouTube videos, and direct video files.
 */

/**
 * Extracts the 11-character YouTube video ID from various YouTube URL formats:
 * - https://youtube.com/shorts/oBhjX9_rmBg?si=...
 * - https://www.youtube.com/watch?v=oBhjX9_rmBg
 * - https://youtu.be/oBhjX9_rmBg
 * - https://www.youtube.com/embed/oBhjX9_rmBg
 */
export function extractYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:shorts\/|watch\?v=|embed\/|v\/|live\/))([a-zA-Z0-9_-]{11})/i,
  );
  return match ? match[1] : null;
}

export function isYouTubeUrl(url?: string | null): boolean {
  return extractYouTubeId(url) !== null;
}

export interface YouTubeEmbedOptions {
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
}

/**
 * Constructs an optimized youtube-nocookie embed URL with autoplay, loop, and API controls.
 */
export function getYouTubeEmbedUrl(videoId: string, options: YouTubeEmbedOptions = {}): string {
  const { autoplay = true, muted = true, loop = true, controls = false } = options;
  const params = new URLSearchParams({
    enablejsapi: '1',
    autoplay: autoplay ? '1' : '0',
    mute: muted ? '1' : '0',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    controls: controls ? '1' : '0',
  });
  if (loop) {
    params.set('loop', '1');
    params.set('playlist', videoId);
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
