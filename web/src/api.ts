import type { PsPayload } from "./types";

export async function login(password: string): Promise<void> {
  const r = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ password }),
  });
  if (r.status === 429) throw new Error("rate_limited");
  if (!r.ok) throw new Error("auth_failed");
}

export async function logout(): Promise<void> {
  await fetch("/logout", { method: "POST", credentials: "include" });
}

export async function fetchPs(): Promise<PsPayload> {
  const r = await fetch("/api/ps", { credentials: "include" });
  if (r.status === 401) throw new Error("unauthorized");
  if (r.status === 503) throw new Error("scrape_data_unavailable");
  if (!r.ok) throw new Error("fetch_failed");
  return r.json();
}
