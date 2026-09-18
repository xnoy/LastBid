import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import clsx from 'clsx';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  body?: string;
}

interface ToastContextValue {
  toast: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };
const TONES: Record<ToastTone, string> = {
  success: 'text-win',
  error: 'text-urgent',
  info: 'text-bid',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current.slice(-3), { ...input, id }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-20 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 sm:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((item) => {
          const Icon = ICONS[item.tone];
          return (
            <div key={item.id} className="card shadow-lift flex items-start gap-3 p-3.5">
              <Icon className={clsx('mt-0.5 h-5 w-5 shrink-0', TONES[item.tone])} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight">{item.title}</p>
                {item.body ? <p className="hint mt-0.5">{item.body}</p> : null}
              </div>
              <button onClick={() => dismiss(item.id)} className="btn-quiet -m-1 p-1" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
