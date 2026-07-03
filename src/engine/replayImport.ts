export type OfficialTimelineRow = {
  time: string;
  source: string;
  text: string;
  url: string;
};

export type NormalizedSignalRow = {
  time: string;
  source: string;
  routeStress: number;
  spread: number;
  officialConfidence: number;
  tags: string[];
};

function containsAny(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function scoreRouteStress(text: string) {
  let score = 24;
  if (containsAny(text, ["road", "route", "corridor", "traffic", "congestion"])) score += 28;
  if (containsAny(text, ["slowing", "crawl", "blocked", "closure", "closed"])) score += 26;
  return Math.min(score, 96);
}

function scoreSpread(text: string) {
  let score = 22;
  if (containsAny(text, ["smoke", "column", "fire", "thermal"])) score += 24;
  if (containsAny(text, ["moving", "spread", "toward", "wind"])) score += 20;
  return Math.min(score, 96);
}

function scoreOfficialConfidence(row: OfficialTimelineRow) {
  let score = row.url.startsWith("https://") ? 64 : 50;
  if (containsAny(row.source, ["agency", "cal fire", "nws", "county", "official"])) score += 24;
  return Math.min(score, 98);
}

function extractTags(text: string) {
  const tagRules = [
    ["route", ["road", "route", "corridor", "traffic", "congestion", "closure"]],
    ["smoke", ["smoke", "column", "thermal", "fire"]],
    ["warning", ["warning", "evacuation", "order"]],
    ["assistance", ["mobility", "elderly", "medical", "transport", "assistance"]]
  ] as const;

  return tagRules.filter(([, terms]) => containsAny(text, [...terms])).map(([tag]) => tag);
}

export function normalizeOfficialRows(rows: OfficialTimelineRow[]): NormalizedSignalRow[] {
  return rows.map((row) => ({
    time: row.time,
    source: row.source,
    routeStress: scoreRouteStress(row.text),
    spread: scoreSpread(row.text),
    officialConfidence: scoreOfficialConfidence(row),
    tags: extractTags(row.text)
  }));
}
