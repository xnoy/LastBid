import clsx from 'clsx';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

/** Small shared primitives. Kept together so they stay visually consistent. */

export function Avatar({
  src, name, size = 36, className,
}: { src?: string | null; name: string; size?: number; className?: string }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return src ? (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className={clsx('rounded-full object-cover', className)}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className={clsx('inline-flex items-center justify-center rounded-full bg-raised font-semibold text-muted', className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-win/12 text-win',
    SOLD: 'bg-bid/12 text-bid',
    UNSOLD: 'bg-raised text-muted',
    ENDED: 'bg-raised text-muted',
    CANCELLED: 'bg-urgent/12 text-urgent',
    SCHEDULED: 'bg-gold/12 text-gold',
  };
  const label: Record<string, string> = {
    ACTIVE: 'Live', SOLD: 'Sold', UNSOLD: 'Unsold',
    ENDED: 'Ended', CANCELLED: 'Withdrawn', SCHEDULED: 'Starting soon',
  };
  return <span className={clsx('pill', map[status] ?? 'bg-raised text-muted')}>{label[status] ?? status}</span>;
}

export function EmptyState({
  title, body, action,
}: { title: string; body: string; action?: { label: string; to: string } }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="hint max-w-sm">{body}</p>
      {action ? (
        <Link to={action.to} className="btn-primary mt-1">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-lg bg-raised', className)} />;
}

export function CardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card overflow-hidden">
          <Skeleton className="aspect-square rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SectionHeading({
  title, description, action,
}: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
        {description ? <p className="hint mt-1">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={clsx('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent', className)}
      aria-hidden
    />
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p className="rounded-xl bg-urgent/10 px-3.5 py-2.5 text-sm font-medium text-urgent" role="alert">
      {message}
    </p>
  );
}
