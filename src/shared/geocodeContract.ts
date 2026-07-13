export type GeocodeLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

export type AreaQueryValidation = { ok: true; query: string } | { ok: false; message: string };

export type GeocodeProxyResponse =
  | { success: true; data: GeocodeLocation; meta: { cache: "hit" | "miss" } }
  | { success: false; error: { code: string; message: string } };

export const AREA_QUERY_MESSAGE = "Enter a city, ZIP code, or neighborhood, not a street address.";

const STREET_DESIGNATOR =
  "street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|way|place|pl|highway|hwy|trail|trl|terrace|ter|circle|cir|loop|rue|calle|camino|via|strada|straße|strasse|chemin|route|rua|avenida";
const COORDINATE_PAIR_PATTERN = /^[+-]?\d{1,2}(?:\.\d+)?\s*,\s*[+-]?\d{1,3}(?:\.\d+)?$/;
const STREET_NAME_PATTERN = new RegExp(
  `\\b[\\p{L}\\d][\\p{L}\\d.'-]*(?:\\s+[\\p{L}\\d][\\p{L}\\d.'-]*){0,4}\\s+(?:${STREET_DESIGNATOR})\\.?\\b`,
  "iu"
);
const ZIP_QUERY_PATTERN = /^\d{5}(?:-\d{4})?$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeAreaQuery(query: string) {
  return query.normalize("NFKC").trim().replace(/\s+/g, " ");
}

export function validateAreaQuery(query: string): AreaQueryValidation {
  const normalized = normalizeAreaQuery(query);
  const hasControlCharacters = /[\u0000-\u001f\u007f]/.test(normalized);
  const hasUnitDesignator = /\b(?:apartment|apt|suite|unit)\s*[#-]?\s*\w+/i.test(normalized);
  const isStandaloneZip = ZIP_QUERY_PATTERN.test(normalized);
  const hasNumberOutsideStandaloneZip = /\p{N}/u.test(normalized) && !isStandaloneZip;

  if (
    normalized.length < 2 ||
    normalized.length > 100 ||
    hasControlCharacters ||
    hasUnitDesignator ||
    hasNumberOutsideStandaloneZip ||
    STREET_NAME_PATTERN.test(normalized) ||
    COORDINATE_PAIR_PATTERN.test(normalized)
  ) {
    return { ok: false, message: AREA_QUERY_MESSAGE };
  }

  return { ok: true, query: normalized };
}

export function parseGeocodeProxyResponse(value: unknown): GeocodeProxyResponse | null {
  if (!isRecord(value) || typeof value.success !== "boolean") return null;

  if (value.success) {
    if (!isRecord(value.data) || !isRecord(value.meta)) return null;
    const label = typeof value.data.label === "string" ? value.data.label.trim() : "";
    const latitude = value.data.latitude;
    const longitude = value.data.longitude;
    const cache = value.meta.cache;
    if (
      !label ||
      typeof latitude !== "number" ||
      !Number.isFinite(latitude) ||
      Math.abs(latitude) > 90 ||
      typeof longitude !== "number" ||
      !Number.isFinite(longitude) ||
      Math.abs(longitude) > 180 ||
      (cache !== "hit" && cache !== "miss")
    ) {
      return null;
    }

    return { success: true, data: { label, latitude, longitude }, meta: { cache } };
  }

  if (!isRecord(value.error) || typeof value.error.code !== "string" || typeof value.error.message !== "string") return null;
  return { success: false, error: { code: value.error.code, message: value.error.message } };
}
