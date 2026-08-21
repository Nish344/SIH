import { useState, type FormEvent } from "react";
import { login } from "../api";

type LoginFormProps = {
  onSuccess: () => void;
};

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(password);
      onSuccess();
    } catch (err) {
      const code = err instanceof Error ? err.message : "auth_failed";
      if (code === "rate_limited") {
        setError("Too many attempts — wait a minute and try again.");
      } else {
        setError("Incorrect password. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-panel">
        <h1 className="brand">SIH PS</h1>
        <p className="login-sub">Smart India Hackathon 2026 problem statements</p>
        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={loading}
          />
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={loading || !password}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
