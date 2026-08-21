export type { Filters, PsRecord, SortMode } from "../types";
import type { Filters, PsRecord, SortMode } from "../types";

function matchesQuery(record: PsRecord, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const haystack = [
    record.title,
    record.organization,
    record.ps_number,
    record.description_text,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function matchesExact(value: string, filter: string): boolean {
  return !filter || value === filter;
}

function compareDelta(a: number | null, b: number | null, ascending: boolean): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return ascending ? a - b : b - a;
}

function compareNumeric(a: number, b: number, ascending: boolean): number {
  return ascending ? a - b : b - a;
}

function sortRecords(records: PsRecord[], sort: SortMode): PsRecord[] {
  const sorted = [...records];
  sorted.sort((a, b) => {
    switch (sort) {
      case "hottest":
        return compareDelta(a.delta_1d, b.delta_1d, false);
      case "coldest":
        return compareDelta(a.delta_1d, b.delta_1d, true);
      case "most_ideas":
        return compareNumeric(a.idea_count, b.idea_count, false);
      case "least_ideas":
        return compareNumeric(a.idea_count, b.idea_count, true);
      case "fill_ratio":
        return compareNumeric(a.fill_ratio, b.fill_ratio, false);
      case "portal":
        return compareNumeric(a.serial, b.serial, true);
      default:
        return 0;
    }
  });
  return sorted;
}

export function filterAndSort(
  records: PsRecord[],
  filters: Filters,
  sort: SortMode,
): PsRecord[] {
  const filtered = records.filter(
    (record) =>
      matchesQuery(record, filters.query) &&
      matchesExact(record.category, filters.category) &&
      matchesExact(record.theme, filters.theme) &&
      matchesExact(record.organization, filters.organization),
  );
  return sortRecords(filtered, sort);
}
