import { useEffect, useMemo, useState } from "react";
import { filterAndSort } from "../lib/filterSort";
import { formatAbsoluteTime, formatRelativeTime } from "../lib/format";
import { logout } from "../api";
import type { Filters, PsPayload, PsRecord, SortMode } from "../types";
import { Toolbar } from "./Toolbar";
import { PsList } from "./PsList";
import { PsDetail } from "./PsDetail";
import { Toast } from "./Toast";

type DashboardProps = {
  payload: PsPayload;
  onLogout: () => void;
};

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function Dashboard({ payload, onLogout }: DashboardProps) {
  const [filters, setFilters] = useState<Filters>({
    query: "",
    category: "",
    theme: "",
    organization: "",
  });
  const [sort, setSort] = useState<SortMode>("hottest");
  const [selected, setSelected] = useState<PsRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const categories = useMemo(
    () => uniqueSorted(payload.records.map((r) => r.category)),
    [payload.records],
  );
  const themes = useMemo(
    () => uniqueSorted(payload.records.map((r) => r.theme)),
    [payload.records],
  );
  const organizations = useMemo(
    () => uniqueSorted(payload.records.map((r) => r.organization)),
    [payload.records],
  );

  const filtered = useMemo(
    () => filterAndSort(payload.records, filters, sort),
    [payload.records, filters, sort],
  );

  useEffect(() => {
    if (selected && !filtered.some((r) => r.ps_id === selected.ps_id)) {
      setSelected(null);
    }
  }, [filtered, selected]);

  const hasActiveFilters =
    filters.query || filters.category || filters.theme || filters.organization;

  async function handleLogout() {
    await logout();
    onLogout();
  }

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-brand">
          <h1>SIH PS</h1>
          <p className="dash-scrape">
            Last scraped{" "}
            <time dateTime={payload.scraped_at} title={formatAbsoluteTime(payload.scraped_at)}>
              {formatRelativeTime(payload.scraped_at)}
            </time>
            <span className="dash-scrape-abs"> ({formatAbsoluteTime(payload.scraped_at)})</span>
          </p>
        </div>
        <div className="dash-actions">
          <span className="dash-count">
            {hasActiveFilters
              ? `${filtered.length} of ${payload.page_ps_count}`
              : `${payload.page_ps_count} problem statements`}
          </span>
          <button type="button" className="btn-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <Toolbar
        filters={filters}
        sort={sort}
        categories={categories}
        themes={themes}
        organizations={organizations}
        onFiltersChange={setFilters}
        onSortChange={setSort}
      />

      <div className="dash-main">
        <PsList
          records={filtered}
          selectedId={selected?.ps_id ?? null}
          onSelect={setSelected}
        />
        <PsDetail record={selected} sourceUrl={payload.source_url} onToast={setToast} />
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
