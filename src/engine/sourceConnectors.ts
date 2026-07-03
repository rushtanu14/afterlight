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
    proof: "Weather alerts become early leave-before signals.",
    mode: "live-api"
  },
  {
    id: "cal-fire",
    name: "CAL FIRE",
    status: "incident",
    detail: "incident and evacuation vocabulary",
    proof: "Official incident language grounds route and warning states.",
    mode: "curated-official"
  },
  {
    id: "nasa-firms",
    name: "NASA FIRMS",
    status: "thermal",
    detail: "satellite fire-detection reference",
    proof: "Thermal detections are treated as evidence, never as evacuation orders.",
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
    detail: "mobility, medication, route rules",
    proof: "Local needs turn official signals into household-specific timing.",
    mode: "household-memory"
  }
];

export function connectorReadinessScore(connectors: SourceConnector[]) {
  const weighted = connectors.reduce((total, connector) => {
    const weight = connector.mode === "household-memory" ? 1.4 : connector.mode === "live-api" ? 1.2 : 1;
    return total + weight;
  }, 0);

  return Math.round((weighted / (connectors.length * 1.4)) * 100);
}
