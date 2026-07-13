import { isIP } from "node:net";
import { Redis } from "@upstash/redis";
import { createGeocodeHandler, type GeocodeHandlerDependencies } from "./geocodeService";
import { MemoryGeocodeStore, RedisGeocodeStore, type GeocodeStore } from "./geocodeStore";

type RuntimeEnvironment = Record<string, string | undefined>;
type RuntimeOptions = {
  env?: RuntimeEnvironment;
  fetcher?: GeocodeHandlerDependencies["fetcher"];
};

const DEFAULT_PROVIDER_URL = "https://nominatim.openstreetmap.org/search";
const DEFAULT_USER_AGENT = "Afterlight/0.1 (+https://github.com/rushtanu14/afterlight)";

function canonicalHostname(hostname: string) {
  const withoutTrailingDot = hostname.trim().toLowerCase().replace(/\.+$/, "");
  return withoutTrailingDot.startsWith("[") && withoutTrailingDot.endsWith("]")
    ? withoutTrailingDot.slice(1, -1)
    : withoutTrailingDot;
}

function isUnsafeHostname(hostname: string) {
  const canonical = canonicalHostname(hostname);
  return canonical === "localhost"
    || canonical.endsWith(".localhost")
    || canonical.endsWith(".local")
    || canonical.endsWith(".internal")
    || canonical.endsWith(".home.arpa")
    || isIP(canonical) !== 0;
}

function unavailableResponse() {
  return new Response(JSON.stringify({
    success: false,
    error: { code: "proxy_unavailable", message: "Location proxy is temporarily unavailable." }
  }), {
    status: 503,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export function resolveProviderConfig(env: RuntimeEnvironment) {
  const candidate = env.GEOCODER_PROVIDER_URL || DEFAULT_PROVIDER_URL;
  const url = new URL(candidate);
  const hostname = canonicalHostname(url.hostname);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname ||
    url.pathname === "/" ||
    isUnsafeHostname(hostname) ||
    hostname !== "nominatim.openstreetmap.org"
  ) {
    throw new Error("Unsafe geocoder provider configuration.");
  }

  const userAgent = (env.NOMINATIM_USER_AGENT || DEFAULT_USER_AGENT).trim();
  if (userAgent.length < 12 || /[\r\n]/.test(userAgent) || /^(node|undici|curl|mozilla)\b/i.test(userAgent)) {
    throw new Error("Geocoder User-Agent must identify Afterlight.");
  }

  return { url: url.toString(), userAgent };
}

export function resolveRedisConfig(env: RuntimeEnvironment) {
  const candidate = env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!candidate || !token || /[\r\n]/.test(token)) throw new Error("Shared Redis is required for deployed geocoding.");

  const url = new URL(candidate);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    isUnsafeHostname(url.hostname)
  ) {
    throw new Error("Unsafe shared Redis configuration.");
  }
  return { url: url.toString(), token };
}

function createRedisStore(env: RuntimeEnvironment): GeocodeStore {
  const { url, token } = resolveRedisConfig(env);
  return new RedisGeocodeStore(new Redis({ url, token }));
}

function runtimeHandler(store: GeocodeStore, env: RuntimeEnvironment, fetcher: GeocodeHandlerDependencies["fetcher"]) {
  return createGeocodeHandler({
    store,
    fetcher,
    provider: resolveProviderConfig(env)
  });
}

export function createProductionGeocodeHandler(options: RuntimeOptions = {}) {
  const env = options.env ?? process.env;
  const fetcher = options.fetcher ?? fetch;
  try {
    return runtimeHandler(createRedisStore(env), env, fetcher);
  } catch {
    return async () => unavailableResponse();
  }
}

export function createLocalGeocodeHandler(options: RuntimeOptions = {}) {
  const env = options.env ?? process.env;
  const fetcher = options.fetcher ?? fetch;
  return runtimeHandler(new MemoryGeocodeStore(), env, fetcher);
}
