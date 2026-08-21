export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((then - now) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (abs < 60) return rtf.format(diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour");
  const diffDay = Math.round(diffHr / 24);
  return rtf.format(diffDay, "day");
}

export function formatAbsoluteTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDelta(value: number | null): string {
  if (value === null) return "—";
  if (value > 0) return `+${value}`;
  return String(value);
}

export function isLinkableContact(contact: string): boolean {
  const c = contact.trim();
  if (!c) return false;
  if (/^mailto:/i.test(c)) return true;
  if (/^https?:\/\//i.test(c)) return true;
  if (/^[\w.+-]+@[\w.-]+\.\w+$/.test(c)) return true;
  return false;
}

export function contactHref(contact: string): string {
  const c = contact.trim();
  if (/^mailto:/i.test(c) || /^https?:\/\//i.test(c)) return c;
  if (/^[\w.+-]+@[\w.-]+\.\w+$/.test(c)) return `mailto:${c}`;
  return c;
}
