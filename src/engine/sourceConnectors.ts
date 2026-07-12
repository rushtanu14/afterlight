import type { LiveSourceState } from "./liveSources";

export type SourceConnector = {
  id: string;
  name: string;
  status: string;
  detail: string;
  proof: string;
  mode: "live-api" | "public-map" | "curated-official" | "household-memory";
};

export const sourceConnectors: SourceConnector[] = [
  {
    id: "nws",
    name: "NWS",
    status: "watch",
    detail: "red flag and wind context",
    proof: "Current alert records remain descriptive and separate from historical replay.",
    mode: "live-api"
  },
  {
    id: "cal-fire",
    name: "CAL FIRE",
    status: "incident",
    detail: "incident and evacuation vocabulary",
    proof: "Curated official incident language remains source evidence, not current guidance.",
    mode: "curated-official"
  },
  {
    id: "nasa-firms",
    name: "NASA FIRMS",
    status: "optional",
    detail: "server proxy required",
    proof: "No FIRMS credential or request is exposed to the browser.",
    mode: "public-map"
  },
  {
    id: "openstreetmap",
    name: "OpenStreetMap",
    status: "map",
    detail: "road geometry and tile base",
    proof: "Road context keeps the replay spatial instead of purely textual.",
    mode: "public-map"
  },
  {
    id: "arcgis",
    name: "ArcGIS",
    status: "perimeter",
    detail: "dashboard and perimeter pattern",
    proof: "Incident perimeter and dashboard conventions become reusable adapters.",
    mode: "public-map"
  },
  {
    id: "household-memory",
    name: "Household",
    status: "memory",
    detail: "case-scoped preparedness lessons",
    proof: "Device-local edits preserve household review notes without producing current action guidance.",
    mode: "household-memory"
  }
];

export type SourceHealthSummary = {
  checked: number;
  usable: number;
  degraded: number;
};

export function summarizeSourceHealth(states: LiveSourceState[]): SourceHealthSummary {
  const checkedStates = states.filter((state) => state.status !== "optional");
  const usable = checkedStates.filter((state) => state.status === "live" || state.status === "quiet").length;

  return {
    checked: checkedStates.length,
    usable,
    degraded: checkedStates.length - usable
  };
}
