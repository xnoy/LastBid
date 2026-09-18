import { useEffect, useState } from 'react';

/**
 * One timer for every countdown on the page.
 *
 * A grid can hold forty auction cards. Forty `setInterval`s would each schedule
 * their own React update; instead a single interval ticks once a second and
 * notifies subscribers, so one render pass covers the whole grid.
 */
type Listener = (now: number) => void;

const listeners = new Set<Listener>();
let timer: number | null = null;

function start(): void {
  if (timer !== null) return;
  timer = window.setInterval(() => {
    const now = Date.now();
    for (const listener of listeners) listener(now);
  }, 1000);
}

function stop(): void {
  if (timer !== null && listeners.size === 0) {
    window.clearInterval(timer);
    timer = null;
  }
}

/** Milliseconds remaining until `endsAt`, updated once a second. */
export function useCountdown(endsAt: string | number | Date | null | undefined): number {
  const target = endsAt ? new Date(endsAt).getTime() : 0;
  const [remaining, setRemaining] = useState(() => Math.max(0, target - Date.now()));

  useEffect(() => {
    if (!target) return;
    setRemaining(Math.max(0, target - Date.now()));

    const listener: Listener = (now) => setRemaining(Math.max(0, target - now));
    listeners.add(listener);
    start();

    return () => {
      listeners.delete(listener);
      stop();
    };
  }, [target]);

  return remaining;
}
