import type { ReplayEvent } from "../data/replay";

export type RiskLevel = "low" | "medium" | "high";
export type DecisionMode = "prepare" | "leave_now" | "review";

export type HouseholdProfile = {
  label: string;
  mobilityBufferMinutes: number;
  primaryRoute: string;
  backupRoutes: string[];
};

export type RouteStatus = "available" | "watched" | "degraded";

export type RouteChoice = {
  name: string;
  status: RouteStatus;
  reason: string;
};

export type EvidenceTrailItem = {
  rule: "hazard_movement" | "route_stress" | "official_source" | "assistance_pressure" | "recovery";
  time: string;
  source: string;
  detail: string;
  weight: number;
};

export type DetectorDecision = {
  time: string;
  mode: DecisionMode;
  routeClosureRisk: RiskLevel;
  backupOverloadRisk: RiskLevel;
  leaveBeforeSignal: string;
  mobilityBufferMinutes: number;
  primaryRoute: RouteChoice;
  backupRoutes: RouteChoice[];
  recommendedRoute: RouteChoice;
  detectedFailureIds: string[];
  evidenceTrail: EvidenceTrailItem[];
  score: number;
};

export const defaultHouseholdProfile: HouseholdProfile = {
  label: "Elderly resident living alone",
  mobilityBufferMinutes: 30,
  primaryRoute: "Ridge road",
  backupRoutes: ["Valley connector", "Canyon shelter spur"]
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function riskFromScore(score: number): RiskLevel {
  if (score >= 70) return "high";
  if (score >= 38) return "medium";
  return "low";
}

function hasAssistancePressure(event: ReplayEvent) {
  return event.failures.some((failure) => failure.id === "help-need") || event.signal.toLowerCase().includes("mobility");
}

function buildEvidenceTrail(event: ReplayEvent): EvidenceTrailItem[] {
  const trail: EvidenceTrailItem[] = [];

  if (event.spread >= 45 || event.risk === "warning" || event.risk === "critical") {
    trail.push({
      rule: "hazard_movement",
      time: event.time,
      source: event.source,
      detail: `${event.signal}: fire spread signal at ${event.spread}%.`,
      weight: event.spread
    });
  }

  if (event.routeStress >= 52) {
    trail.push({
      rule: "route_stress",
      time: event.time,
      source: event.source,
      detail: `Route stress reached ${event.routeStress}%.`,
      weight: event.routeStress
    });
  }

  if (event.officialConfidence >= 80) {
    trail.push({
      rule: "official_source",
      time: event.time,
      source: event.source,
      detail: `Source confidence is ${event.officialConfidence}% across ${event.evidence.length} evidence cards.`,
      weight: event.officialConfidence
    });
  }

  if (hasAssistancePressure(event)) {
    trail.push({
      rule: "assistance_pressure",
      time: event.time,
      source: event.source,
      detail: "Known mobility or neighbor-assistance pressure is active.",
      weight: 88
    });
  }

  if (event.risk === "recovery") {
    trail.push({
      rule: "recovery",
      time: event.time,
      source: event.source,
      detail: "The event has moved into review mode; preserve lessons instead of issuing new movement guidance.",
      weight: 94
    });
  }

  return trail;
}

export function detectDecision(event: ReplayEvent, profile: HouseholdProfile = defaultHouseholdProfile): DetectorDecision {
  const evidenceTrail = buildEvidenceTrail(event);
  const hazardWeight = event.spread * 0.38;
  const routeWeight = event.routeStress * 0.44;
  const sourceWeight = event.officialConfidence * 0.18;
  const score = clampScore(hazardWeight + routeWeight + sourceWeight);
  const stackedRouteFailure = event.spread >= 60 && event.routeStress >= 68 && event.officialConfidence >= 85;
  const routeClosureRisk = event.risk === "recovery" ? "medium" : stackedRouteFailure ? "high" : riskFromScore(score);
  const assistancePressure = hasAssistancePressure(event);
  const backupOverloadRisk: RiskLevel =
    event.risk === "recovery" ? "medium" : event.routeStress >= 80 && assistancePressure ? "high" : event.routeStress >= 68 ? "medium" : "low";
  const mode: DecisionMode = event.risk === "recovery" ? "review" : routeClosureRisk === "high" ? "leave_now" : "prepare";
  const primaryRoute: RouteChoice = {
    name: profile.primaryRoute,
    status: routeClosureRisk === "high" ? "degraded" : routeClosureRisk === "medium" ? "watched" : "available",
    reason:
      routeClosureRisk === "high"
        ? "Hazard movement, route stress, and official-source confidence are stacked."
        : "The primary route remains usable only while source checks stay below the leave-before threshold."
  };
  const backupRoutes: RouteChoice[] = profile.backupRoutes.map((route, index) => ({
    name: route,
    status: backupOverloadRisk === "high" && index === 0 ? "watched" : "available",
    reason:
      backupOverloadRisk === "high" && index === 0
        ? "Backup pressure is rising because assistance needs and congestion are active together."
        : "Still available under the current source chain."
  }));
  const recommendedRoute = routeClosureRisk === "high" ? backupRoutes[0] : primaryRoute;
  const leaveBeforeSignal =
    event.risk === "recovery"
      ? "Review the route and assistance cards before fire season."
      : `Leave before route stress reaches ${Math.max(event.routeStress, 68)}% again while smoke movement and official warning signals are active.`;

  return {
    time: event.time,
    mode,
    routeClosureRisk,
    backupOverloadRisk,
    leaveBeforeSignal,
    mobilityBufferMinutes: profile.mobilityBufferMinutes,
    primaryRoute,
    backupRoutes,
    recommendedRoute,
    detectedFailureIds: event.failures.map((failure) => failure.id),
    evidenceTrail,
    score
  };
}

export function replayDecisionSeries(events: ReplayEvent[], profile: HouseholdProfile = defaultHouseholdProfile) {
  return events.map((event) => detectDecision(event, profile));
}
