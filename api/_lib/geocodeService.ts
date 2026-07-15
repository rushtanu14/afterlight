import { createHash } from "node:crypto";
import { AREA_QUERY_MESSAGE, normalizeAreaQuery, validateAreaQuery, type GeocodeLocation, type GeocodeProxyResponse } from "../../src/shared/geocodeContract";
import type { GeocodeCacheEntry, GeocodeStore } from "./geocodeStore";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

type GeocodeProvider = {
  url: string;
  userAgent: string;
};

export type GeocodeHandlerDependencies = {
  store: GeocodeStore;
  fetcher: FetchLike;
  provider: GeocodeProvider;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
  queueLimitMs?: number;
  totalDeadlineMs?: number;
};

export const GEOCODE_MAX_BODY_BYTES = 1_024;
const MINIMUM_PROVIDER_INTERVAL_MS = 1_000;
const POSITIVE_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;
const NEGATIVE_CACHE_TTL_SECONDS = 5 * 60;
const DEFAULT_QUEUE_LIMIT_MS = 3_000;
const DEFAULT_TOTAL_DEADLINE_MS = 8_500;
const CLIENT_REQUEST_LIMIT = 20;
const CLIENT_WINDOW_SECONDS = 60;
const PROVIDER_REQUEST_LIMIT = 2_000;
const PROVIDER_WINDOW_SECONDS = 24 * 60 * 60;
const COARSE_NOMINATIM_TYPES = new Set([
  "administrative",
  "borough",
  "city",
  "city_district",
  "county",
  "municipality",
  "neighbourhood",
  "postcode",
  "state",
  "suburb",
  "town",
  "village"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function responseHeaders(extra: HeadersInit = {}) {
  return new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    ...Object.fromEntries(new Headers(extra))
  });
}

function json(body: GeocodeProxyResponse, status: number, extraHeaders?: HeadersInit) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(extraHeaders) });
}

function failure(status: number, code: string, message: string, extraHeaders?: HeadersInit) {
  return json({ success: false, error: { code, message } }, status, extraHeaders);
}

function cacheKey(query: string) {
  const digest = createHash("sha256").update(query.toLocaleLowerCase("en-US")).digest("hex");
  return `afterlight:geocode:v1:${digest}`;
}

function clientQuotaKey(request: Request) {
  const forwarded = request.headers.get("x-vercel-forwarded-for")
    ?? request.headers.get("x-forwarded-for")
    ?? request.headers.get("x-real-ip")
    ?? "unidentified-client";
  const clientIdentifier = forwarded.split(",", 1)[0]?.trim().toLowerCase().slice(0, 256) || "unidentified-client";
  return createHash("sha256").update(clientIdentifier).digest("hex");
}

function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  return origin === new URL(request.url).origin;
}

function coarseLocation(value: unknown): GeocodeLocation | null {
  if (!isRecord(value)) return null;
  const address = isRecord(value.address) ? value.address : {};
  const addressType = stringValue(value.addresstype).toLowerCase();
  const type = stringValue(value.type).toLowerCase();
  const hasPreciseAddress = ["house_number", "road", "building", "amenity"].some((field) => stringValue(address[field]));
  if (hasPreciseAddress || (!COARSE_NOMINATIM_TYPES.has(addressType) && !COARSE_NOMINATIM_TYPES.has(type))) return null;

  const latitude = numberValue(value.lat);
  const longitude = numberValue(value.lon);
  if (latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

  const fields = addressType === "postcode"
    ? ["postcode", "city", "town", "village", "state"]
    : ["neighbourhood", "suburb", "city_district", "city", "town", "village", "municipality", "county", "state"];
  const parts = fields.map((field) => stringValue(address[field])).filter((part, index, values) => part && values.indexOf(part) === index);
  const label = parts.slice(0, 3).join(", ");
  if (!label) return null;
  return { label, latitude, longitude };
}

function cacheResponse(entry: GeocodeCacheEntry, cache: "hit" | "miss") {
  return entry.kind === "location"
    ? json({ success: true, data: { ...entry.location }, meta: { cache } }, 200)
    : failure(404, "not_found", "No coarse area match was found. Try a city, ZIP code, or neighborhood.");
}

async function readBoundedBody(request: Request): Promise<{ ok: true; body: string } | { ok: false; error: "too_large" }> {
  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > GEOCODE_MAX_BODY_BYTES) return { ok: false, error: "too_large" };
  if (!request.body) return { ok: true, body: "" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > GEOCODE_MAX_BODY_BYTES) {
      try {
        await reader.cancel();
      } catch {
        // The request is already rejected; cancellation is only best-effort cleanup.
      }
      return { ok: false, error: "too_large" };
    }
    chunks.push(value);
  }
  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, body: new TextDecoder().decode(body) };
}

async function readRequestQuery(request: Request): Promise<{ query: string } | { error: "too_large" | "invalid" }> {
  const boundedBody = await readBoundedBody(request);
  if (!boundedBody.ok) return { error: boundedBody.error };
  try {
    const payload = JSON.parse(boundedBody.body) as unknown;
    if (!isRecord(payload) || typeof payload.query !== "string" || Object.keys(payload).some((key) => key !== "query")) {
      return { error: "invalid" as const };
    }
    return { query: payload.query };
  } catch {
    return { error: "invalid" as const };
  }
}

class DeadlineExceededError extends Error {}

async function beforeDeadline<T>(operation: Promise<T>, deadlineAt: number, now: () => number): Promise<T> {
  const remainingMs = deadlineAt - now();
  if (remainingMs <= 0) throw new DeadlineExceededError("Geocoder deadline exceeded.");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new DeadlineExceededError("Geocoder deadline exceeded.")), remainingMs);
      })
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function waitForProviderSlot(
  store: GeocodeStore,
  key: string,
  now: () => number,
  sleep: (milliseconds: number) => Promise<void>,
  deadlineAt: number
) {
  while (true) {
    const cached = await beforeDeadline(store.get(key), deadlineAt, now);
    if (cached) return { cached };
    const access = await beforeDeadline(
      store.reserveProviderAccess(PROVIDER_REQUEST_LIMIT, PROVIDER_WINDOW_SECONDS, MINIMUM_PROVIDER_INTERVAL_MS),
      deadlineAt,
      now
    );
    if (access.allowed) return { cached: null };
    if (access.reason === "quota") return { providerQuotaRetryAfterMs: access.retryAfterMs };
    if (now() + access.retryAfterMs >= deadlineAt) return null;
    await beforeDeadline(sleep(access.retryAfterMs), deadlineAt, now);
  }
}

export function createGeocodeHandler(dependencies: GeocodeHandlerDependencies) {
  const sleep = dependencies.sleep ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const now = dependencies.now ?? Date.now;
  const queueLimitMs = dependencies.queueLimitMs ?? DEFAULT_QUEUE_LIMIT_MS;
  const totalDeadlineMs = dependencies.totalDeadlineMs ?? DEFAULT_TOTAL_DEADLINE_MS;

  return async (request: Request) => {
    const deadlineAt = now() + totalDeadlineMs;
    if (request.method !== "POST") return failure(405, "method_not_allowed", "Use POST for location lookup.", { Allow: "POST" });
    if (!isAllowedOrigin(request)) return failure(403, "origin_not_allowed", "This endpoint accepts same-origin requests only.");
    if (request.headers.get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
      return failure(415, "unsupported_media_type", "Use application/json.");
    }

    let requestBody: Awaited<ReturnType<typeof readRequestQuery>>;
    try {
      requestBody = await beforeDeadline(readRequestQuery(request), deadlineAt, now);
    } catch (error) {
      return error instanceof DeadlineExceededError
        ? failure(503, "proxy_timeout", "Location lookup timed out. Try again shortly.")
        : failure(400, "invalid_request", "Send a JSON object containing only a query string.");
    }
    if ("error" in requestBody) {
      return requestBody.error === "too_large"
        ? failure(413, "request_too_large", "Location request is too large.")
        : failure(400, "invalid_request", "Send a JSON object containing only a query string.");
    }

    const validation = validateAreaQuery(requestBody.query);
    if (!validation.ok) return failure(400, "invalid_query", AREA_QUERY_MESSAGE);
    const query = normalizeAreaQuery(validation.query);
    const key = cacheKey(query);
    try {
      const clientQuota = await beforeDeadline(
        dependencies.store.reserveClientQuota(
          clientQuotaKey(request),
          CLIENT_REQUEST_LIMIT,
          CLIENT_WINDOW_SECONDS
        ),
        deadlineAt,
        now
      );
      if (!clientQuota.allowed) {
        return failure(429, "rate_limited", "Too many location lookups from this client. Try again shortly.", {
          "Retry-After": String(clientQuota.retryAfterSeconds)
        });
      }
      const cached = await beforeDeadline(dependencies.store.get(key), deadlineAt, now);
      if (cached) return cacheResponse(cached, "hit");

      const slot = await waitForProviderSlot(dependencies.store, key, now, sleep, Math.min(deadlineAt, now() + queueLimitMs));
      if (slot?.providerQuotaRetryAfterMs !== undefined) {
        return failure(429, "rate_limited", "Location lookup capacity is temporarily exhausted. Try again later.", {
          "Retry-After": String(Math.max(1, Math.ceil(slot.providerQuotaRetryAfterMs / 1_000)))
        });
      }
      if (!slot) return failure(429, "proxy_busy", "Location lookup is busy. Try again shortly.", { "Retry-After": "1" });
      if (slot.cached) return cacheResponse(slot.cached, "hit");
    } catch {
      return failure(503, "proxy_unavailable", "Location proxy is temporarily unavailable.");
    }

    try {
      const remainingMs = deadlineAt - now();
      if (remainingMs <= 0) return failure(503, "proxy_timeout", "Location lookup timed out. Try again shortly.");
      const providerUrl = new URL(dependencies.provider.url);
      providerUrl.search = new URLSearchParams({ q: query, format: "jsonv2", limit: "5", addressdetails: "1" }).toString();
      const providerResponse = await beforeDeadline(
        dependencies.fetcher(providerUrl, {
          headers: {
            Accept: "application/json",
            "Accept-Language": "en-US",
            "User-Agent": dependencies.provider.userAgent
          },
          redirect: "error",
          signal: AbortSignal.timeout(Math.max(1, Math.min(8_000, remainingMs)))
        }),
        deadlineAt,
        now
      );
      if (!providerResponse.ok) return failure(502, "provider_unavailable", "Location provider is temporarily unavailable.");
      const payload = await beforeDeadline(providerResponse.json(), deadlineAt, now) as unknown;
      const location = Array.isArray(payload) ? payload.map(coarseLocation).find((candidate) => candidate !== null) : null;
      if (!location) {
        try {
          await beforeDeadline(
            dependencies.store.set(key, { kind: "not_found" }, NEGATIVE_CACHE_TTL_SECONDS),
            deadlineAt,
            now
          );
        } catch {
          return failure(503, "proxy_unavailable", "Location proxy is temporarily unavailable.");
        }
        return cacheResponse({ kind: "not_found" }, "miss");
      }

      const entry: GeocodeCacheEntry = { kind: "location", location };
      try {
        await beforeDeadline(dependencies.store.set(key, entry, POSITIVE_CACHE_TTL_SECONDS), deadlineAt, now);
      } catch {
        return failure(503, "proxy_unavailable", "Location proxy is temporarily unavailable.");
      }
      return cacheResponse(entry, "miss");
    } catch {
      return failure(502, "provider_unavailable", "Location provider is temporarily unavailable.");
    }
  };
}
