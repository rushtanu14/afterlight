import {
  AREA_QUERY_MESSAGE,
  normalizeAreaQuery,
  parseGeocodeProxyResponse,
  validateAreaQuery,
  type AreaQueryValidation,
  type GeocodeLocation
} from "../shared/geocodeContract";

export { validateAreaQuery } from "../shared/geocodeContract";
export type { AreaQueryValidation } from "../shared/geocodeContract";

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type LiveSourceId = "nominatim" | "nifc" | "nws" | "eonet" | "firms";
export type LiveSourceStatus = "live" | "quiet" | "limited" | "error" | "optional";
export type LiveSignalSeverity = "watch" | "warning" | "critical";

export type LiveIncident = {
  id: string;
  name: string;
  location: string;
  distance: string;
  started: string;
  updated: string;
  confidence: string;
  summary: string;
  sources: Array<{ label: string; detail: string; url: string }>;
  sourceId: "nifc" | "eonet";
  latitude: number;
  longitude: number;
  acres?: number;
  containment: number | null;
  lastUpdated: string;
  feedUrl: string;
};

export type LiveLocation = GeocodeLocation;

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
  incidents: LiveIncident[];
  signals: LiveSignal[];
  sourceStates: LiveSourceState[];
  checkedAt: string;
};

export type LiveSourceOptions = {
  fetcher?: FetchLike;
  now?: Date;
};

type SourceResult = {
  incidents: LiveIncident[];
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
const GEOCODE_PROXY_URL = "/api/geocode";
const EONET_EVENTS_URL = "https://eonet.gsfc.nasa.gov/api/v3/events";
const FIRMS_PROXY_ONLY_URL = "server-proxy-only:nasa-firms";
const OFFICIAL_SOURCE_HOSTS = new Set([
  "earthobservatory.nasa.gov",
  "eonet.gsfc.nasa.gov",
  "gdacs.org",
  "inciweb.wildfire.gov",
  "irwin.doi.gov",
  "www.gdacs.org"
]);
class SourceFetchError extends Error {
  readonly sourceId: LiveSourceId;
  readonly status: number;

  constructor(sourceId: LiveSourceId, status: number) {
    super(`${sourceId} request failed.`);
    this.sourceId = sourceId;
    this.status = status;
  }
}

function safeGeocoderError(error: unknown) {
  if (error instanceof SourceFetchError) {
    return error.status === 429 || error.status >= 500
      ? "Location lookup is rate-limited or temporarily unavailable."
      : "Location lookup could not be completed.";
  }

  if (
    error instanceof Error &&
    [AREA_QUERY_MESSAGE, "No coarse area match was found. Try a city, ZIP code, or neighborhood."].includes(error.message)
  ) {
    return error.message;
  }

  return "Location lookup could not be completed.";
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

function requireArrayField(payload: unknown, field: string) {
  if (!isRecord(payload) || "error" in payload || !Array.isArray(payload[field])) {
    throw new Error("The public source returned an invalid payload.");
  }

  return payload[field];
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function allowlistedOfficialUrl(value: unknown) {
  const candidate = stringValue(value);
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || url.username || url.password || !OFFICIAL_SOURCE_HOSTS.has(url.hostname.toLowerCase())) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return undefined;
    const parsed = Number(normalized);
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

async function consumeWithTimeout<T>(
  fetcher: FetchLike,
  url: string,
  init: RequestInit,
  consume: (response: Response) => Promise<T>,
  timeoutMs = 9000
) {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...init.headers
      }
    });
    return await consume(response);
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function readJson(fetcher: FetchLike, sourceId: LiveSourceId, url: string, init?: RequestInit) {
  return consumeWithTimeout(fetcher, url, init ?? {}, async (response) => {
    if (!response.ok) throw new SourceFetchError(sourceId, response.status);
    return await response.json() as unknown;
  });
}

export async function geocodeLocation(query: string, fetcher: FetchLike = defaultFetch): Promise<LiveLocation> {
  const validation = validateAreaQuery(query);
  if (validation.ok === false) throw new Error(validation.message);
  const { response, payload } = await consumeWithTimeout(fetcher, GEOCODE_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: normalizeAreaQuery(validation.query) })
  }, async (response) => ({
    response,
    payload: parseGeocodeProxyResponse(await response.json() as unknown)
  }));

  if (!response.ok || !payload?.success) {
    if (payload && !payload.success && [AREA_QUERY_MESSAGE, "No coarse area match was found. Try a city, ZIP code, or neighborhood."].includes(payload.error.message)) {
      throw new Error(payload.error.message);
    }
    throw new SourceFetchError("nominatim", response.status);
  }

  return { ...payload.data };
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
  return latitude !== undefined && longitude !== undefined && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    ? { latitude, longitude }
    : null;
}

function mapNifcIncident(feature: Record<string, unknown>, location: LiveLocation): LiveIncident | null {
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
  const payload = await readJson(fetcher, "nifc", buildNifcUrl(location));
  const features = requireArrayField(payload, "features");
  const incidents = features
    .filter(isRecord)
    .map((feature) => mapNifcIncident(feature, location))
    .filter((incident): incident is LiveIncident => incident !== null)
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
  const time = stringValue(props.effective, stringValue(props.onset));

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
  const payload = await readJson(fetcher, "nws", buildNwsUrl(location), {
    headers: {
      Accept: "application/geo+json"
    }
  });
  const features = requireArrayField(payload, "features");
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
    bbox: `${bbox.west},${bbox.north},${bbox.east},${bbox.south}`
  });
  return `${EONET_EVENTS_URL}?${params.toString()}`;
}

function mapEonetIncident(event: unknown, location: LiveLocation): LiveIncident | null {
  if (!isRecord(event)) return null;
  const geometries = Array.isArray(event.geometry)
    ? event.geometry
        .filter(isRecord)
        .filter((geometry) => {
          if (!Array.isArray(geometry.coordinates) || !dateValue(geometry.date)) return false;
          const longitude = numberValue(geometry.coordinates[0]);
          const latitude = numberValue(geometry.coordinates[1]);
          return latitude !== undefined && longitude !== undefined && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
        })
        .sort((a, b) => (dateValue(b.date)?.getTime() ?? 0) - (dateValue(a.date)?.getTime() ?? 0))
    : [];
  const geometry = geometries[0];
  if (!geometry || !Array.isArray(geometry.coordinates)) return null;

  const longitude = numberValue(geometry.coordinates[0]);
  const latitude = numberValue(geometry.coordinates[1]);
  if (latitude === undefined || longitude === undefined) return null;

  const id = stringValue(event.id, stringValue(event.title, "eonet-wildfire"));
  const title = stringValue(event.title, "Open wildfire event");
  const distance = haversineMiles(location, { latitude, longitude });
  const magnitude = numberValue(geometry.magnitudeValue);
  const unit = stringValue(geometry.magnitudeUnit, "acres");
  const date = stringValue(geometry.date);
  const sourceUrl = Array.isArray(event.sources)
    ? event.sources
        .filter(isRecord)
        .map((source) => allowlistedOfficialUrl(source.url))
        .find((url): url is string => url !== null) ?? EONET_EVENTS_URL
    : EONET_EVENTS_URL;

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
  const payload = await readJson(fetcher, "eonet", buildEonetUrl(location));
  const events = requireArrayField(payload, "events");
  const incidents = events
    .map((event) => mapEonetIncident(event, location))
    .filter((incident): incident is LiveIncident => incident !== null)
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

async function safeSource(loader: () => Promise<SourceResult>, meta: SourceMeta, now: Date): Promise<SourceResult> {
  try {
    return await loader();
  } catch (error) {
    const status = error instanceof SourceFetchError ? error.status : 0;
    const sourceStatus: LiveSourceStatus = status === 429 || status >= 500 ? "limited" : "error";
    const detail =
      sourceStatus === "limited"
        ? "The public feed is rate-limited or temporarily unavailable; other sources remain usable."
        : `${meta.name} could not be read.`;

    return {
      incidents: [],
      signals: [],
      state: sourceState(meta, sourceStatus, detail, 0, now)
    };
  }
}

function uniqueIncidents(incidents: LiveIncident[]) {
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
  const geocoderMeta = { id: "nominatim" as const, name: "Afterlight geocoding proxy", url: GEOCODE_PROXY_URL };
  const validation = validateAreaQuery(query);

  if (validation.ok === false) {
    return {
      location: null,
      incidents: [],
      signals: [],
      sourceStates: [sourceState(geocoderMeta, "error", validation.message, 0, now)],
      checkedAt: baseCheckedAt
    };
  }

  try {
    const location = await geocodeLocation(validation.query, fetcher);
    const geocoderState = sourceState(geocoderMeta, "live", "The same-origin proxy returned one coarse-area match.", 1, now);
    const [nifc, nws, eonet] = await Promise.all([
      safeSource(() => loadNifcIncidents(location, fetcher, now), { id: "nifc", name: "NIFC WFIGS", url: NIFC_LAYER_URL }, now),
      safeSource(() => loadNwsAlerts(location, fetcher, now), { id: "nws", name: "NWS alerts", url: NWS_ALERTS_BASE_URL }, now),
      safeSource(() => loadEonetWildfires(location, fetcher, now), { id: "eonet", name: "NASA EONET", url: EONET_EVENTS_URL }, now)
    ]);
    const firmsState = sourceState(
      { id: "firms", name: "NASA FIRMS", url: FIRMS_PROXY_ONLY_URL },
      "optional",
      "NASA FIRMS requires a server proxy; no browser key or request is used.",
      0,
      now
    );
    const incidents = uniqueIncidents([...nifc.incidents, ...eonet.incidents])
      .sort((a, b) => Number.parseFloat(a.distance) - Number.parseFloat(b.distance))
      .slice(0, 8);

    return {
      location,
      incidents,
      signals: [...nws.signals, ...eonet.signals],
      sourceStates: [geocoderState, nifc.state, nws.state, eonet.state, firmsState],
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
          safeGeocoderError(error),
          0,
          now
        )
      ],
      checkedAt: baseCheckedAt
    };
  }
}
