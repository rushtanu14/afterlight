import type { HistoricalEvent, OfficialSignal, RouteOption } from "../data/replay";

const RECOGNIZED_HISTORICAL_SOURCES = new Map([
  [
    "https://docs.google.com/spreadsheets/d/1Xna6okyL59bk3m6oHphZrN-RWWxOtnBIL0R5EpaZ__4/edit",
    new Set(["FSRI Palisades worksheet", "FSRI Eaton worksheet"])
  ],
  ["https://file.lacounty.gov/SDSInter/lac/1191567_EatonFireTimelineOverview.pdf", new Set(["LA County Eaton timeline overview"])]
]);

export type HistoricalDecisionMode = "prepare" | "official_action";

export type HistoricalDecision = {
  eventId: string;
  timestamp: string;
  mode: HistoricalDecisionMode;
  officialSignal: OfficialSignal;
  primaryRouteMemory: RouteOption;
  alternateRouteMemory: RouteOption;
  triggerSummary: string;
};

function getRoute(event: HistoricalEvent, routeId: string, role: string) {
  const route = event.routePlan.routes.find((candidate) => candidate.id === routeId);
  if (!route) throw new Error(`Missing ${role} route memory: ${routeId}`);
  return { ...route };
}

function isOfficialAction(signal: OfficialSignal) {
  return signal === "evacuation_warning" || signal === "evacuation_order";
}

function recognizedSource(sourceUrl: string, sourceLabel: string) {
  try {
    const url = new URL(sourceUrl);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      RECOGNIZED_HISTORICAL_SOURCES.get(url.toString())?.has(sourceLabel) === true
    );
  } catch {
    return false;
  }
}

function officialTimeParts(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (minute > 59 || hour > (meridiem ? 12 : 23) || hour < 0) return null;
  if (meridiem) {
    if (hour === 12) hour = 0;
    if (meridiem === "PM") hour += 12;
  }
  return { hour, minute };
}

function recordMatchesTimestamp(event: HistoricalEvent) {
  const instant = new Date(event.timestamp);
  if (Number.isNaN(instant.getTime())) return false;

  const date = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Los_Angeles"
  }).format(instant);
  const displayTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Los_Angeles"
  }).format(instant);
  const timeParts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Los_Angeles"
  }).formatToParts(instant);
  const timestampHour = Number(timeParts.find((part) => part.type === "hour")?.value);
  const timestampMinute = Number(timeParts.find((part) => part.type === "minute")?.value);
  const recordTime = officialTimeParts(event.officialRecord.eventTime);

  return (
    date === event.officialRecord.eventDate &&
    displayTime === event.displayTime &&
    recordTime?.hour === timestampHour &&
    recordTime.minute === timestampMinute
  );
}

function recordSupportsSignal(event: HistoricalEvent) {
  const text = event.officialRecord.eventDescription;
  if (event.officialSignal === "evacuation_warning") return /\bevacuation warnings?\b/i.test(text);
  if (event.officialSignal === "evacuation_order") return /\bevacuation order\b/i.test(text);
  return false;
}

function hasVerifiedOfficialAction(event: HistoricalEvent) {
  const record = event.officialRecord;
  return (
    isOfficialAction(event.officialSignal) &&
    recognizedSource(event.sourceUrl, event.sourceLabel) &&
    record.sourceDescription.trim().length > 0 &&
    record.incidentName.trim().length > 0 &&
    record.eventDescription.trim().length > 0 &&
    event.sourceText === record.eventDescription &&
    recordMatchesTimestamp(event) &&
    recordSupportsSignal(event)
  );
}

export function evaluateHistoricalEvent(event: HistoricalEvent): HistoricalDecision {
  const officialAction = hasVerifiedOfficialAction(event);

  return {
    eventId: event.id,
    timestamp: event.timestamp,
    mode: officialAction ? "official_action" : "prepare",
    officialSignal: event.officialSignal,
    primaryRouteMemory: getRoute(event, event.routePlan.primaryRouteId, "primary"),
    alternateRouteMemory: getRoute(event, event.routePlan.backupRouteId, "alternate"),
    triggerSummary: officialAction
      ? "This historical row contains an official warning or order. It is not current guidance."
      : isOfficialAction(event.officialSignal)
        ? "This claimed warning or order could not be verified against its historical source record. It is not an evacuation instruction."
        : "This historical row is descriptive context, not an evacuation instruction."
  };
}

export function evaluateScenario(events: HistoricalEvent[]) {
  return events.map(evaluateHistoricalEvent);
}
