const TRUSTED_HISTORICAL_SOURCE_URLS = new Set([
  "https://docs.google.com/spreadsheets/d/1Xna6okyL59bk3m6oHphZrN-RWWxOtnBIL0R5EpaZ__4/edit",
  "https://file.lacounty.gov/SDSInter/lac/1191567_EatonFireTimelineOverview.pdf",
  "https://fsri.org/research-update/southern-california-fires-timeline-report",
  "https://www.fire.ca.gov/incidents/2018/11/8/camp-fire"
]);

export function trustedHistoricalSourceUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const normalized = url.toString();
    return TRUSTED_HISTORICAL_SOURCE_URLS.has(normalized) ? normalized : null;
  } catch {
    return null;
  }
}
