import { createProductionGeocodeHandler } from "../api/_lib/geocodeRuntime";

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  GEOCODER_PROVIDER_URL?: string;
  NOMINATIM_USER_AGENT?: string;
}

const SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://tile.openstreetmap.org; connect-src 'self' https://services3.arcgis.com https://services.arcgis.com https://api.weather.gov https://eonet.gsfc.nasa.gov; font-src 'self'; media-src 'self'; manifest-src 'self'; worker-src 'self' blob:; upgrade-insecure-requests",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin"
} as const;

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function runtimeEnvironment(env: Env) {
  return {
    UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN,
    GEOCODER_PROVIDER_URL: env.GEOCODER_PROVIDER_URL,
    NOMINATIM_USER_AGENT: env.NOMINATIM_USER_AGENT
  };
}

export function normalizeCloudflareGeocodeRequest(request: Request): Request {
  const headers = new Headers(request.headers);
  const cloudflareClientAddress = headers.get("CF-Connecting-IP")?.trim();
  headers.delete("x-forwarded-for");
  headers.delete("x-real-ip");
  headers.delete("x-vercel-forwarded-for");
  if (cloudflareClientAddress && cloudflareClientAddress.length <= 45 && !/[,\s]/.test(cloudflareClientAddress)) {
    headers.set("x-vercel-forwarded-for", cloudflareClientAddress);
  }
  return new Request(request, { headers });
}

async function serveApp(request: Request, env: Env): Promise<Response> {
  const response = await env.ASSETS.fetch(request);
  if (response.status !== 404 || request.method !== "GET") return response;

  const accept = request.headers.get("Accept") ?? "";
  if (!accept.includes("text/html")) return response;
  return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const response = url.pathname === "/api/geocode"
      ? await createProductionGeocodeHandler({ env: runtimeEnvironment(env) })(normalizeCloudflareGeocodeRequest(request))
      : await serveApp(request, env);
    return withSecurityHeaders(response);
  }
};
