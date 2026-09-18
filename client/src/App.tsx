import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Spinner } from '@/components/ui';

/**
 * Routes are code-split: the BidTok feed, the live room and the admin console
 * never load for someone who only browses the marketplace.
 */
const Home = lazy(() => import('@/pages/Home'));
const Marketplace = lazy(() => import('@/pages/Marketplace'));
const CategoryPage = lazy(() => import('@/pages/CategoryPage'));
const AuctionDetail = lazy(() => import('@/pages/AuctionDetail'));
const CreateAuction = lazy(() => import('@/pages/CreateAuction'));
const MyAuctions = lazy(() => import('@/pages/MyAuctions'));
const MyBids = lazy(() => import('@/pages/MyBids'));
const Watchlist = lazy(() => import('@/pages/Watchlist'));
const BidTok = lazy(() => import('@/pages/BidTok'));
const LiveIndex = lazy(() => import('@/pages/LiveIndex'));
const LiveRoom = lazy(() => import('@/pages/LiveRoom'));
const SellerProfile = lazy(() => import('@/pages/SellerProfile'));
const UserProfile = lazy(() => import('@/pages/UserProfile'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const OrderHistory = lazy(() => import('@/pages/OrderHistory'));
const DeliveryTracking = lazy(() => import('@/pages/DeliveryTracking'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const BidPanelPreview = lazy(() => import('@/pages/BidPanelPreview'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PageFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-muted">
      <Spinner className="h-6 w-6" />
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/auction/:slug" element={<AuctionDetail />} />
            <Route path="/bidtok" element={<BidTok />} />
            <Route path="/live" element={<LiveIndex />} />
            <Route path="/live/:id" element={<LiveRoom />} />
            <Route path="/seller/:username" element={<SellerProfile />} />

            <Route path="/sell" element={<ProtectedRoute><CreateAuction /></ProtectedRoute>} />
            <Route path="/my-auctions" element={<ProtectedRoute><MyAuctions /></ProtectedRoute>} />
            <Route path="/my-bids" element={<ProtectedRoute><MyBids /></ProtectedRoute>} />
            <Route path="/watchlist" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
            <Route path="/orders/:id" element={<ProtectedRoute><DeliveryTracking /></ProtectedRoute>} />
            <Route path="/checkout/:id" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
            <Route path="/test-bidpanel" element={<BidPanelPreview />} />

            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </Suspense>
    </>
  );
}
