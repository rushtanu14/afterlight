export type OfficialSignal =
  | "readiness_notice"
  | "incident_report"
  | "awareness_alert"
  | "alert_preparation"
  | "evacuation_warning"
  | "evacuation_order"
  | "road_closure";

export type HistoricalRouteState = "not_stated_in_row" | "access_restricted" | "blocked";

export type RouteOption = {
  id: string;
  name: string;
  role: "primary" | "backup";
  state: HistoricalRouteState;
};

export type RoutePlan = {
  primaryRouteId: string;
  backupRouteId: string;
  routes: RouteOption[];
};

export type OfficialRecord = {
  sourceDescription: string;
  eventDate: string;
  eventTime: string;
  incidentName: string;
  eventLocation: string;
  eventUnits: string;
  eventDescription: string;
};

export type MapReadings = {
  spreadLabel: string;
  windLabel: string;
  roadLabel: string;
  alertLabel: string;
};

export type GeoPoint = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  kind: "household" | "fire_origin" | "official_row";
  provenance: "illustrative_anchor" | "official_source_coordinate";
};

export type PerimeterLayer = {
  label: string;
  serviceUrl: string;
  layerId: number;
  sourceUrl: string;
};

export type OsmRoadQuery = {
  id: string;
  label: string;
  roadName: string;
  role: "primary" | "backup" | "alternate";
  provenance: "illustrative_household_role";
};

export type RoadGeometrySnapshot = {
  id: string;
  label: string;
  role: "primary" | "backup" | "alternate";
  source: "OpenStreetMap API 0.6 way/full";
  wayIds: number[];
  wayUrls: string[];
  capturedOn: string;
  attribution: "© OpenStreetMap contributors";
  licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/";
  paths: Array<Array<[number, number]>>;
};

export type IncidentMapGeometry = {
  center: {
    latitude: number;
    longitude: number;
  };
  zoom: number;
  bbox: [number, number, number, number];
  points: GeoPoint[];
  perimeterLayer?: PerimeterLayer;
  osmRoads: OsmRoadQuery[];
  roadSnapshots: RoadGeometrySnapshot[];
};

export type HistoricalEvent = {
  id: string;
  timestamp: string;
  displayTime: string;
  title: string;
  sourceLabel: string;
  sourceUrl: string;
  sourceText: string;
  officialSignal: OfficialSignal;
  officialRecord: OfficialRecord;
  narrative: string;
  mapReadings: MapReadings;
  routePlan: RoutePlan;
  mapPointId: string;
  failureLesson: string;
  futureLesson: string;
};

export type HistoricalScenarioId = "palisades-2025" | "eaton-2025";

export type HistoricalScenario = {
  id: HistoricalScenarioId;
  name: string;
  region: string;
  sourceLabel: string;
  sourceUrl: string;
  sourceNote: string;
  mapGeometry: IncidentMapGeometry;
  events: HistoricalEvent[];
};

export type ArchiveReference = {
  id: "camp-2018";
  name: "Camp Fire";
  sourceUrl: string;
  evaluationStatus: "insufficient_official_rows";
};

export const baseRoutes: RouteOption[] = [
  {
    id: "ridge",
    name: "Ridge Road",
    role: "primary",
    state: "not_stated_in_row"
  },
  {
    id: "coast",
    name: "Coast Highway",
    role: "backup",
    state: "not_stated_in_row"
  },
  {
    id: "valley",
    name: "Valley Connector",
    role: "backup",
    state: "not_stated_in_row"
  }
];

export const defaultRoutePlan: RoutePlan = {
  primaryRouteId: "ridge",
  backupRouteId: "coast",
  routes: baseRoutes
};

export function createRoutePlan(changes: Partial<RouteOption>[], primaryRouteId = "ridge", backupRouteId = "coast"): RoutePlan {
  return {
    primaryRouteId,
    backupRouteId,
    routes: baseRoutes.map((route) => {
      const change = changes.find((candidate) => candidate.id === route.id);
      return change ? { ...route, ...change } : route;
    })
  };
}
