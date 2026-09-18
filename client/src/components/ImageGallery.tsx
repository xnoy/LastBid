import { useState } from 'react';
import { Play } from 'lucide-react';
import clsx from 'clsx';
import { extractYouTubeId, getYouTubeEmbedUrl } from '@/lib/video';

interface ImageGalleryProps {
  images: string[];
  title: string;
  videoUrl?: string | null;
}

export function ImageGallery({ images, title, videoUrl }: ImageGalleryProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isVideoActive, setIsVideoActive] = useState(false);

  const safeImages = images.length ? images : ['https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800'];
  const youtubeId = extractYouTubeId(videoUrl);
  const hasVideo = !!videoUrl;

  return (
    <div className="space-y-3">
      {/* Main Display Stage */}
      <div className="card relative aspect-square overflow-hidden bg-black flex items-center justify-center border border-line shadow-xl">
        {isVideoActive && hasVideo ? (
          youtubeId ? (
            <div className="relative h-full w-full bg-black">
              <iframe
                src={getYouTubeEmbedUrl(youtubeId, {
                  autoplay: true,
                  muted: false,
                  loop: true,
                  controls: true,
                })}
                title={`${title} — Video Reel`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
          ) : (
            <video
              src={videoUrl!}
              poster={safeImages[0]}
              controls
              autoPlay
              playsInline
              className="h-full w-full object-contain bg-black"
            />
          )
        ) : (
          <img
            src={safeImages[activeImageIndex]}
            alt={`${title} — view ${activeImageIndex + 1}`}
            className="h-full w-full object-cover transition-all duration-300"
          />
        )}

        {/* Floating Switcher Pill if Video is Available */}
        {hasVideo && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md shadow-lg">
            <span className="h-2 w-2 rounded-full bg-[#FF0055] animate-pulse" />
            <span>{isVideoActive ? 'Playing Video Reel' : 'Real Footage Available'}</span>
          </div>
        )}
      </div>

      {/* Thumbnails Row */}
      <div className="flex flex-wrap items-center gap-2">
        {safeImages.map((image, index) => {
          const isSelected = !isVideoActive && activeImageIndex === index;
          return (
            <button
              key={image}
              type="button"
              onClick={() => {
                setActiveImageIndex(index);
                setIsVideoActive(false);
              }}
              aria-label={`View photo ${index + 1}`}
              aria-current={isSelected}
              className={clsx(
                'relative h-16 w-16 overflow-hidden rounded-xl border-2 transition-all',
                isSelected
                  ? 'border-bid shadow-md scale-105 opacity-100'
                  : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <img src={image} alt="" className="h-full w-full object-cover" />
              {safeImages.length > 1 && (
                <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[9px] font-medium text-white/90">
                  {index + 1}
                </span>
              )}
            </button>
          );
        })}

        {/* Video Thumbnail Button if listing has video */}
        {hasVideo && (
          <button
            type="button"
            onClick={() => setIsVideoActive(true)}
            aria-label="Watch Video Reel"
            aria-current={isVideoActive}
            className={clsx(
              'group relative flex h-16 w-20 flex-col items-center justify-center overflow-hidden rounded-xl border-2 bg-gradient-to-br from-black via-[#1a0a14] to-[#2d0015] transition-all',
              isVideoActive
                ? 'border-[#FF0055] shadow-[0_0_15px_rgba(255,0,85,0.4)] scale-105 opacity-100'
                : 'border-white/10 opacity-80 hover:opacity-100 hover:border-[#FF0055]/50',
            )}
          >
            <img
              src={safeImages[0]}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-30 transition-transform group-hover:scale-110"
            />
            <div className="relative z-10 flex flex-col items-center">
              <Play className="h-4 w-4 fill-[#FF0055] text-[#FF0055] drop-shadow-[0_0_6px_rgba(255,0,85,0.6)]" />
              <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                Short
              </span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
