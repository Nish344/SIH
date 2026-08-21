import { describe, expect, it } from "vitest";
import { openLlm } from "./llmLinks";

it("prefills short prompts", () => {
  const r = openLlm("chatgpt", "short prompt");
  expect(r.mode).toBe("prefill");
  expect(r.url).toContain("chatgpt.com");
  expect(r.url).toContain(encodeURIComponent("short prompt"));
});

it("falls back when url would be too long", () => {
  const long = "x".repeat(5000);
  const r = openLlm("chatgpt", long);
  expect(r.mode).toBe("copy_fallback");
  expect(r.url).toBe("https://chatgpt.com/");
});
