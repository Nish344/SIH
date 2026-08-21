import { useEffect, useMemo, useRef, useState } from "react";
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

type NavState = { sihPsId?: string | null };

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function recordById(records: PsRecord[], id: string | null | undefined): PsRecord | null {
  if (!id) return null;
  return records.find((r) => r.ps_id === id) ?? null;
}

function readPsIdFromUrl(): string | null {
  const hash = window.location.hash.replace(/^#/, "");
  const match = /^ps-(\d+)$/.exec(hash);
  return match ? match[1] : null;
}

export function Dashboard({ payload, onLogout }: DashboardProps) {
  const [filters, setFilters] = useState<Filters>({
    query: "",
    category: "",
    theme: "",
    organization: "",
  });
  const [sort, setSort] = useState<SortMode>("hottest");
  const [selectedId, setSelectedId] = useState<string | null>(() => readPsIdFromUrl());
  const [toast, setToast] = useState<string | null>(null);
  /** True while we own a history entry for the open detail. */
  const pushedRef = useRef(false);

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

  const selected = useMemo(
    () => recordById(payload.records, selectedId),
    [payload.records, selectedId],
  );

  useEffect(() => {
    if (selectedId && !filtered.some((r) => r.ps_id === selectedId)) {
      closeDetail({ replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- closeDetail is stable enough; avoid loops
  }, [filtered, selectedId]);

  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      const state = (event.state ?? {}) as NavState;
      if (state.sihPsId) {
        setSelectedId(state.sihPsId);
        pushedRef.current = true;
      } else {
        setSelectedId(null);
        pushedRef.current = false;
      }
    }
    window.addEventListener("popstate", onPopState);

    // Deep link / refresh with #ps-… — seed history so the first back returns to the list.
    const initialId = readPsIdFromUrl();
    if (initialId && recordById(payload.records, initialId)) {
      const listUrl = `${window.location.pathname}${window.location.search}`;
      const detailUrl = `${listUrl}#ps-${initialId}`;
      window.history.replaceState({ sihPsId: null } satisfies NavState, "", listUrl);
      window.history.pushState({ sihPsId: initialId } satisfies NavState, "", detailUrl);
      pushedRef.current = true;
      setSelectedId(initialId);
    }

    return () => window.removeEventListener("popstate", onPopState);
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openDetail(record: PsRecord) {
    if (selectedId === record.ps_id) return;
    setSelectedId(record.ps_id);
    const url = `${window.location.pathname}${window.location.search}#ps-${record.ps_id}`;
    window.history.pushState({ sihPsId: record.ps_id } satisfies NavState, "", url);
    pushedRef.current = true;
  }

  function closeDetail(opts?: { replace?: boolean }) {
    setSelectedId(null);
    const listUrl = `${window.location.pathname}${window.location.search}`;
    if (opts?.replace || !pushedRef.current) {
      window.history.replaceState({ sihPsId: null } satisfies NavState, "", listUrl);
      pushedRef.current = false;
      return;
    }
    // Prefer real history.back so iOS swipe / Android back match the stack.
    pushedRef.current = false;
    window.history.back();
  }

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

      <div className={`dash-main${selected ? " has-selection" : ""}`}>
        <PsList
          records={filtered}
          selectedId={selected?.ps_id ?? null}
          onSelect={openDetail}
        />
        <PsDetail
          record={selected}
          sourceUrl={payload.source_url}
          onToast={setToast}
          onBack={() => closeDetail()}
        />
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
