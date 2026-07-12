export type OfficialTimelineRow = {
  time: string;
  source: string;
  text: string;
  url: string;
};

export type SourceRowCategory =
  | "route_reference"
  | "hazard_reference"
  | "official_notice_reference"
  | "assistance_reference";

export type NormalizedSourceRow = {
  time: string;
  source: string;
  sourceText: string;
  sourceUrl: string;
  categories: SourceRowCategory[];
};

function containsAny(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function categorizeSourceText(text: string): SourceRowCategory[] {
  const categoryRules: Array<[SourceRowCategory, string[]]> = [
    ["route_reference", ["road", "route", "corridor", "traffic", "congestion", "closure", "closed", "blocked"]],
    ["hazard_reference", ["smoke", "column", "thermal", "fire", "spread", "wind"]],
    ["official_notice_reference", ["warning", "evacuation", "order"]],
    ["assistance_reference", ["mobility", "elderly", "medical", "transport", "assistance"]]
  ] as const;

  return categoryRules.filter(([, terms]) => containsAny(text, terms)).map(([category]) => category);
}

export function normalizeOfficialRows(rows: OfficialTimelineRow[]): NormalizedSourceRow[] {
  return rows.map((row) => ({
    time: row.time,
    source: row.source,
    sourceText: row.text,
    sourceUrl: row.url,
    categories: categorizeSourceText(row.text)
  }));
}
