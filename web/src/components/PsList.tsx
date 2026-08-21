import { formatDelta } from "../lib/format";
import type { PsRecord } from "../types";

type PsListProps = {
  records: PsRecord[];
  selectedId: string | null;
  onSelect: (record: PsRecord) => void;
};

export function PsList({ records, selectedId, onSelect }: PsListProps) {
  if (records.length === 0) {
    return (
      <div className="ps-list empty">
        <p>No problem statements match your filters.</p>
      </div>
    );
  }

  return (
    <ul className="ps-list" role="listbox" aria-label="Problem statements">
      {records.map((record) => {
        const selected = record.ps_id === selectedId;
        const fillPct = Math.round(record.fill_ratio * 100);
        return (
          <li key={record.ps_id}>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              className={`ps-row${selected ? " selected" : ""}`}
              onClick={() => onSelect(record)}
            >
              <span className="ps-row-num">{record.ps_number}</span>
              <span className="ps-row-main">
                <span className="ps-row-title">{record.title}</span>
                <span className="ps-row-org">{record.organization}</span>
              </span>
              <span className="ps-row-meta">
                <span className="ps-tag">{record.theme}</span>
                <span className="ps-tag">{record.category}</span>
              </span>
              <span className="ps-row-stats">
                <span className="ps-ideas">
                  {record.idea_count}/{record.idea_cap}
                </span>
                <span className="ps-fill" title={`${fillPct}% full`}>
                  <span className="ps-fill-bar" style={{ width: `${fillPct}%` }} />
                </span>
                <span className="ps-delta">
                  Δ1d {formatDelta(record.delta_1d)} · Δ3d {formatDelta(record.delta_3d)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
