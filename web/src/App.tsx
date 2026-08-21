import { useCallback, useEffect, useState } from "react";
import { fetchPs } from "./api";
import { LoginForm } from "./components/LoginForm";
import { Dashboard } from "./components/Dashboard";
import type { PsPayload } from "./types";

type AppState =
  | { phase: "loading" }
  | { phase: "login" }
  | { phase: "dashboard"; payload: PsPayload }
  | { phase: "no_data" }
  | { phase: "error"; message: string };

export default function App() {
  const [state, setState] = useState<AppState>({ phase: "loading" });

  const loadData = useCallback(async () => {
    setState({ phase: "loading" });
    try {
      const payload = await fetchPs();
      setState({ phase: "dashboard", payload });
    } catch (err) {
      const code = err instanceof Error ? err.message : "fetch_failed";
      if (code === "unauthorized") {
        setState({ phase: "login" });
      } else if (code === "scrape_data_unavailable") {
        setState({ phase: "no_data" });
      } else {
        setState({ phase: "error", message: "Could not load problem statements." });
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (state.phase === "loading") {
    return (
      <div className="app-shell">
        <p className="loading-msg">Loading…</p>
      </div>
    );
  }

  if (state.phase === "login") {
    return (
      <div className="app-shell">
        <LoginForm onSuccess={loadData} />
      </div>
    );
  }

  if (state.phase === "no_data") {
    return (
      <div className="app-shell">
        <div className="empty-state">
          <h1 className="brand">SIH PS</h1>
          <p>No scrape data yet.</p>
          <p className="empty-hint">
            Run the scraper or wait for the next cron job, then refresh this page.
          </p>
          <button type="button" onClick={loadData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="app-shell">
        <div className="empty-state">
          <h1 className="brand">SIH PS</h1>
          <p>{state.message}</p>
          <button type="button" onClick={loadData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Dashboard
        payload={state.payload}
        onLogout={() => setState({ phase: "login" })}
      />
    </div>
  );
}
