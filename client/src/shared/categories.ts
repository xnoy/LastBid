/**
 * The BidNova category tree. Kept as plain data (not DB rows) so the frontend
 * and backend can both validate against the same source and the nav never
 * needs a round-trip. The identical file lives at client/src/shared/categories.ts.
 */
export interface Subcategory {
  slug: string;
  name: string;
}

export interface Category {
  slug: string;
  name: string;
  tagline: string;
  subcategories: Subcategory[];
}

export const CATEGORIES: Category[] = [
  {
    slug: 'fashion',
    name: 'Fashion',
    tagline: 'Grails, drops and the things people queue overnight for.',
    subcategories: [
      { slug: 'sneakers', name: 'Sneakers' },
      { slug: 'streetwear', name: 'Streetwear' },
      { slug: 'watches', name: 'Watches' },
      { slug: 'bags-accessories', name: 'Bags & Accessories' },
    ],
  },
  {
    slug: 'tech',
    name: 'Exclusive Tech',
    tagline: 'Short-run hardware, dev units and machines that never hit shelves.',
    subcategories: [
      { slug: 'smartphones', name: 'Smartphones' },
      { slug: 'laptops', name: 'Laptops' },
      { slug: 'gaming', name: 'Gaming' },
      { slug: 'limited-edition-tech', name: 'Limited Edition Tech' },
    ],
  },
  {
    slug: 'collectibles',
    name: 'Collectibles',
    tagline: 'Provenance, patina and the long tail of obsession.',
    subcategories: [
      { slug: 'antiques', name: 'Antiques' },
      { slug: 'trading-cards', name: 'Trading Cards' },
      { slug: 'memorabilia', name: 'Memorabilia' },
      { slug: 'limited-collectibles', name: 'Limited Edition Collectibles' },
    ],
  },
  {
    slug: 'entertainment',
    name: 'Entertainment',
    tagline: 'Props, pressings, tour merch and creator drops.',
    subcategories: [
      { slug: 'movies', name: 'Movies' },
      { slug: 'music', name: 'Music' },
      { slug: 'gaming-collectibles', name: 'Gaming Collectibles' },
      { slug: 'creator-merch', name: 'Event & Creator Merchandise' },
    ],
  },
];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

export function findCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function isValidCategoryPair(category: string, subcategory: string): boolean {
  const cat = findCategory(category);
  return !!cat && cat.subcategories.some((s) => s.slug === subcategory);
}

/** Seller-selectable auction lengths, in hours. */
export const DURATION_OPTIONS = [
  { hours: 1, label: '1 hour' },
  { hours: 6, label: '6 hours' },
  { hours: 12, label: '12 hours' },
  { hours: 24, label: '24 hours' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '7 days' },
];
