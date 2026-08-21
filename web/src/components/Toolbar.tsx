import type { Filters, SortMode } from "../types";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "hottest", label: "Hottest" },
  { value: "coldest", label: "Coldest" },
  { value: "most_ideas", label: "Most ideas" },
  { value: "least_ideas", label: "Least ideas" },
  { value: "fill_ratio", label: "Fill ratio" },
  { value: "portal", label: "Portal order" },
];

type ToolbarProps = {
  filters: Filters;
  sort: SortMode;
  categories: string[];
  themes: string[];
  organizations: string[];
  onFiltersChange: (filters: Filters) => void;
  onSortChange: (sort: SortMode) => void;
};

export function Toolbar({
  filters,
  sort,
  categories,
  themes,
  organizations,
  onFiltersChange,
  onSortChange,
}: ToolbarProps) {
  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    <div className="toolbar">
      <input
        type="search"
        className="toolbar-search"
        placeholder="Search title, org, PS number, description…"
        value={filters.query}
        onChange={(e) => setFilter("query", e.target.value)}
        aria-label="Search problem statements"
      />
      <div className="toolbar-filters">
        <label>
          Category
          <select
            value={filters.category}
            onChange={(e) => setFilter("category", e.target.value)}
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Theme
          <select value={filters.theme} onChange={(e) => setFilter("theme", e.target.value)}>
            <option value="">All</option>
            {themes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Organization
          <select
            value={filters.organization}
            onChange={(e) => setFilter("organization", e.target.value)}
          >
            <option value="">All</option>
            {organizations.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select value={sort} onChange={(e) => onSortChange(e.target.value as SortMode)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
