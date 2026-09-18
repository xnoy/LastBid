import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Heart, Bell, Plus, Menu, X, Sun, Moon, LayoutGrid,
  Radio, Clapperboard, User as UserIcon, LogOut, Gavel,
} from 'lucide-react';
import clsx from 'clsx';
import { CATEGORIES } from '@/shared/categories';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { getSocket } from '@/lib/socket';
import { Avatar } from './ui';
import type { AppNotification } from '@/shared/types';

/**
 * Navigation.
 *
 * Desktop: a slim top bar with a category strip that expands on hover.
 * Mobile: a bottom tab bar, because this is a browsing app people use one
 * handed, and a hamburger for everything secondary.
 */
export function AppShell() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [menuOpen, setMenuOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setMenuOpen(false);
    setOpenCategory(null);
  }, [location.pathname]);

  const { data: notifications } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => api<{ items: AppNotification[]; unread: number }>('/notifications'),
    enabled: !!user,
    staleTime: 60_000,
  });

  // Push arrives over the socket; the badge updates without polling.
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    const onNotification = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    };
    socket.on('notification:new', onNotification);
    return () => {
      socket.off('notification:new', onNotification);
    };
  }, [user, queryClient]);

  const unread = notifications?.unread ?? 0;

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/marketplace?q=${encodeURIComponent(trimmed)}` : '/marketplace');
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-50 border-b border-line bg-canvas/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <button
            className="btn-quiet -ml-2 lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-bid text-white font-black text-base shadow-[0_0_15px_rgba(124,105,255,0.5)]">L</span>
            <span className="hidden sm:inline font-display text-xl font-bold tracking-tight">Last<span className="text-bid">Bid</span></span>
          </Link>

          <form onSubmit={submitSearch} className="ml-2 hidden flex-1 md:block">
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search auctions, brands, references"
                aria-label="Search auctions"
                className="field pl-10"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1">
            <button onClick={toggle} className="btn-quiet" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <Link to="/watchlist" className="btn-quiet hidden sm:inline-flex" aria-label="Watchlist">
              <Heart className="h-5 w-5" />
            </Link>

            <Link to="/notifications" className="btn-quiet relative hidden sm:inline-flex" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {unread > 0 ? (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-urgent px-1 text-[0.6rem] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              ) : null}
            </Link>

            <Link to="/sell" className="btn-primary hidden py-2 lg:inline-flex">
              <Plus className="h-4 w-4" /> Sell an item
            </Link>

            {user ? (
              <div className="group relative ml-1">
                <button className="flex items-center rounded-full" aria-label="Your account">
                  <Avatar src={user.avatarUrl} name={user.displayName} size={34} />
                </button>
                <div className="invisible absolute right-0 top-full w-52 pt-2 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="card overflow-hidden py-1 shadow-lift">
                    <p className="truncate px-4 py-2 text-sm font-semibold">{user.displayName}</p>
                    <Link to="/profile" className="block px-4 py-2 text-sm hover:bg-raised">Your profile</Link>
                    <Link to="/my-bids" className="block px-4 py-2 text-sm hover:bg-raised">Your bids</Link>
                    <Link to="/my-auctions" className="block px-4 py-2 text-sm hover:bg-raised">Your listings</Link>
                    <Link to="/orders" className="block px-4 py-2 text-sm hover:bg-raised">Orders</Link>
                    {user.role === 'ADMIN' ? (
                      <Link to="/admin" className="block px-4 py-2 text-sm hover:bg-raised">Admin</Link>
                    ) : null}
                    <button
                      onClick={signOut}
                      className="flex w-full items-center gap-2 border-t border-line px-4 py-2 text-left text-sm text-muted hover:bg-raised"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/login" className="btn-ghost ml-1">Sign in</Link>
            )}
          </div>
        </div>

        {/* Category strip — desktop only, opens a panel of subcategories. */}
        <nav className="hidden border-t border-line lg:block" onMouseLeave={() => setOpenCategory(null)}>
          <div className="mx-auto flex max-w-7xl items-center gap-1 px-4">
            <NavLink to="/marketplace" className={({ isActive }) => clsx('px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'text-bid font-semibold' : 'text-muted hover:text-ink')}>
              All auctions
            </NavLink>
            {CATEGORIES.map((category) => {
              const isCollectibles = category.slug === 'collectibles';
              const isTech = category.slug === 'tech';
              const isEnt = category.slug === 'entertainment';

              return (
                <div key={category.slug} onMouseEnter={() => setOpenCategory(category.slug)}>
                  <NavLink
                    to={`/category/${category.slug}`}
                    className={({ isActive }) =>
                      clsx(
                        'block px-3 py-2.5 text-sm font-medium transition-all duration-200',
                        isActive
                          ? isCollectibles
                            ? 'text-[#FFB800] font-semibold drop-shadow-[0_0_8px_rgba(255,184,0,0.5)]'
                            : isTech
                              ? 'text-[#A855F7] font-semibold drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                              : isEnt
                                ? 'text-[#00F0FF] font-semibold drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]'
                                : 'text-[#10B981] font-semibold drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                          : isCollectibles
                            ? 'text-muted hover:text-[#FFB800]'
                            : isTech
                              ? 'text-muted hover:text-[#A855F7]'
                              : isEnt
                                ? 'text-muted hover:text-[#00F0FF]'
                                : 'text-muted hover:text-[#10B981]',
                      )
                    }
                  >
                    {isCollectibles ? '✨ Collectibles & Antiques' : category.name}
                  </NavLink>
                </div>
              );
            })}
            <NavLink
              to="/bidtok"
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-1 px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'text-[#FF0055] font-semibold drop-shadow-[0_0_8px_rgba(255,0,85,0.5)]' : 'text-muted hover:text-[#FF0055]',
                )
              }
            >
              🔥 BidTok
            </NavLink>
            <NavLink
              to="/live"
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'text-urgent font-semibold' : 'text-muted hover:text-ink',
                )
              }
            >
              <span className="h-1.5 w-1.5 rounded-full bg-urgent animate-pulse" /> Live
            </NavLink>
          </div>

          {openCategory ? (
            <div
              className="absolute inset-x-0 border-b border-line bg-surface/95 backdrop-blur-xl shadow-2xl transition-all duration-200"
              style={{
                borderTop: `2px solid ${
                  openCategory === 'collectibles'
                    ? '#FFB800'
                    : openCategory === 'tech'
                      ? '#A855F7'
                      : openCategory === 'entertainment'
                        ? '#00F0FF'
                        : '#10B981'
                }`,
              }}
            >
              <div className="mx-auto flex max-w-7xl gap-10 px-4 py-6">
                <div className="w-64">
                  <p
                    className="font-display text-base font-semibold"
                    style={{
                      color:
                        openCategory === 'collectibles'
                          ? '#FFB800'
                          : openCategory === 'tech'
                            ? '#A855F7'
                            : openCategory === 'entertainment'
                              ? '#00F0FF'
                              : '#10B981',
                    }}
                  >
                    {openCategory === 'collectibles'
                      ? '🏆 Collectibles & Antiques'
                      : CATEGORIES.find((c) => c.slug === openCategory)?.name}
                  </p>
                  <p className="hint mt-1">{CATEGORIES.find((c) => c.slug === openCategory)?.tagline}</p>
                </div>
                <ul className="grid flex-1 grid-cols-4 gap-2">
                  {CATEGORIES.find((c) => c.slug === openCategory)?.subcategories.map((sub) => (
                    <li key={sub.slug}>
                      <Link
                        to={`/category/${openCategory}?subcategory=${sub.slug}`}
                        className="block rounded-lg px-3 py-2 text-sm text-ink/90 hover:bg-raised transition-colors"
                      >
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </nav>

        {/* Mobile search, always visible under the bar. */}
        <form onSubmit={submitSearch} className="border-t border-line px-4 py-2.5 md:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search auctions"
              aria-label="Search auctions"
              className="field pl-10"
            />
          </div>
        </form>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 bg-canvas lg:hidden">
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <span className="font-display text-lg font-bold">Browse</span>
            <button onClick={() => setMenuOpen(false)} className="btn-quiet" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="overflow-y-auto px-4 py-4">
            {CATEGORIES.map((category) => (
              <div key={category.slug} className="border-b border-line py-3">
                <Link to={`/category/${category.slug}`} className="font-display font-semibold">
                  {category.name}
                </Link>
                <ul className="mt-2 grid grid-cols-2 gap-1">
                  {category.subcategories.map((sub) => (
                    <li key={sub.slug}>
                      <Link
                        to={`/category/${category.slug}?subcategory=${sub.slug}`}
                        className="block py-1.5 text-sm text-muted"
                      >
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="space-y-2 py-4">
              <Link to="/sell" className="btn-primary w-full">Sell an item</Link>
              <Link to="/orders" className="btn-ghost w-full">Orders and delivery</Link>
            </div>
          </nav>
        </div>
      ) : null}

      <main className="flex-1 pb-20 lg:pb-0">
        <Outlet />
      </main>

      <footer className="hidden border-t border-line py-10 lg:block">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-8 px-4">
          <div className="max-w-xs">
            <p className="font-display text-xl font-bold tracking-tight">Last<span className="text-bid">Bid</span></p>
            <p className="hint mt-2">
              Timed auctions for items worth competing over. Every bid is validated server-side, every price is live.
            </p>
          </div>
          {CATEGORIES.map((category) => (
            <div key={category.slug}>
              <p className="mb-2 text-sm font-semibold">{category.name}</p>
              <ul className="space-y-1.5">
                {category.subcategories.map((sub) => (
                  <li key={sub.slug}>
                    <Link to={`/category/${category.slug}?subcategory=${sub.slug}`} className="text-sm text-muted hover:text-ink">
                      {sub.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </footer>

      {/* Mobile tab bar. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {[
            { to: '/marketplace', label: 'Browse', icon: LayoutGrid },
            { to: '/bidtok', label: 'BidTok', icon: Clapperboard },
            { to: '/sell', label: 'Sell', icon: Plus },
            { to: '/live', label: 'Live', icon: Radio },
            { to: user ? '/my-bids' : '/login', label: user ? 'Bids' : 'Sign in', icon: user ? Gavel : UserIcon },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx('flex flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium', isActive ? 'text-bid' : 'text-muted')
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
