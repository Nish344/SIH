import { useState } from "react";
import type { Filters, SortMode } from "../types";
import { Select } from "./Select";

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasFacetFilters = Boolean(filters.category || filters.theme || filters.organization);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  const categoryOpts = [
    { value: "", label: "All categories" },
    ...categories.map((c) => ({ value: c, label: c })),
  ];
  const themeOpts = [
    { value: "", label: "All themes" },
    ...themes.map((t) => ({ value: t, label: t })),
  ];
  const orgOpts = [
    { value: "", label: "All orgs" },
    ...organizations.map((o) => ({ value: o, label: o })),
  ];
  const sortOpts = SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

  return (
    <div className="toolbar">
      <div className="toolbar-bar">
        <input
          type="search"
          className="toolbar-search"
          placeholder="Search…"
          value={filters.query}
          onChange={(e) => setFilter("query", e.target.value)}
          aria-label="Search problem statements"
        />

        <div className="toolbar-facets">
          <Select
            label="Category"
            compact
            className="picker--cat"
            value={filters.category}
            options={categoryOpts}
            onChange={(v) => setFilter("category", v)}
          />
          <Select
            label="Theme"
            compact
            className="picker--theme"
            value={filters.theme}
            options={themeOpts}
            onChange={(v) => setFilter("theme", v)}
          />
          <Select
            label="Organization"
            compact
            className="picker--org"
            value={filters.organization}
            options={orgOpts}
            onChange={(v) => setFilter("organization", v)}
          />
        </div>

        <Select
          label="Sort"
          compact
          className="picker--sort"
          value={sort}
          options={sortOpts}
          onChange={(v) => onSortChange(v as SortMode)}
        />

        <button
          type="button"
          className="toolbar-filters-toggle"
          aria-expanded={filtersOpen}
          aria-controls="toolbar-facet-filters"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          Filters
          {hasFacetFilters && <span className="toolbar-filters-badge" aria-hidden="true" />}
        </button>
      </div>

      <div
        id="toolbar-facet-filters"
        className={`toolbar-facets-mobile${filtersOpen ? " is-open" : ""}`}
      >
        <Select
          label="Category"
          value={filters.category}
          options={categoryOpts}
          onChange={(v) => setFilter("category", v)}
        />
        <Select
          label="Theme"
          value={filters.theme}
          options={themeOpts}
          onChange={(v) => setFilter("theme", v)}
        />
        <Select
          label="Organization"
          value={filters.organization}
          options={orgOpts}
          onChange={(v) => setFilter("organization", v)}
        />
      </div>
    </div>
  );
}
