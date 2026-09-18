import { SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import { CATEGORIES, findCategory } from '@/shared/categories';
import { CONDITION_LABELS } from '@/lib/format';

export interface FilterState {
  q: string;
  category: string;
  subcategory: string;
  minPrice: string;
  maxPrice: string;
  condition: string[];
  endingWithinHours: string;
  sort: 'ending-soon' | 'newest' | 'current-bid' | 'most-bids';
}

export const EMPTY_FILTERS: FilterState = {
  q: '', category: '', subcategory: '', minPrice: '', maxPrice: '',
  condition: [], endingWithinHours: '', sort: 'ending-soon',
};

const SORTS: Array<{ value: FilterState['sort']; label: string }> = [
  { value: 'ending-soon', label: 'Ending soon' },
  { value: 'newest', label: 'Newest' },
  { value: 'current-bid', label: 'Highest bid' },
  { value: 'most-bids', label: 'Most bids' },
];

const ENDING_OPTIONS = [
  { value: '1', label: 'Under 1 hour' },
  { value: '6', label: 'Under 6 hours' },
  { value: '24', label: 'Today' },
  { value: '72', label: 'Next 3 days' },
];

interface Props {
  value: FilterState;
  onChange: (next: FilterState) => void;
  /** Hide the category control on a category page, where it is fixed. */
  lockCategory?: boolean;
  resultCount?: number;
}

export function Filters({ value, onChange, lockCategory = false, resultCount }: Props) {
  const [open, setOpen] = useState(false);
  const subcategories = findCategory(value.category)?.subcategories ?? [];

  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch });

  const toggleCondition = (condition: string) => {
    set({
      condition: value.condition.includes(condition)
        ? value.condition.filter((c) => c !== condition)
        : [...value.condition, condition],
    });
  };

  const activeCount =
    (value.category ? 1 : 0) + (value.subcategory ? 1 : 0) + (value.minPrice ? 1 : 0) +
    (value.maxPrice ? 1 : 0) + value.condition.length + (value.endingWithinHours ? 1 : 0);

  const panel = (
    <div className="space-y-6">
      {!lockCategory ? (
        <div>
          <label className="label" htmlFor="filter-category">Category</label>
          <select
            id="filter-category"
            className="field"
            value={value.category}
            onChange={(event) => set({ category: event.target.value, subcategory: '' })}
          >
            <option value="">Everything</option>
            {CATEGORIES.map((category) => (
              <option key={category.slug} value={category.slug}>{category.name}</option>
            ))}
          </select>
        </div>
      ) : null}

      {subcategories.length ? (
        <div>
          <label className="label" htmlFor="filter-subcategory">Subcategory</label>
          <select
            id="filter-subcategory"
            className="field"
            value={value.subcategory}
            onChange={(event) => set({ subcategory: event.target.value })}
          >
            <option value="">All of {findCategory(value.category)?.name}</option>
            {subcategories.map((sub) => (
              <option key={sub.slug} value={sub.slug}>{sub.name}</option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <span className="label">Current bid</span>
        <div className="flex items-center gap-2">
          <input
            type="number" min={0} placeholder="Min ₹" aria-label="Minimum price"
            className="field tabular" value={value.minPrice}
            onChange={(event) => set({ minPrice: event.target.value })}
          />
          <span className="text-muted">to</span>
          <input
            type="number" min={0} placeholder="Max ₹" aria-label="Maximum price"
            className="field tabular" value={value.maxPrice}
            onChange={(event) => set({ maxPrice: event.target.value })}
          />
        </div>
      </div>

      <div>
        <span className="label">Condition</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CONDITION_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => toggleCondition(key)}
              aria-pressed={value.condition.includes(key)}
              className={clsx(
                'pill border transition-colors',
                value.condition.includes(key)
                  ? 'border-bid bg-bid/12 text-bid'
                  : 'border-line text-muted hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">Ending</span>
        <div className="flex flex-wrap gap-2">
          {ENDING_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => set({ endingWithinHours: value.endingWithinHours === option.value ? '' : option.value })}
              aria-pressed={value.endingWithinHours === option.value}
              className={clsx(
                'pill border transition-colors',
                value.endingWithinHours === option.value
                  ? 'border-bid bg-bid/12 text-bid'
                  : 'border-line text-muted hover:text-ink',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {activeCount > 0 ? (
        <button
          onClick={() => onChange({ ...EMPTY_FILTERS, q: value.q, sort: value.sort, category: lockCategory ? value.category : '' })}
          className="btn-quiet w-full"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      {/* Sort and the filter trigger sit above the results on every size. */}
      <div className="mb-5 flex items-center gap-3">
        <button onClick={() => setOpen(true)} className="btn-ghost lg:hidden">
          <SlidersHorizontal className="h-4 w-4" />
          Filters{activeCount ? ` (${activeCount})` : ''}
        </button>
        <p className="hint mr-auto hidden sm:block">
          {resultCount === undefined ? '' : `${resultCount} ${resultCount === 1 ? 'auction' : 'auctions'}`}
        </p>
        <label className="sr-only" htmlFor="sort">Sort by</label>
        <select
          id="sort"
          className="field w-auto py-2"
          value={value.sort}
          onChange={(event) => set({ sort: event.target.value as FilterState['sort'] })}
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="hidden lg:block">{panel}</div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 lg:hidden" onClick={() => setOpen(false)}>
          <div
            className="max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-surface p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Filters</h2>
              <button onClick={() => setOpen(false)} className="btn-quiet" aria-label="Close filters">
                <X className="h-5 w-5" />
              </button>
            </div>
            {panel}
            <button onClick={() => setOpen(false)} className="btn-primary mt-6 w-full">
              Show results
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
