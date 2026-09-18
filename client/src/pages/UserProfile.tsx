import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { LogOut, Moon, Sun } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Avatar, ErrorNote, Spinner } from '@/components/ui';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import { useToast } from '@/store/ToastContext';
import { formatDate } from '@/lib/format';
import type { CurrentUser } from '@/shared/types';

export default function UserProfile() {
  const { user, updateUser, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    displayName: user?.displayName ?? '',
    bio: user?.bio ?? '',
    location: user?.location ?? '',
    avatarUrl: user?.avatarUrl ?? '',
  });

  const save = useMutation({
    mutationFn: () =>
      api<{ user: CurrentUser }>('/users/me/profile', { method: 'PATCH', json: form }),
    onSuccess: (data) => {
      updateUser(data.user);
      setError(null);
      toast({ tone: 'success', title: 'Profile updated' });
    },
    onError: (err) => setError((err as ApiError).message),
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8 flex items-center gap-4">
        <Avatar src={user.avatarUrl} name={user.displayName} size={64} />
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{user.displayName}</h1>
          <p className="hint">
            @{user.username} · {user.email}
          </p>
          {user.createdAt ? <p className="hint">Member since {formatDate(user.createdAt)}</p> : null}
        </div>
      </header>

      {error ? <div className="mb-5"><ErrorNote message={error} /></div> : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          save.mutate();
        }}
        className="card space-y-4 p-5"
      >
        <h2 className="font-display text-lg font-semibold">Your details</h2>

        <div>
          <label className="label" htmlFor="displayName">Display name</label>
          <input
            id="displayName"
            className="field"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            maxLength={48}
            required
          />
          <p className="hint mt-1">
            This is what sellers see. Bidders are shown to other users as per-auction aliases, never
            by name.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            className="field min-h-[6rem]"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            maxLength={400}
            placeholder="What you collect, what you sell, how fast you ship."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="location">Location</label>
            <input
              id="location"
              className="field"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              maxLength={80}
              placeholder="Hyderabad, TS"
            />
          </div>
          <div>
            <label className="label" htmlFor="avatarUrl">Avatar URL</label>
            <input
              id="avatarUrl"
              className="field"
              value={form.avatarUrl}
              onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
              placeholder="https://…"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={save.isPending} className="btn-primary">
            {save.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Save changes
          </button>
        </div>
      </form>

      <section className="card mt-5 space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Preferences</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Appearance</p>
            <p className="hint">BidNova defaults to dark. Auctions are mostly watched at night.</p>
          </div>
          <button onClick={toggle} className="btn-ghost shrink-0">
            {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </section>

      <section className="card mt-5 space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Your activity</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link to="/my-bids" className="btn-quiet justify-center">My bids</Link>
          <Link to="/my-auctions" className="btn-quiet justify-center">My auctions</Link>
          <Link to="/watchlist" className="btn-quiet justify-center">Watchlist</Link>
          <Link to="/orders" className="btn-quiet justify-center">Orders</Link>
        </div>
      </section>

      <button onClick={signOut} className="btn-ghost mt-5 w-full text-urgent">
        <LogOut className="mr-2 h-4 w-4" aria-hidden /> Sign out
      </button>
    </div>
  );
}
