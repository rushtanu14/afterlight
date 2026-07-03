import type { IncidentOption } from "../data/replay";

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type LiveSourceId = "nominatim" | "nifc" | "nws" | "eonet" | "firms";
export type LiveSourceStatus = "live" | "quiet" | "limited" | "error" | "optional";
export type LiveSignalSeverity = "watch" | "warning" | "critical";

export type LiveLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

export type LiveSignal = {
  id: string;
  source: string;
  title: string;
  detail: string;
  severity: LiveSignalSeverity;
  time: string;
  url: string;
  latitude?: number;
  longitude?: number;
};

export type LiveSourceState = {
  id: LiveSourceId;
  name: string;
  status: LiveSourceStatus;
  detail: string;
  checkedAt: string;
  count: number;
  url: string;
};

export type LiveIncidentBundle = {
  location: LiveLocation | null;
  incidents: IncidentOption[];
  signals: LiveSignal[];
  sourceStates: LiveSourceState[];
  checkedAt: string;
};

export type LiveSourceOptions = {
  fetcher?: FetchLike;
  firmsMapKey?: string;
  now?: Date;
};

type SourceResult = {
  incidents: IncidentOption[];
  signals: LiveSignal[];
  state: LiveSourceState;
};

type SourceMeta = {
  id: LiveSourceId;
  name: string;
  url: string;
};

type BoundingBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

const NIFC_WFIGS_URL =
  "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations_Current/FeatureServer/0/query";
const NIFC_LAYER_URL =
  "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations_Current/FeatureServer/0";
const NWS_ALERTS_BASE_URL = "https://api.weather.gov/alerts/active";
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const EONET_EVENTS_URL = "https://eonet.gsfc.nasa.gov/api/v3/events";
const FIRMS_AREA_BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";

class SourceFetchError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function defaultFetch(input: string | URL, init?: RequestInit) {
  if (typeof fetch !== "function") {
    throw new Error("Fetch API is not available in this runtime.");
  }

  return fetch(input, init);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function dateValue(value: unknown) {
  const numeric = numberValue(value);
  if (numeric !== undefined) return new Date(numeric);
  const text = stringValue(value);
  if (text) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return undefined;
}

function formatUtcDate(value: unknown) {
  const date = dateValue(value);
  if (!date) return "time unavailable";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short"
  }).format(date);
}

function formatMiles(value: number) {
  return `${value.toFixed(1)} mi from searched area`;
}

function formatAcres(value: unknown) {
  const acres = numberValue(value);
  if (acres === undefined) return "Size not reported";
  if (acres >= 1000) return `${Math.round(acres).toLocaleString("en-US")} acres`;
  return `${acres.toFixed(acres >= 10 ? 0 : 1)} acres`;
}

function checkedAt(now: Date) {
  return now.toISOString();
}

function haversineMiles(a: LiveLocation, b: Pick<LiveLocation, "latitude" | "longitude">) {
  const earthRadiusMiles = 3958.7613;
  const latitudeDelta = ((b.latitude - a.latitude) * Math.PI) / 180;
  const longitudeDelta = ((b.longitude - a.longitude) * Math.PI) / 180;
  const aLatitude = (a.latitude * Math.PI) / 180;
  const bLatitude = (b.latitude * Math.PI) / 180;
  const hav =
    Math.sin(latitudeDelta / 2) ** 2 + Math.cos(aLatitude) * Math.cos(bLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(hav));
}

function boundingBoxAround(location: LiveLocation, radiusMiles = 75): BoundingBox {
  const latitudeDelta = radiusMiles / 69;
  const longitudeDelta = radiusMiles / (69 * Math.max(0.25, Math.cos((location.latitude * Math.PI) / 180)));

  return {
    west: Math.max(-180, location.longitude - longitudeDelta),
    south: Math.max(-90, location.latitude - latitudeDelta),
    east: Math.min(180, location.longitude + longitudeDelta),
    north: Math.min(90, location.latitude + latitudeDelta)
  };
}

function sourceState(meta: SourceMeta, status: LiveSourceStatus, detail: string, count: number, now: Date): LiveSourceState {
  return {
    id: meta.id,
    name: meta.name,
    status,
    detail,
    checkedAt: checkedAt(now),
    count,
    url: meta.url
  };
}

async function fetchWithTimeout(fetcher: FetchLike, url: string, init: RequestInit = {}, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetcher(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...init.headers
      }
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function readJson(fetcher: FetchLike, url: string, init?: RequestInit) {
  const response = await fetchWithTimeout(fetcher, url, init);
  if (!response.ok) throw new SourceFetchError(`${response.status} from ${url}`, response.status);
  return response.json() as Promise<unknown>;
}

async function readText(fetcher: FetchLike, url: string, init?: RequestInit) {
  const response = await fetchWithTimeout(fetcher, url, init);
  if (!response.ok) throw new SourceFetchError(`${response.status} from ${url}`, response.status);
  return response.text();
}

export async function geocodeLocation(query: string, fetcher: FetchLike = defaultFetch): Promise<LiveLocation> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    addressdetails: "1"
  });
  const results = await readJson(fetcher, `${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
    headers: { Accept: "application/json", "Accept-Language": "en-US" }
  });

  if (!Array.isArray(results) || results.length === 0 || !isRecord(results[0])) {
    throw new Error(`No geocoding match found for ${query}.`);
  }

  const first = results[0];
  const latitude = numberValue(first.lat);
  const longitude = numberValue(first.lon);

  if (latitude === undefined || longitude === undefined) {
    throw new Error(`Geocoding result for ${query} did not include coordinates.`);
  }

  return {
    label: stringValue(first.display_name, query),
    latitude,
    longitude
  };
}

function buildNifcUrl(location: LiveLocation) {
  const bbox = boundingBoxAround(location);
  const params = new URLSearchParams({
    where: "IncidentTypeCategory='WF'",
    geometry: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields:
      "OBJECTID,IncidentName,IncidentSize,FireDiscoveryDateTime,ModifiedOnDateTime_dt,PercentContained,POOCounty,POOState,POOProtectingAgency,InitialLatitude,InitialLongitude,UniqueFireIdentifier",
    returnGeometry: "true",
    f: "geojson",
    resultRecordCount: "12"
  });

  return `${NIFC_WFIGS_URL}?${params.toString()}`;
}

function incidentCoordinates(feature: Record<string, unknown>) {
  const geometry = isRecord(feature.geometry) ? feature.geometry : {};
  const coordinates = Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
  const longitude = numberValue(coordinates[0]);
  const latitude = numberValue(coordinates[1]);
  return latitude !== undefined && longitude !== undefined ? { latitude, longitude } : null;
}

function mapNifcIncident(feature: Record<string, unknown>, location: LiveLocation): IncidentOption | null {
  const properties = isRecord(feature.properties) ? feature.properties : {};
  const coords = incidentCoordinates(feature);
  if (!coords) return null;

  const name = stringValue(properties.IncidentName, "Unnamed wildfire");
  const uniqueId = stringValue(properties.UniqueFireIdentifier, String(numberValue(properties.OBJECTID) ?? name));
  const distance = haversineMiles(location, coords);
  const county = stringValue(properties.POOCounty, "county unavailable");
  const state = stringValue(properties.POOState).replace("US-", "");
  const acres = numberValue(properties.IncidentSize);
  const containment = numberValue(properties.PercentContained) ?? null;
  const started = formatUtcDate(properties.FireDiscoveryDateTime);
  const updated = formatUtcDate(properties.ModifiedOnDateTime_dt);
  const agency = stringValue(properties.POOProtectingAgency, "interagency feed");
  const sizeSummary = formatAcres(properties.IncidentSize);
  const containmentSummary = containment === null ? "containment not reported" : `${containment}% contained`;

  return {
    id: `nifc-${uniqueId}`,
    name,
    location: `${county}${state ? `, ${state}` : ""}`,
    distance: formatMiles(distance),
    started,
    updated: `Updated ${updated}`,
    confidence: "NIFC live incident",
    summary: `${agency} record. ${sizeSummary}; ${containmentSummary}.`,
    sources: [
      {
        label: "NIFC WFIGS",
        detail: "Current wildland fire incident point from the public interagency FeatureServer.",
        url: NIFC_LAYER_URL
      }
    ],
    sourceId: "nifc",
    latitude: coords.latitude,
    longitude: coords.longitude,
    acres,
    containment,
    lastUpdated: updated,
    feedUrl: NIFC_LAYER_URL
  };
}

async function loadNifcIncidents(location: LiveLocation, fetcher: FetchLike, now: Date): Promise<SourceResult> {
  const meta = { id: "nifc" as const, name: "NIFC WFIGS", url: NIFC_LAYER_URL };
  const payload = await readJson(fetcher, buildNifcUrl(location));
  const features = isRecord(payload) && Array.isArray(payload.features) ? payload.features : [];
  const incidents = features
    .filter(isRecord)
    .map((feature) => mapNifcIncident(feature, location))
    .filter((incident): incident is IncidentOption => incident !== null)
    .sort((a, b) => {
      const aDistance = Number.parseFloat(a.distance);
      const bDistance = Number.parseFloat(b.distance);
      return aDistance - bDistance;
    });

  return {
    incidents,
    signals: [],
    state: sourceState(
      meta,
      incidents.length > 0 ? "live" : "quiet",
      incidents.length > 0 ? `${incidents.length} current wildfire incident points near the search area.` : "No current WFIGS wildfire points inside the search box.",
      incidents.length,
      now
    )
  };
}

function buildNwsUrl(location: LiveLocation) {
  const params = new URLSearchParams({
    point: `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`
  });
  return `${NWS_ALERTS_BASE_URL}?${params.toString()}`;
}

function nwsSeverity(value: unknown): LiveSignalSeverity {
  const severity = stringValue(value).toLowerCase();
  if (severity.includes("extreme")) return "critical";
  if (severity.includes("severe") || severity.includes("moderate")) return "warning";
  return "watch";
}

function mapNwsSignal(feature: unknown, index: number): LiveSignal | null {
  if (!isRecord(feature) || !isRecord(feature.properties)) return null;
  const props = feature.properties;
  const event = stringValue(props.event, "Weather alert");
  const headline = stringValue(props.headline, stringValue(props.description, "Active NWS alert near the searched point."));
  const time = stringValue(props.effective, stringValue(props.onset, new Date().toISOString()));

  return {
    id: `nws-${index}-${event}`,
    source: "NWS",
    title: event,
    detail: headline,
    severity: nwsSeverity(props.severity),
    time,
    url: NWS_ALERTS_BASE_URL
  };
}

async function loadNwsAlerts(location: LiveLocation, fetcher: FetchLike, now: Date): Promise<SourceResult> {
  const meta = { id: "nws" as const, name: "NWS alerts", url: NWS_ALERTS_BASE_URL };
  const payload = await readJson(fetcher, buildNwsUrl(location), {
    headers: {
      Accept: "application/geo+json"
    }
  });
  const features = isRecord(payload) && Array.isArray(payload.features) ? payload.features : [];
  const signals = features.map(mapNwsSignal).filter((signal): signal is LiveSignal => signal !== null);

  return {
    incidents: [],
    signals,
    state: sourceState(
      meta,
      signals.length > 0 ? "live" : "quiet",
      signals.length > 0 ? `${signals.length} active watches, warnings, or advisories at the searched point.` : "No active NWS alert at the searched point.",
      signals.length,
      now
    )
  };
}

function buildEonetUrl(location: LiveLocation) {
  const bbox = boundingBoxAround(location, 180);
  const params = new URLSearchParams({
    category: "wildfires",
    status: "open",
    days: "60",
    limit: "50",
    bbox: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`
  });
  return `${EONET_EVENTS_URL}?${params.toString()}`;
}

function mapEonetIncident(event: unknown, location: LiveLocation): IncidentOption | null {
  if (!isRecord(event)) return null;
  const geometry = Array.isArray(event.geometry) && isRecord(event.geometry[0]) ? event.geometry[0] : null;
  if (!geometry || !Array.isArray(geometry.coordinates)) return null;

  const longitude = numberValue(geometry.coordinates[0]);
  const latitude = numberValue(geometry.coordinates[1]);
  if (latitude === undefined || longitude === undefined) return null;

  const id = stringValue(event.id, stringValue(event.title, "eonet-wildfire"));
  const title = stringValue(event.title, "Open wildfire event");
  const distance = haversineMiles(location, { latitude, longitude });
  const magnitude = numberValue(geometry.magnitudeValue);
  const unit = stringValue(geometry.magnitudeUnit, "acres");
  const date = stringValue(geometry.date, new Date().toISOString());
  const sourceUrl =
    Array.isArray(event.sources) && isRecord(event.sources[0]) ? stringValue(event.sources[0].url, EONET_EVENTS_URL) : EONET_EVENTS_URL;

  return {
    id: `eonet-${id}`,
    name: title,
    location: stringValue(event.description, "NASA EONET open wildfire event"),
    distance: formatMiles(distance),
    started: formatUtcDate(date),
    updated: "Open event",
    confidence: "NASA EONET live event",
    summary: magnitude === undefined ? "NASA open-event wildfire record." : `NASA open-event wildfire record; ${magnitude.toLocaleString("en-US")} ${unit}.`,
    sources: [
      {
        label: "NASA EONET",
        detail: "Open wildfire event from NASA Earth Observatory Natural Event Tracker.",
        url: sourceUrl
      }
    ],
    sourceId: "eonet",
    latitude,
    longitude,
    acres: unit.toLowerCase().includes("acre") ? magnitude : undefined,
    containment: null,
    lastUpdated: formatUtcDate(date),
    feedUrl: sourceUrl
  };
}

async function loadEonetWildfires(location: LiveLocation, fetcher: FetchLike, now: Date): Promise<SourceResult> {
  const meta = { id: "eonet" as const, name: "NASA EONET", url: EONET_EVENTS_URL };
  const payload = await readJson(fetcher, buildEonetUrl(location));
  const events = isRecord(payload) && Array.isArray(payload.events) ? payload.events : [];
  const incidents = events
    .map((event) => mapEonetIncident(event, location))
    .filter((incident): incident is IncidentOption => incident !== null)
    .sort((a, b) => Number.parseFloat(a.distance) - Number.parseFloat(b.distance));

  return {
    incidents,
    signals: incidents.map((incident) => ({
      id: `signal-${incident.id}`,
      source: "NASA EONET",
      title: incident.name,
      detail: incident.summary,
      severity: "watch" as const,
      time: incident.lastUpdated ?? incident.started,
      url: incident.feedUrl ?? EONET_EVENTS_URL,
      latitude: incident.latitude,
      longitude: incident.longitude
    })),
    state: sourceState(
      meta,
      incidents.length > 0 ? "live" : "quiet",
      incidents.length > 0 ? `${incidents.length} open wildfire events within the regional box.` : "No open NASA wildfire events in the regional box.",
      incidents.length,
      now
    )
  };
}

function buildFirmsUrl(location: LiveLocation, mapKey: string) {
  const bbox = boundingBoxAround(location, 60);
  const area = `${bbox.west.toFixed(4)},${bbox.south.toFixed(4)},${bbox.east.toFixed(4)},${bbox.north.toFixed(4)}`;
  return `${FIRMS_AREA_BASE_URL}/${encodeURIComponent(mapKey)}/VIIRS_SNPP_NRT/${area}/1`;
}

function parseCsv(text: string) {
  const [headerLine, ...rows] = text.trim().split(/\r?\n/);
  if (!headerLine || rows.length === 0) return [];
  const headers = headerLine.split(",").map((header) => header.trim());

  return rows.map((row) => {
    const values = row.split(",");
    return headers.reduce<Record<string, string>>((record, header, index) => {
      return { ...record, [header]: values[index]?.trim() ?? "" };
    }, {});
  });
}

function mapFirmsSignal(row: Record<string, string>, index: number): LiveSignal | null {
  const latitude = numberValue(row.latitude);
  const longitude = numberValue(row.longitude);
  if (latitude === undefined || longitude === undefined) return null;

  const time = `${row.acq_date ?? "date unavailable"} ${row.acq_time ?? ""}`.trim();
  const confidence = stringValue(row.confidence, "unknown confidence");

  return {
    id: `firms-${index}-${latitude}-${longitude}`,
    source: "NASA FIRMS",
    title: "Thermal detection",
    detail: `VIIRS thermal detection with ${confidence} confidence.`,
    severity: confidence.toLowerCase().startsWith("h") ? "watch" : "watch",
    time,
    url: "https://firms.modaps.eosdis.nasa.gov/api/",
    latitude,
    longitude
  };
}

async function loadFirmsDetections(location: LiveLocation, fetcher: FetchLike, now: Date, mapKey?: string): Promise<SourceResult> {
  const meta = { id: "firms" as const, name: "NASA FIRMS", url: "https://firms.modaps.eosdis.nasa.gov/api/" };

  if (!mapKey) {
    return {
      incidents: [],
      signals: [],
      state: sourceState(meta, "optional", "Thermal detections are available with a free MAP_KEY from NASA FIRMS.", 0, now)
    };
  }

  const text = await readText(fetcher, buildFirmsUrl(location, mapKey), { headers: { Accept: "text/csv" } });
  const signals = parseCsv(text).map(mapFirmsSignal).filter((signal): signal is LiveSignal => signal !== null);

  return {
    incidents: [],
    signals,
    state: sourceState(
      meta,
      signals.length > 0 ? "live" : "quiet",
      signals.length > 0 ? `${signals.length} VIIRS thermal detections in the last day.` : "No FIRMS thermal detections in the search box.",
      signals.length,
      now
    )
  };
}

async function safeSource(loader: () => Promise<SourceResult>, meta: SourceMeta, now: Date): Promise<SourceResult> {
  try {
    return await loader();
  } catch (error) {
    const status = error instanceof SourceFetchError ? error.status : 0;
    const sourceStatus: LiveSourceStatus = status === 429 || status >= 500 ? "limited" : "error";
    const detail =
      sourceStatus === "limited"
        ? "The public feed is rate-limited or temporarily unavailable; other sources remain usable."
        : error instanceof Error
          ? error.message
          : "The public feed could not be read.";

    return {
      incidents: [],
      signals: [],
      state: sourceState(meta, sourceStatus, detail, 0, now)
    };
  }
}

function uniqueIncidents(incidents: IncidentOption[]) {
  const seen = new Set<string>();

  return incidents.filter((incident) => {
    const key = `${incident.name.toLowerCase()}-${incident.latitude?.toFixed(2) ?? "na"}-${incident.longitude?.toFixed(2) ?? "na"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function loadLiveIncidentBundle(query: string, options: LiveSourceOptions = {}): Promise<LiveIncidentBundle> {
  const fetcher = options.fetcher ?? defaultFetch;
  const now = options.now ?? new Date();
  const baseCheckedAt = checkedAt(now);
  const geocoderMeta = { id: "nominatim" as const, name: "OpenStreetMap geocoding", url: NOMINATIM_SEARCH_URL };

  try {
    const location = await geocodeLocation(query, fetcher);
    const geocoderState = sourceState(geocoderMeta, "live", "Search text converted into latitude and longitude.", 1, now);
    const [nifc, nws, eonet, firms] = await Promise.all([
      safeSource(() => loadNifcIncidents(location, fetcher, now), { id: "nifc", name: "NIFC WFIGS", url: NIFC_LAYER_URL }, now),
      safeSource(() => loadNwsAlerts(location, fetcher, now), { id: "nws", name: "NWS alerts", url: NWS_ALERTS_BASE_URL }, now),
      safeSource(() => loadEonetWildfires(location, fetcher, now), { id: "eonet", name: "NASA EONET", url: EONET_EVENTS_URL }, now),
      safeSource(
        () => loadFirmsDetections(location, fetcher, now, options.firmsMapKey),
        { id: "firms", name: "NASA FIRMS", url: "https://firms.modaps.eosdis.nasa.gov/api/" },
        now
      )
    ]);
    const incidents = uniqueIncidents([...nifc.incidents, ...eonet.incidents])
      .sort((a, b) => Number.parseFloat(a.distance) - Number.parseFloat(b.distance))
      .slice(0, 8);

    return {
      location,
      incidents,
      signals: [...nws.signals, ...eonet.signals, ...firms.signals],
      sourceStates: [geocoderState, nifc.state, nws.state, eonet.state, firms.state],
      checkedAt: baseCheckedAt
    };
  } catch (error) {
    return {
      location: null,
      incidents: [],
      signals: [],
      sourceStates: [
        sourceState(
          geocoderMeta,
          "error",
          error instanceof Error ? error.message : "Location could not be geocoded.",
          0,
          now
        )
      ],
      checkedAt: baseCheckedAt
    };
  }
}
