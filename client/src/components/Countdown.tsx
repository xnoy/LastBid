import clsx from 'clsx';
import { useCountdown } from '@/hooks/useCountdown';
import { splitDuration } from '@/lib/format';

interface Props {
  endsAt: string | number | Date;
  /** `compact` for cards, `full` for the auction page. */
  variant?: 'compact' | 'full';
  className?: string;
  onExpire?: () => void;
}

/**
 * The clock is the loudest element on an auction card, so it changes character
 * as time runs out: neutral above an hour, gold under an hour, red under five
 * minutes with a pulse. That is the one place colour is allowed to shout.
 */
export function Countdown({ endsAt, variant = 'compact', className, onExpire }: Props) {
  const remaining = useCountdown(endsAt);
  const { d, h, m, s } = splitDuration(remaining);

  const urgent = remaining > 0 && remaining < 5 * 60_000;
  const soon = remaining > 0 && remaining < 60 * 60_000;

  if (remaining <= 0) {
    onExpire?.();
    return (
      <span className={clsx('tabular text-muted', className)}>Ended</span>
    );
  }

  const parts = d > 0 ? [`${d}d`, `${h}h`] : h > 0 ? [`${h}h`, `${m}m`] : [`${m}m`, `${String(s).padStart(2, '0')}s`];

  if (variant === 'compact') {
    return (
      <span
        className={clsx(
          'tabular font-semibold',
          urgent ? 'text-urgent' : soon ? 'text-gold' : 'text-ink',
          className,
        )}
      >
        {parts.join(' ')}
      </span>
    );
  }

  const blocks: Array<[number, string]> = d > 0
    ? [[d, 'days'], [h, 'hrs'], [m, 'min'], [s, 'sec']]
    : [[h, 'hrs'], [m, 'min'], [s, 'sec']];

  return (
    <div
      className={clsx(
        'inline-flex items-stretch gap-1.5 rounded-xl p-1',
        urgent && 'animate-pulse-ring',
        className,
      )}
    >
      {blocks.map(([value, label]) => (
        <div
          key={label}
          className={clsx(
            'min-w-[3.25rem] rounded-lg px-2.5 py-2 text-center',
            urgent ? 'bg-urgent/10' : soon ? 'bg-gold/10' : 'bg-raised',
          )}
        >
          <div
            className={clsx(
              'tabular font-display text-xl font-semibold leading-none',
              urgent ? 'text-urgent' : soon ? 'text-gold' : 'text-ink',
            )}
          >
            {String(value).padStart(2, '0')}
          </div>
          <div className="mt-1 text-[0.65rem] text-muted">{label}</div>
        </div>
      ))}
    </div>
  );
}
