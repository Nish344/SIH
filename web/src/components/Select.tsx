import { useEffect, useId, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };

type SelectProps = {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  compact?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function Select({
  label,
  value,
  options,
  onChange,
  compact = false,
  className = "",
  "aria-label": ariaLabel,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? options[0];
  const display = selected?.label ?? "All";

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      className={`picker${compact ? " picker--compact" : ""}${open ? " is-open" : ""} ${className}`.trim()}
      ref={rootRef}
    >
      {!compact && <span className="picker-label">{label}</span>}
      <button
        type="button"
        className="picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel ?? label}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="picker-value">{display}</span>
        <span className="picker-chevron" aria-hidden="true" />
      </button>
      {open && (
        <ul id={listId} className="picker-menu" role="listbox" aria-label={label}>
          {options.map((o) => {
            const isSelected = o.value === value;
            return (
              <li key={o.value || "__all__"} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`picker-option${isSelected ? " is-selected" : ""}`}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  {o.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
