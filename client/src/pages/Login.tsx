import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '@/lib/api';
import { ErrorNote, Spinner } from '@/components/ui';
import { useAuth } from '@/store/AuthContext';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signIn(emailOrUsername.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-bid text-white font-bold text-lg shadow-[0_0_15px_rgba(124,105,255,0.4)]">
            L
          </span>
          <span className="font-display text-2xl font-bold tracking-tight">Last<span className="text-bid">Bid</span></span>
        </Link>

        <h1 className="font-display text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="hint mt-1">Sign in to bid, sell and track your orders.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {error ? <ErrorNote message={error} /> : null}

          <div>
            <label className="label" htmlFor="identifier">Email or username</label>
            <input
              id="identifier"
              className="field"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Sign in
          </button>
        </form>

        <p className="hint mt-6 text-center">
          New here? <Link to="/register" className="text-bid">Create an account</Link>
        </p>

        <div className="card mt-6 p-4 text-sm">
          <p className="font-semibold text-ink">1-Click Demo Sign In</p>
          <p className="hint mt-0.5 text-xs">
            Instantly sign in to test buyer, seller, and bidding features (works online or offline):
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={async () => {
                const userEmail = 'devika_b@lastbid.test';
                setEmailOrUsername(userEmail);
                setPassword('lastbid123');
                setPending(true);
                try {
                  await signIn(userEmail, 'lastbid123');
                  navigate(from, { replace: true });
                } catch {
                  try {
                    await signIn('devika_b@bidnova.test', 'bidnova123');
                    navigate(from, { replace: true });
                  } catch (err) {
                    setError((err as ApiError).message);
                  }
                } finally {
                  setPending(false);
                }
              }}
              className="btn-ghost w-full justify-between text-xs py-2 px-3 hover:border-bid hover:text-bid"
            >
              <span>⚡ <strong>Devika B</strong> (Buyer)</span>
              <span className="text-muted text-[11px]">devika_b@lastbid.test</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                const userEmail = 'aria_vault@lastbid.test';
                setEmailOrUsername(userEmail);
                setPassword('lastbid123');
                setPending(true);
                try {
                  await signIn(userEmail, 'lastbid123');
                  navigate(from, { replace: true });
                } catch {
                  try {
                    await signIn('aria_vault@bidnova.test', 'bidnova123');
                    navigate(from, { replace: true });
                  } catch (err) {
                    setError((err as ApiError).message);
                  }
                } finally {
                  setPending(false);
                }
              }}
              className="btn-ghost w-full justify-between text-xs py-2 px-3 hover:border-gold hover:text-gold"
            >
              <span>📦 <strong>Aria Vault</strong> (Seller)</span>
              <span className="text-muted text-[11px]">aria_vault@lastbid.test</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                const userEmail = 'admin@lastbid.test';
                setEmailOrUsername(userEmail);
                setPassword('lastbid123');
                setPending(true);
                try {
                  await signIn(userEmail, 'lastbid123');
                  navigate(from, { replace: true });
                } catch {
                  try {
                    await signIn('admin@bidnova.test', 'bidnova123');
                    navigate(from, { replace: true });
                  } catch (err) {
                    setError((err as ApiError).message);
                  }
                } finally {
                  setPending(false);
                }
              }}
              className="btn-ghost w-full justify-between text-xs py-2 px-3 hover:border-win hover:text-win"
            >
              <span>🛡️ <strong>Admin</strong> (Console)</span>
              <span className="text-muted text-[11px]">admin@lastbid.test</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
