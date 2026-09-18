import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, firstFieldError } from '@/lib/api';
import { ErrorNote, Spinner } from '@/components/ui';
import { useAuth } from '@/store/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    displayName: '',
    username: '',
    email: '',
    password: '',
    location: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await register({
        displayName: form.displayName.trim(),
        username: form.username.trim().toLowerCase(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        location: form.location.trim() || undefined,
      });
      navigate('/', { replace: true });
    } catch (err) {
      const apiError = err as ApiError;
      setError(firstFieldError(apiError.details) ?? apiError.message);
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

        <h1 className="font-display text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="hint mt-1">Bid, list your own lots, and keep a watchlist.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {error ? <ErrorNote message={error} /> : null}

          <div>
            <label className="label" htmlFor="displayName">Display name</label>
            <input
              id="displayName"
              className="field"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              autoComplete="name"
              required
              minLength={2}
            />
          </div>

          <div>
            <label className="label" htmlFor="username">Username</label>
            <input
              id="username"
              className="field"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              autoComplete="username"
              required
              minLength={3}
              pattern="[a-z0-9_]+"
            />
            <p className="hint mt-1">Letters, numbers and underscores. This is your public handle.</p>
          </div>

          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="field"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="field"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              required
              minLength={8}
            />
            <p className="hint mt-1">At least 8 characters.</p>
          </div>

          <div>
            <label className="label" htmlFor="location">Location (optional)</label>
            <input
              id="location"
              className="field"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Chennai, TN"
            />
          </div>

          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Create account
          </button>
        </form>

        <p className="hint mt-6 text-center">
          Already have an account? <Link to="/login" className="text-bid">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
