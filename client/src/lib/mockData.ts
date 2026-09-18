import type { AuctionCard, AuctionDetail, PublicUser } from '@/shared/types';

export const DEMO_SELLERS: PublicUser[] = [
  {
    id: 'user-aria',
    username: 'aria_vault',
    displayName: 'Aria Vault',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    ratingAvg: 4.95,
    ratingCount: 52,
    location: 'Mumbai, MH',
  },
  {
    id: 'user-chronos',
    username: 'chronos_vault',
    displayName: 'Chronos Vault',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    ratingAvg: 4.88,
    ratingCount: 39,
    location: 'Bengaluru, KA',
  },
  {
    id: 'user-kicks',
    username: 'kicks_and_caps',
    displayName: 'Kicks & Caps',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
    ratingAvg: 4.92,
    ratingCount: 84,
    location: 'Delhi, DL',
  },
  {
    id: 'user-provenance',
    username: 'the_provenance',
    displayName: 'The Provenance',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    ratingAvg: 5.0,
    ratingCount: 116,
    location: 'Ahmedabad, GJ',
  },
  {
    id: 'user-circuit',
    username: 'circuit_and_co',
    displayName: 'Circuit & Co',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    ratingAvg: 4.85,
    ratingCount: 47,
    location: 'Bengaluru, KA',
  },
];

const HOUR = 3600_000;

export const DEMO_AUCTIONS: AuctionCard[] = [
  // 1. FASHION - Sneakers: Air Jordan 1 Lost & Found (YouTube Short)
  {
    id: 'demo-jordan-1',
    slug: 'air-jordan-1-retro-high-lost-found-uk-9-0',
    title: 'Air Jordan 1 Retro High "Lost & Found" — UK 9',
    description:
      'Worn twice indoors. Complete with the reprinted box, vintage sales invoice and the original receipt from the December release. Soles are pristine, the cracked aged collar leather is untouched, and the laces have never been swapped. 100% verified authentic.',
    category: 'fashion',
    subcategory: 'sneakers',
    condition: 'LIKE_NEW',
    images: [
      'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=1000&auto=format&fit=crop&q=80',
    ],
    videoUrl: 'https://youtube.com/shorts/oBhjX9_rmBg?si=MypFtUFkLvptkmEM',
    startPrice: 1800000,
    currentBid: 1950000,
    minIncrement: 50000,
    bidCount: 5,
    status: 'ACTIVE',
    endsAt: new Date(Date.now() + 3.5 * HOUR).toISOString(),
    createdAt: new Date(Date.now() - 12 * HOUR).toISOString(),
    hasReserve: true,
    reserveMet: true,
    location: 'Mumbai, MH',
    seller: DEMO_SELLERS[0],
  },

  // 2. TECH - Headset: Razer BlackShark V2 Pro (YouTube Short)
  {
    id: 'demo-razer-blackshark',
    slug: 'razer-blackshark-v2-pro-wireless-esports-headset-4',
    title: 'Razer BlackShark V2 Pro Wireless Esports Headset',
    description:
      'Official Razer esports gaming headset. Equipped with Razer TriForce Titanium 50mm drivers and HyperClear Super Wideband mic. Features ultra-low latency HyperSpeed Wireless (2.4 GHz) + Bluetooth 5.2. Ultra-soft breathable memory foam ear cushions with active noise isolation. Full box set with cables and pop filter.',
    category: 'tech',
    subcategory: 'gaming',
    condition: 'LIKE_NEW',
    images: [
      'https://assets2.razerzone.com/images/pnx.assets/0de78efe3441114d8a92590145fff4c8/razer-blackshark-v2-pro-2023_ogimage-1200x630.webp',
      'https://assets2.razerzone.com/images/pnx.assets/8864ce1bcf7bbd3001fb4bdf4fc88965/razer-blackshark-v2-x-og-image.webp',
      'https://assets2.razerzone.com/images/pnx.assets/1d90fb0fb09996eb2a6ed1878b1a42df/razer-blackshark-v2-2020-hero-mobile.jpg',
    ],
    videoUrl: 'https://youtube.com/shorts/jUzWtv1PkEc?si=9nGHjYw5Gw3u_ioK',
    startPrice: 1600000,
    currentBid: 1750000,
    minIncrement: 50000,
    bidCount: 4,
    status: 'ACTIVE',
    endsAt: new Date(Date.now() + 4.2 * HOUR).toISOString(),
    createdAt: new Date(Date.now() - 8 * HOUR).toISOString(),
    hasReserve: true,
    reserveMet: false,
    location: 'Bengaluru, KA',
    seller: DEMO_SELLERS[4],
  },

  // 3. COLLECTIBLES - Trading Cards: Charizard Base Set Holo PSA 7 (YouTube Short)
  {
    id: 'demo-charizard-holo',
    slug: 'charizard-base-set-holo-1st-edition-psa-7-9',
    title: 'Charizard Base Set Holo 1st Edition, PSA 7',
    description:
      'Shadowless holographic foil. Sealed PSA tamper-evident archival slab, certification matches the PSA global database. Crisp fiery holo pattern with vibrant preservation. Single-owner private vault collection.',
    category: 'collectibles',
    subcategory: 'trading-cards',
    condition: 'GOOD',
    images: [
      'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1563089145-599997674d42?w=1000&auto=format&fit=crop&q=80',
    ],
    videoUrl: 'https://youtube.com/shorts/rZLK1fZ0gd8?si=SUwLesweJoovCvZB',
    startPrice: 18000000,
    currentBid: 21500000,
    minIncrement: 500000,
    bidCount: 9,
    status: 'ACTIVE',
    endsAt: new Date(Date.now() + 28 * HOUR).toISOString(),
    createdAt: new Date(Date.now() - 20 * HOUR).toISOString(),
    hasReserve: true,
    reserveMet: true,
    location: 'Ahmedabad, GJ',
    seller: DEMO_SELLERS[3],
  },

  // 4. FASHION - Watches: Seiko SKX007 Diver
  {
    id: 'demo-seiko-skx007',
    slug: 'seiko-skx007-on-original-jubilee-1998-production-1',
    title: 'Seiko SKX007 on original jubilee, 1998 production',
    description:
      'A true collector diver with a warm cream lume and light desk-wear on the clasp. Serviced in 2023 — timing sheet included. Keeps roughly +8 seconds a day. Bezel action is crisp with zero back-play.',
    category: 'fashion',
    subcategory: 'watches',
    condition: 'GOOD',
    images: [
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1548171915-e79a380a2a4b?w=1000&auto=format&fit=crop&q=80',
    ],
    startPrice: 2400000,
    currentBid: 2800000,
    minIncrement: 100000,
    bidCount: 6,
    status: 'ACTIVE',
    endsAt: new Date(Date.now() + 11 * HOUR).toISOString(),
    createdAt: new Date(Date.now() - 14 * HOUR).toISOString(),
    hasReserve: true,
    reserveMet: true,
    location: 'Bengaluru, KA',
    seller: DEMO_SELLERS[1],
  },

  // 5. FASHION - Streetwear: Supreme Box Logo Hoodie
  {
    id: 'demo-supreme-hoodie',
    slug: 'supreme-box-logo-hoodie-fw22-black-size-l-2',
    title: 'Supreme box logo hoodie FW22, black, size L',
    description:
      'Bought on release day and worn through one winter. Heavyweight crossgrain fleece. No cracking on the embroidered box logo, drawcords intact, tags preserved. Washed cold, hung dry, every time.',
    category: 'fashion',
    subcategory: 'streetwear',
    condition: 'EXCELLENT',
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1000&auto=format&fit=crop&q=80',
    ],
    startPrice: 1200000,
    currentBid: 1450000,
    minIncrement: 50000,
    bidCount: 5,
    status: 'ACTIVE',
    endsAt: new Date(Date.now() + 26 * HOUR).toISOString(),
    createdAt: new Date(Date.now() - 5 * HOUR).toISOString(),
    hasReserve: false,
    reserveMet: true,
    location: 'Delhi, DL',
    seller: DEMO_SELLERS[2],
  },

  // 6. TECH - Gaming: Steam Deck OLED
  {
    id: 'demo-steam-deck',
    slug: 'steam-deck-oled-1tb-limited-edition-7',
    title: 'Steam Deck OLED 1TB, Limited Edition',
    description:
      'The translucent limited run chassis. 90Hz HDR OLED display is flawless, Hall-effect joysticks calibrated with zero drift. Exclusive dual-layer carry case, 45W charger and a 512GB high-speed microSD card included.',
    category: 'tech',
    subcategory: 'gaming',
    condition: 'EXCELLENT',
    images: [
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=1000&auto=format&fit=crop&q=80',
    ],
    startPrice: 4200000,
    currentBid: 4800000,
    minIncrement: 100000,
    bidCount: 8,
    status: 'ACTIVE',
    endsAt: new Date(Date.now() + 1.8 * HOUR).toISOString(),
    createdAt: new Date(Date.now() - 16 * HOUR).toISOString(),
    hasReserve: false,
    reserveMet: true,
    location: 'Kolkata, WB',
    seller: DEMO_SELLERS[2],
  },

  // 7. TECH - Smartphones: iPhone 15 Pro Max
  {
    id: 'demo-iphone-15',
    slug: 'iphone-15-pro-max-1tb-natural-titanium-unlocked-5',
    title: 'iPhone 15 Pro Max 1TB, Natural Titanium, unlocked',
    description:
      'Battery health 97 percent, 11 months of use in an Apple leather case with sapphire screen protector from day one. Face ID and 5x optical telephoto lens tested. Includes original braided USB-C cable and box.',
    category: 'tech',
    subcategory: 'smartphones',
    condition: 'EXCELLENT',
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=1000&auto=format&fit=crop&q=80',
    ],
    startPrice: 6200000,
    currentBid: 7400000,
    minIncrement: 100000,
    bidCount: 7,
    status: 'ACTIVE',
    endsAt: new Date(Date.now() + 5.5 * HOUR).toISOString(),
    createdAt: new Date(Date.now() - 9 * HOUR).toISOString(),
    hasReserve: true,
    reserveMet: false,
    location: 'Hyderabad, TG',
    seller: DEMO_SELLERS[1],
  },

  // 8. COLLECTIBLES - Antiques: Brass Ship Chronometer
  {
    id: 'demo-brass-chronometer',
    slug: 'brass-ship-chronometer-calcutta-c-1910-10',
    title: 'Brass ship chronometer, Calcutta, c. 1910',
    description:
      'Authentic nautical marine chronometer with polished brass casing and dual gimbals. Solid mahogany case with genuine patina and dovetail joints. Tested and keeps accurate continuous movement over a 24-hour cycle.',
    category: 'collectibles',
    subcategory: 'antiques',
    condition: 'FAIR',
    images: [
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=1000&auto=format&fit=crop&q=80',
    ],
    startPrice: 3500000,
    currentBid: 4200000,
    minIncrement: 100000,
    bidCount: 5,
    status: 'ACTIVE',
    endsAt: new Date(Date.now() + 85 * HOUR).toISOString(),
    createdAt: new Date(Date.now() - 30 * HOUR).toISOString(),
    hasReserve: false,
    reserveMet: true,
    location: 'Kolkata, WB',
    seller: DEMO_SELLERS[4],
  },

  // 9. ENTERTAINMENT - Movies: Blade Runner 1982 Japanese Poster
  {
    id: 'demo-blade-runner',
    slug: 'blade-runner-1982-japanese-b2-poster-original-13',
    title: 'Blade Runner 1982 Japanese B2 poster, original',
    description:
      'First-run Japanese theatrical B2 release poster. Striking cyberpunk neon typography and artwork. One minor archival pinhole at the upper border, otherwise deep rich ink saturation. Ships in heavy-duty PVC tube.',
    category: 'entertainment',
    subcategory: 'movies',
    condition: 'GOOD',
    images: [
      'https://images.unsplash.com/photo-1578836537282-3171d77f8632?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1000&auto=format&fit=crop&q=80',
    ],
    startPrice: 2200000,
    currentBid: 2600000,
    minIncrement: 100000,
    bidCount: 4,
    status: 'ACTIVE',
    endsAt: new Date(Date.now() + 4.8 * HOUR).toISOString(),
    createdAt: new Date(Date.now() - 10 * HOUR).toISOString(),
    hasReserve: false,
    reserveMet: true,
    location: 'Mumbai, MH',
    seller: DEMO_SELLERS[0],
  },
];

export function getFallbackHomeFeed() {
  const endingSoon = [...DEMO_AUCTIONS].sort(
    (a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime(),
  ).slice(0, 6);

  const trending = [...DEMO_AUCTIONS].sort((a, b) => b.bidCount - a.bidCount).slice(0, 6);
  const recent = [...DEMO_AUCTIONS].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  ).slice(0, 6);

  const byCategory = [
    {
      category: 'fashion',
      items: DEMO_AUCTIONS.filter((a) => a.category === 'fashion'),
    },
    {
      category: 'tech',
      items: DEMO_AUCTIONS.filter((a) => a.category === 'tech'),
    },
    {
      category: 'collectibles',
      items: DEMO_AUCTIONS.filter((a) => a.category === 'collectibles'),
    },
    {
      category: 'entertainment',
      items: DEMO_AUCTIONS.filter((a) => a.category === 'entertainment'),
    },
  ];

  const live = [
    {
      id: 'live-fashion-1',
      title: '👟 Fashion Drops: Air Jordan 1 & Streetwear Grails',
      thumbnailUrl: DEMO_AUCTIONS[0].images[0],
      auction: DEMO_AUCTIONS[0],
    },
    {
      id: 'live-tech-1',
      title: '🎮 Exclusive Tech: Razer Esports & Setup Vault',
      thumbnailUrl: DEMO_AUCTIONS[1].images[0],
      auction: DEMO_AUCTIONS[1],
    },
  ];

  return { endingSoon, trending, byCategory, recent, live };
}

export function getFallbackBidTok() {
  const items = DEMO_AUCTIONS.filter((item) => !!item.videoUrl);
  return { items };
}

export function getFallbackAuctionDetail(slugOrId: string): AuctionDetail | null {
  const auction =
    DEMO_AUCTIONS.find((a) => a.slug === slugOrId || a.id === slugOrId) || DEMO_AUCTIONS[0];

  return {
    ...auction,
    description: auction.description || '',
    shippingInfo: 'Insured express courier, dispatched within two working days. Tracked delivery.',
    shippingCost: 0,
    minNextBid: auction.currentBid + auction.minIncrement,
    watcherCount: 18,
    winnerId: null,
    endedAt: null,
    bids: [
      {
        id: 'bid-1',
        amount: auction.currentBid,
        isAuto: false,
        createdAt: new Date(Date.now() - 15 * 60_000).toISOString(),
        alias: 'Bidder #9',
        isYou: false,
      },
      {
        id: 'bid-2',
        amount: auction.currentBid - auction.minIncrement,
        isAuto: true,
        createdAt: new Date(Date.now() - 45 * 60_000).toISOString(),
        alias: 'Bidder #4',
        isYou: false,
      },
    ],
    liveSession: null,
  };
}
