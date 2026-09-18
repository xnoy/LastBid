import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-lg place-items-center px-4 text-center">
      <div>
        <p className="tabular font-display text-5xl font-semibold text-bid">404</p>
        <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight">
          Nothing at this address
        </h1>
        <p className="hint mt-2">
          The lot may have ended, or the link is wrong. The marketplace is still full of things
          counting down.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="btn-primary">Go home</Link>
          <Link to="/marketplace" className="btn-ghost">Browse auctions</Link>
        </div>
      </div>
    </div>
  );
}
