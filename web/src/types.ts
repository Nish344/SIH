export type PsRecord = {
  serial: number;
  organization: string;
  title: string;
  category: string;
  ps_number: string;
  idea_count: number;
  idea_cap: number;
  theme: string;
  deadline: string;
  scraped_at: string;
  delta_1d: number | null;
  delta_3d: number | null;
  fill_ratio: number;
  ps_id: string;
  description_text: string;
  department: string;
  youtube_url: string;
  dataset_url: string;
  contact: string;
};

export type PsPayload = {
  source_url: string;
  scraped_at: string;
  page_ps_count: number;
  records: PsRecord[];
};

export type SortMode =
  | "hottest"
  | "coldest"
  | "most_ideas"
  | "least_ideas"
  | "fill_ratio"
  | "portal";

export type Filters = {
  query: string;
  category: string;
  theme: string;
  organization: string;
};
