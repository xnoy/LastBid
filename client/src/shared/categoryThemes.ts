export interface CategoryTheme {
  slug: string;
  name: string;
  shortName: string;
  emoji: string;
  headline: string;
  subtitle: string;
  color: string;           // Primary hex
  accentColor: string;     // Lighter accent hex
  rgb: string;             // R, G, B string for opacity mod
  badgeBorder: string;
  badgeBg: string;
  buttonClass: string;
  activeLineColor: string;
  glowClass: string;
  textGlow: string;
  boxGlow: string;
  featuredImage: string;
  featuredTitle: string;
  topBid: string;
  stats: {
    activeBids: number;
    endingSoon: number;
    topBid: string;
    verifiedItems: number;
  };
  link: string;
  isLuxury?: boolean;
}

export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  collectibles: {
    slug: 'collectibles',
    name: 'Collectibles',
    shortName: 'Collectibles & Antiques',
    emoji: '🃏',
    headline: 'One of one. For real.',
    subtitle: 'Real-time bidding on collectibles and antique drops. No bots. No fake bids. Just the culture doing its thing.',
    color: '#FFB800', // Luxury Gold / Amber Yellow
    accentColor: '#F59E0B',
    rgb: '255, 184, 0',
    badgeBorder: 'border-[#FFB800]/50',
    badgeBg: 'bg-[#FFB800]/10 text-[#FFB800]',
    buttonClass: 'bg-[#FFB800] text-black font-bold hover:bg-[#F59E0B] shadow-[0_0_25px_rgba(255,184,0,0.45)]',
    activeLineColor: '#FFB800',
    glowClass: 'shadow-[0_0_30px_rgba(255,184,0,0.35)]',
    textGlow: 'drop-shadow-[0_0_12px_rgba(255,184,0,0.5)]',
    boxGlow: '0 0 35px rgba(255, 184, 0, 0.22)',
    // Graded sports card & vintage collectibles preview matching Figma
    featuredImage: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&auto=format&fit=crop&q=80',
    featuredTitle: 'Vintage 1986 Fleer Rookie & 1910 Chronometer',
    topBid: '₹42.0k',
    stats: {
      activeBids: 196,
      endingSoon: 3,
      topBid: '₹42.0k',
      verifiedItems: 4,
    },
    link: '/category/collectibles',
    isLuxury: true,
  },
  entertainment: {
    slug: 'entertainment',
    name: 'Entertainment',
    shortName: 'Entertainment',
    emoji: '🎶🎤',
    headline: 'Front row or nothing.',
    subtitle: 'Real-time bidding on entertainment drops. No bots. No fake bids. Just the culture doing its thing.',
    color: '#00F0FF', // Cyber Neon Cyan / Electric Aqua
    accentColor: '#06B6D4',
    rgb: '0, 240, 255',
    badgeBorder: 'border-[#00F0FF]/50',
    badgeBg: 'bg-[#00F0FF]/10 text-[#00F0FF]',
    buttonClass: 'bg-[#00F0FF] text-black font-bold hover:bg-[#06B6D4] shadow-[0_0_25px_rgba(0,240,255,0.45)]',
    activeLineColor: '#00F0FF',
    glowClass: 'shadow-[0_0_30px_rgba(0,240,255,0.35)]',
    textGlow: 'drop-shadow-[0_0_12px_rgba(0,240,255,0.5)]',
    boxGlow: '0 0 35px rgba(0, 240, 255, 0.22)',
    // Live concert stage with lights & crowd matching Figma
    featuredImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80',
    featuredTitle: 'VIP Pass & Signed Backstage Tour Prop',
    topBid: '₹5.8k',
    stats: {
      activeBids: 201,
      endingSoon: 2,
      topBid: '₹5.8k',
      verifiedItems: 3,
    },
    link: '/category/entertainment',
  },
  tech: {
    slug: 'tech',
    name: 'Electronics',
    shortName: 'Electronics',
    emoji: '🎮',
    headline: 'Upgrade your setup.',
    subtitle: 'Real-time bidding on electronics drops. No bots. No fake bids. Just the culture doing its thing.',
    color: '#A855F7', // Electric Neon Purple / Violet
    accentColor: '#8B5CF6',
    rgb: '168, 85, 247',
    badgeBorder: 'border-[#A855F7]/50',
    badgeBg: 'bg-[#A855F7]/10 text-[#A855F7]',
    buttonClass: 'bg-[#A855F7] text-white font-bold hover:bg-[#9333EA] shadow-[0_0_25px_rgba(168,85,247,0.45)]',
    activeLineColor: '#A855F7',
    glowClass: 'shadow-[0_0_30px_rgba(168,85,247,0.35)]',
    textGlow: 'drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]',
    boxGlow: '0 0 35px rgba(168, 85, 247, 0.22)',
    // Official Razer BlackShark V2 Pro gaming headset directly from Razer CDN
    featuredImage: 'https://assets2.razerzone.com/images/pnx.assets/0de78efe3441114d8a92590145fff4c8/razer-blackshark-v2-pro-2023_ogimage-1200x630.webp',
    featuredTitle: 'Razer BlackShark V2 Pro Wireless Headset',
    topBid: '₹16.5k',
    stats: {
      activeBids: 197,
      endingSoon: 3,
      topBid: '₹4.2k',
      verifiedItems: 3,
    },
    link: '/category/tech',
  },
  bidtok: {
    slug: 'bidtok',
    name: 'BidTok',
    shortName: 'BidTok Feed',
    emoji: '🔥',
    headline: 'Scroll. Bid. Win.',
    subtitle: 'Real-time bidding on bidtok drops. No bots. No fake bids. Just the culture doing its thing.',
    color: '#FF0055', // Hot Neon Pink / Crimson
    accentColor: '#F43F5E',
    rgb: '255, 0, 85',
    badgeBorder: 'border-[#FF0055]/50',
    badgeBg: 'bg-[#FF0055]/10 text-[#FF0055]',
    buttonClass: 'bg-[#FF0055] text-white font-bold hover:bg-[#E11D48] shadow-[0_0_25px_rgba(255,0,85,0.45)]',
    activeLineColor: '#FF0055',
    glowClass: 'shadow-[0_0_30px_rgba(255,0,85,0.35)]',
    textGlow: 'drop-shadow-[0_0_12px_rgba(255,0,85,0.5)]',
    boxGlow: '0 0 35px rgba(255, 0, 85, 0.22)',
    // Mobile stream / TikTok viral clip matching Figma
    featuredImage: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=1200&auto=format&fit=crop&q=80',
    featuredTitle: 'Air Jordan 1 & Razer BlackShark Video Drops',
    topBid: '₹18.5k',
    stats: {
      activeBids: 210,
      endingSoon: 2,
      topBid: '₹18.5k',
      verifiedItems: 3,
    },
    link: '/bidtok',
  },
  fashion: {
    slug: 'fashion',
    name: 'Fashion',
    shortName: 'Fashion & Drops',
    emoji: '👟',
    headline: 'Fresh drops only.',
    subtitle: 'Real-time bidding on fashion and streetwear drops. No bots. No fake bids. Just the culture doing its thing.',
    color: '#10B981', // Neon Emerald / Mint Green
    accentColor: '#059669',
    rgb: '16, 185, 129',
    badgeBorder: 'border-[#10B981]/50',
    badgeBg: 'bg-[#10B981]/10 text-[#10B981]',
    buttonClass: 'bg-[#10B981] text-black font-bold hover:bg-[#059669] shadow-[0_0_25px_rgba(16,185,129,0.45)]',
    activeLineColor: '#10B981',
    glowClass: 'shadow-[0_0_30px_rgba(16,185,129,0.35)]',
    textGlow: 'drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]',
    boxGlow: '0 0 35px rgba(16, 185, 129, 0.22)',
    // Rare grail sneakers / streetwear
    featuredImage: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=1200&auto=format&fit=crop&q=80',
    featuredTitle: 'Air Jordan 1 Lost & Found UK 9 Grail',
    topBid: '₹18.5k',
    stats: {
      activeBids: 245,
      endingSoon: 4,
      topBid: '₹18.5k',
      verifiedItems: 5,
    },
    link: '/category/fashion',
  },
};

export const ORDERED_CATEGORY_KEYS = ['fashion', 'collectibles', 'entertainment', 'tech', 'bidtok'] as const;

export function getCategoryTheme(slug: string): CategoryTheme {
  if (slug === 'electronics') return CATEGORY_THEMES.tech;
  return CATEGORY_THEMES[slug] || CATEGORY_THEMES.collectibles;
}
