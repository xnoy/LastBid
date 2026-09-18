import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Horizontal scroller used by the home rails. Arrows appear on pointer devices;
 * touch users just swipe, with scroll snapping so cards land cleanly.
 */
export function Rail({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const scrollBy = (direction: 1 | -1) => {
    ref.current?.scrollBy({ left: direction * 560, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        className="rail flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
      >
        {children}
      </div>

      <div className="pointer-events-none absolute inset-y-0 -left-2 hidden items-center lg:flex">
        <button
          onClick={() => scrollBy(-1)}
          aria-label="Scroll left"
          className="pointer-events-auto rounded-full border border-line bg-surface p-2 shadow-lift transition-colors hover:bg-raised"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
      <div className="pointer-events-none absolute inset-y-0 -right-2 hidden items-center lg:flex">
        <button
          onClick={() => scrollBy(1)}
          aria-label="Scroll right"
          className="pointer-events-auto rounded-full border border-line bg-surface p-2 shadow-lift transition-colors hover:bg-raised"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
