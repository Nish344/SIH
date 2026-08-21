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
        const fillPct = Math.min(100, Math.round(record.fill_ratio * 100));
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
              <span className="ps-row-title">{record.title}</span>
              <span className="ps-ideas" title="Submitted ideas / cap">
                {record.idea_count}
                <span className="ps-ideas-cap">/{record.idea_cap}</span>
              </span>
              <span className="ps-row-sub">
                <span className="ps-row-org">{record.organization}</span>
                <span className="ps-dot" aria-hidden="true">
                  ·
                </span>
                <span className="ps-tag">{record.theme}</span>
                <span className="ps-dot" aria-hidden="true">
                  ·
                </span>
                <span className="ps-tag">{record.category}</span>
              </span>
              <span className="ps-row-metrics">
                <span className="ps-fill" title={`${fillPct}% full`}>
                  <span className="ps-fill-bar" style={{ width: `${fillPct}%` }} />
                </span>
                <span className="ps-delta">
                  <span className="ps-delta-item">1d {formatDelta(record.delta_1d)}</span>
                  <span className="ps-delta-item">3d {formatDelta(record.delta_3d)}</span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
