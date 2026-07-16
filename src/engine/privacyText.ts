const STREET_DESIGNATOR =
  "street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|way|place|pl|highway|hwy|trail|trl|terrace|ter|circle|cir|loop|rue|calle|camino|via|strada|straße|strasse|chemin|route|rua|avenida";

const STREET_ADDRESS_PATTERN = new RegExp(
  `\\b\\d{1,6}\\s+[\\p{L}\\d][\\p{L}\\d.'-]*(?:\\s+[\\p{L}\\d][\\p{L}\\d.'-]*){0,5}\\s+(?:${STREET_DESIGNATOR})\\.?\\b`,
  "iu"
);
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_PATTERN = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/;
const INTERNATIONAL_PHONE_PATTERN = /\+\d(?:[\s().-]*\d){7,14}\b/;
const LOCAL_PHONE_PATTERN = /\b\d{3}[\s.-]\d{4}\b/;
const COORDINATE_PAIR_PATTERN = /([+-]?\d{1,2}(?:\.\d+)?)\s*,\s*([+-]?\d{1,3}(?:\.\d+)?)/g;
const ACCESS_CODE_PATTERN = /\b(?:(?:access|door|gate|lock)\s+code|passcode|password)\s*[:#-]?\s*[A-Z0-9-]{3,}\b/i;
const PIN_PATTERN = /\bpin\s*[:#-]?\s*(?=[A-Z0-9-]*\d)[A-Z0-9-]{3,}\b/i;

export function normalizeSingleLineText(value: string, maxLength: number) {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").slice(0, maxLength);
}

function containsCoordinatePair(value: string) {
  for (const match of value.matchAll(COORDINATE_PAIR_PATTERN)) {
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue;
    const numericText = match[0];
    const precedingText = value.slice(Math.max(0, (match.index ?? 0) - 24), match.index ?? 0);
    const isCoordinateLike = /[+-]/.test(numericText) || /\b(?:coordinates?|coords?|lat(?:itude)?|long(?:itude)?|location)\s*[:=]?\s*$/i.test(precedingText);
    if (isCoordinateLike) return true;
  }
  return false;
}

export function containsPrivateHouseholdDetail(value: string) {
  return (
    STREET_ADDRESS_PATTERN.test(value) ||
    EMAIL_PATTERN.test(value) ||
    PHONE_PATTERN.test(value) ||
    INTERNATIONAL_PHONE_PATTERN.test(value) ||
    LOCAL_PHONE_PATTERN.test(value) ||
    containsCoordinatePair(value) ||
    ACCESS_CODE_PATTERN.test(value) ||
    PIN_PATTERN.test(value)
  );
}

export function sanitizeHouseholdText(value: string, maxLength: number, options: { trim?: boolean } = {}) {
  const normalized = normalizeSingleLineText(value, maxLength);
  const sanitized = options.trim === false ? normalized : normalized.trim();
  return containsPrivateHouseholdDetail(sanitized) ? "" : sanitized;
}
