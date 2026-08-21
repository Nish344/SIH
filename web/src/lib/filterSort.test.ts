import { describe, expect, it } from "vitest";
import { filterAndSort, type PsRecord } from "./filterSort";

const base = (over: Partial<PsRecord>): PsRecord => ({
  serial: 1,
  organization: "Org A",
  title: "Alpha landslide",
  category: "Software",
  ps_number: "SIH26001",
  idea_count: 10,
  idea_cap: 500,
  theme: "Disaster Management",
  deadline: "20 September 2026",
  scraped_at: "2026-08-21T15:50:24Z",
  delta_1d: 0,
  delta_3d: null,
  fill_ratio: 0.02,
  ps_id: "26001",
  description_text: "warning system",
  department: "Org A",
  youtube_url: "",
  dataset_url: "",
  contact: "",
  ...over,
});

describe("filterAndSort", () => {
  const records = [
    base({ serial: 1, ps_number: "SIH26001", delta_1d: 5, idea_count: 10, title: "Hot" }),
    base({ serial: 2, ps_number: "SIH26002", delta_1d: null, idea_count: 50, title: "Null delta", theme: "Other" }),
    base({ serial: 3, ps_number: "SIH26003", delta_1d: 1, idea_count: 2, title: "Cold", category: "Hardware", organization: "Org B" }),
  ];

  it("defaults hottest with nulls last", () => {
    const out = filterAndSort(records, { query: "", category: "", theme: "", organization: "" }, "hottest");
    expect(out.map((r) => r.ps_number)).toEqual(["SIH26001", "SIH26003", "SIH26002"]);
  });

  it("sorts coldest with nulls last", () => {
    const out = filterAndSort(records, { query: "", category: "", theme: "", organization: "" }, "coldest");
    expect(out.map((r) => r.ps_number)).toEqual(["SIH26003", "SIH26001", "SIH26002"]);
  });

  it("filters category and query", () => {
    const out = filterAndSort(
      records,
      { query: "cold", category: "Hardware", theme: "", organization: "" },
      "portal",
    );
    expect(out.map((r) => r.ps_number)).toEqual(["SIH26003"]);
  });
});
