/** Shapes the API returns. Kept in one place so pages never invent fields. */

export type AuctionStatus = 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'SOLD' | 'UNSOLD' | 'CANCELLED';

export type ItemCondition = 'NEW' | 'LIKE_NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'FOR_PARTS';

export type OrderStatus =
  | 'PAYMENT_PENDING'
  | 'ORDER_CONFIRMED'
  | 'PREPARING'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  ratingAvg: number;
  ratingCount: number;
  createdAt?: string;
}

export interface CurrentUser extends PublicUser {
  email: string;
  role: 'USER' | 'ADMIN';
}

export interface AuctionCard {
  id: string;
  slug: string;
  title: string;
  images: string[];
  videoUrl?: string | null;
  description?: string;
  category: string;
  subcategory: string;
  condition: ItemCondition;
  location: string;
  startPrice: number;
  currentBid: number;
  minIncrement: number;
  bidCount: number;
  status: AuctionStatus;
  endsAt: string;
  createdAt: string;
  hasReserve: boolean;
  reserveMet: boolean;
  seller: PublicUser;
}

export interface BidRecord {
  id: string;
  amount: number;
  isAuto: boolean;
  createdAt: string;
  alias: string;
  isYou: boolean;
}

export interface AuctionDetail extends Omit<AuctionCard, 'description'> {
  description: string;
  shippingInfo: string;
  shippingCost: number;
  minNextBid: number;
  watcherCount: number;
  winnerId: string | null;
  endedAt: string | null;
  /** Present only when the viewer is the seller. */
  reservePrice?: number | null;
  bids: BidRecord[];
  liveSession: { id: string; status: string; title: string } | null;
}

export interface AutoBidState {
  maxAmount: number | null;
  isWinning: boolean;
  currentBid: number;
  minNextBid: number;
}

export interface OrderEvent {
  id: string;
  status: OrderStatus;
  note: string;
  location?: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  reference: string;
  status: OrderStatus;
  itemTotal: number;
  shippingCost: number;
  total: number;
  courier?: string | null;
  trackingNumber?: string | null;
  estimatedDelivery?: string | null;
  createdAt: string;
  shippingName?: string | null;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingPostal?: string | null;
  auction: { id: string; slug: string; title: string; images: string[]; location?: string };
  buyer?: { username: string; displayName: string };
  seller?: { username: string; displayName: string };
  events?: OrderEvent[];
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  auctionId?: string | null;
  read: boolean;
  createdAt: string;
}

export interface LiveSession {
  id: string;
  title: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  thumbnailUrl?: string | null;
  playbackUrl?: string | null;
  ingestUrl?: string;
  viewerCount: number;
  startedAt?: string | null;
  host: PublicUser;
  auction: AuctionCard;
  messages?: LiveChatMessage[];
  isLiveVideoAvailable?: boolean;
  streamProvider?: string;
}

export interface LiveChatMessage {
  id: string;
  body: string;
  createdAt: string;
  user: { username: string; displayName: string; avatarUrl?: string | null };
}

export interface PriceEstimate {
  provider: 'heuristic' | 'http';
  method: string;
  suggestedStartPrice: number;
  estimatedLow: number;
  estimatedHigh: number;
  suggestedReserve: number;
  suggestedIncrement: number;
  confidence: number;
  sampleSize: number;
  comparables: Array<{ title: string; finalPrice: number; endedAt: string | null }>;
  notes: string[];
}
