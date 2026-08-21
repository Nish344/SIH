import { describe, expect, it } from "vitest";
import { buildPrompt } from "./prompt";
import type { PsRecord } from "../types";

it("includes key fields", () => {
  const r = {
    title: "T",
    ps_number: "SIH26001",
    ps_id: "26001",
    category: "Software",
    theme: "X",
    organization: "O",
    description_text: "Desc",
  } as PsRecord;
  const p = buildPrompt(r);
  expect(p).toContain("SIH26001");
  expect(p).toContain("Desc");
  expect(p.toLowerCase()).toContain("approach");
});
