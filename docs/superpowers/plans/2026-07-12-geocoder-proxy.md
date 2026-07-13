# Afterlight Geocoder Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace direct browser-to-Nominatim geocoding with a same-origin, production-fail-closed proxy that validates coarse input, minimizes returned data, shares cache and provider pacing through Redis, and remains usable through one-command local development.

**Architecture:** The browser posts `{ query }` to `/api/geocode`. A framework-neutral Web `Request` handler enforces the HTTP/privacy contract and delegates to a geocode service. Production uses Upstash-compatible Redis REST for hashed cache keys and an atomic application-wide one-request-per-second provider slot; local Vite development injects a bounded memory store. The browser continues to contact NIFC, NWS, and EONET only after the proxy returns a sanitized coarse location.

**Tech Stack:** React 19, Vite 7, TypeScript, Vercel Web Handlers, `@upstash/redis`, Vitest, Playwright.

## Global Constraints

- Keep Live Source Monitor and Historical Replay isolated.
- Accept city, ZIP code, or neighborhood only; reject address-like or precise input before any upstream request.
- Use `POST /api/geocode`; never place the area query in an Afterlight API URL.
- Never log, hash-reversibly store, or return the raw query.
- Cache keys must be SHA-256 hashes of normalized queries; cached values contain only coarse label/latitude/longitude or a not-found sentinel.
- Production/preview deployments fail closed when shared Redis is missing. In-memory state is local-development-only.
- Enforce an atomic application-wide minimum of 1,000 ms between public Nominatim request starts.
- Identify Afterlight with a non-stock `User-Agent`; keep only the official Nominatim host, with any server-side URL override limited to that host and never accepted from the request.
- The configured provider must be HTTPS, credential-free, non-private, and explicitly host-allowlisted.
- Return `Cache-Control: no-store`; do not enable cross-origin browser access.
- No browser FIRMS key or request.
- No new public deployment or provider reliability claim without live verification.
- Do not commit or push this branch unless Rushil separately requests it.

---

### Task 1: Shared geocode contract and RED service tests

**Files:**
- Create: `src/shared/geocodeContract.ts`
- Create: `tests/geocodeProxy.test.ts`
- Modify: `tests/liveSources.test.ts`

**Interfaces:**
- Produces: `validateAreaQuery(query)`, `normalizeAreaQuery(query)`, `parseGeocodeProxyResponse(value)`, `GeocodeLocation`, and `GeocodeProxyResponse`.
- Produces wished-for service interface `createGeocodeHandler(dependencies): (request: Request) => Promise<Response>`.

- [x] **Step 1: Write failing contract and handler tests**

```ts
test("rejects address-like input before upstream access", async () => {
  const upstream = vi.fn();
  const response = await handler(request({ query: "123 Main, Pasadena" }), { upstream });
  expect(response.status).toBe(400);
  expect(upstream).not.toHaveBeenCalled();
});

test("returns a shared cache hit without contacting Nominatim", async () => {
  store.seed(cacheKey("Pasadena"), { kind: "location", location: coarseLocation });
  const response = await handler(request({ query: "Pasadena" }));
  expect(await response.json()).toMatchObject({ success: true, data: coarseLocation, meta: { cache: "hit" } });
  expect(upstream).not.toHaveBeenCalled();
});
```

- [x] **Step 2: Verify RED**

Run: `npx vitest run tests/geocodeProxy.test.ts tests/liveSources.test.ts`

Expected: failure because the contract, handler, and same-origin client request do not exist.

- [x] **Step 3: Implement the shared contract only**

```ts
export type GeocodeLocation = { label: string; latitude: number; longitude: number };
export type GeocodeProxyResponse =
  | { success: true; data: GeocodeLocation; meta: { cache: "hit" | "miss" } }
  | { success: false; error: { code: string; message: string } };

export function normalizeAreaQuery(query: string) {
  return query.trim().replace(/\s+/g, " ");
}
```

- [x] **Step 4: Keep client validation green**

Run: `npx vitest run tests/liveSources.test.ts`

Expected: all existing address, coordinate, and coarse-result tests pass against the shared validator.

---

### Task 2: Shared cache/pacing store and proxy service

**Files:**
- Create: `api/_lib/geocodeStore.ts`
- Create: `api/_lib/geocodeService.ts`
- Test: `tests/geocodeProxy.test.ts`

**Interfaces:**
- Produces `GeocodeStore.get(key)`, `GeocodeStore.set(key, value, ttlSeconds)`, and `GeocodeStore.reserveProviderSlot(minimumIntervalMs)`.
- Produces `MemoryGeocodeStore` for tests/local development and `RedisGeocodeStore` for production.
- Produces `createGeocodeHandler({ store, fetcher, provider, sleep, now })`.

- [x] **Step 1: Add RED tests for security and failure behavior**

Cover:

```ts
expect((await handler(new Request(url, { method: "GET" }))).status).toBe(405);
expect((await handler(postWithoutOrigin)).status).toBe(403);
expect((await handler(postWithWrongContentType)).status).toBe(415);
expect((await handler(postWithOversizedBody)).status).toBe(413);
expect((await handler(postWithMalformedJson)).status).toBe(400);
expect(upstreamRequest.headers.get("user-agent")).toContain("Afterlight/");
expect(upstreamRequest.url).toContain("q=Pasadena");
expect(response.headers.get("cache-control")).toBe("no-store");
```

Also cover cache miss/hit, normalized duplicate queries, not-found negative caching, precise provider-result rejection, provider 429/5xx redaction, queue timeout with `Retry-After`, and no raw query in store keys or error responses.

- [x] **Step 2: Verify RED**

Run: `npx vitest run tests/geocodeProxy.test.ts`

Expected: failures for missing store/service behavior.

- [x] **Step 3: Implement minimal store and service**

```ts
export interface GeocodeStore {
  get(key: string): Promise<GeocodeCacheEntry | null>;
  set(key: string, value: GeocodeCacheEntry, ttlSeconds: number): Promise<void>;
  reserveProviderSlot(minimumIntervalMs: number): Promise<{ allowed: boolean; retryAfterMs: number }>;
}
```

Use a Redis Lua script with Redis server time so all function instances share one slot:

```lua
local now = redis.call('TIME')
local now_ms = now[1] * 1000 + math.floor(now[2] / 1000)
local last = tonumber(redis.call('GET', KEYS[1]) or '0')
local interval = tonumber(ARGV[1])
if last > 0 and now_ms - last < interval then
  return {0, interval - (now_ms - last)}
end
redis.call('SET', KEYS[1], now_ms, 'PX', interval * 2)
return {1, 0}
```

- [x] **Step 4: Verify GREEN and refactor**

Run: `npx vitest run tests/geocodeProxy.test.ts`

Expected: all proxy contract, privacy, cache, provider, and pacing tests pass.

---

### Task 3: Vercel route, production configuration, and local Vite middleware

**Files:**
- Create: `api/_lib/geocodeRuntime.ts`
- Create: `api/_lib/viteGeocodeMiddleware.ts`
- Create: `api/geocode.ts`
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Test: `tests/geocodeProxy.test.ts`

**Interfaces:**
- Vercel exports `POST(request: Request)` and method-denying handlers from `api/geocode.ts`.
- Vite mounts the same handler at `/api/geocode` with `MemoryGeocodeStore` only during local development.
- Production runtime reads `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `GEOCODER_PROVIDER_URL`, and `NOMINATIM_USER_AGENT`; the provider host is pinned to official Nominatim.

- [x] **Step 1: Write RED runtime tests**

```ts
expect(() => createProductionRuntime({})).toThrow(/shared Redis/i);
expect(() => resolveProvider("http://127.0.0.1/search", "127.0.0.1")).toThrow();
expect(resolveProvider("https://nominatim.openstreetmap.org/search", "nominatim.openstreetmap.org").hostname)
  .toBe("nominatim.openstreetmap.org");
```

- [x] **Step 2: Install server-only dependencies**

Run: `npm install @upstash/redis && npm install -D @types/node`

- [x] **Step 3: Implement production-fail-closed runtime and route**

```ts
export async function POST(request: Request) {
  return productionHandler()(request);
}

export function GET() {
  return methodNotAllowed();
}
```

- [x] **Step 4: Mount the local handler in Vite**

```ts
export default defineConfig({
  plugins: [react(), afterlightGeocodeDevPlugin()],
  server: { host: "127.0.0.1", port: 5173 }
});
```

- [x] **Step 5: Verify route type/build behavior**

Run: `npm run build`

Expected: TypeScript checks client, API, and Vite middleware; Vite production build succeeds.

---

### Task 4: Browser migration and browser regression coverage

**Files:**
- Modify: `src/engine/liveSources.ts`
- Modify: `src/components/Hero.tsx`
- Modify: `tests/liveSources.test.ts`
- Modify: `tests/app.spec.ts`

**Interfaces:**
- `geocodeLocation(query, fetcher)` posts JSON to `/api/geocode` and parses only the shared success envelope.
- Browser code contains no `nominatim.openstreetmap.org/search` request.

- [x] **Step 1: Write RED client tests**

```ts
expect(requestedUrl).toBe("/api/geocode");
expect(init).toMatchObject({ method: "POST" });
expect(JSON.parse(String(init?.body))).toEqual({ query: "Pacific Palisades" });
expect(requestedUrls.some((url) => url.includes("nominatim.openstreetmap.org"))).toBe(false);
```

- [x] **Step 2: Verify RED**

Run: `npx vitest run tests/liveSources.test.ts`

Expected: failure because the browser still calls Nominatim directly.

- [x] **Step 3: Implement the same-origin client call and disclosure**

Update the location help to say the coarse area goes to Afterlight's same-origin proxy, which then contacts Nominatim; coordinates/bounds still go from the browser to NIFC, NWS, and EONET.

- [x] **Step 4: Update Playwright mocks**

Mock `**/api/geocode` with the complete proxy response envelope. Add an assertion that no browser request reaches `nominatim.openstreetmap.org`.

- [x] **Step 5: Verify GREEN**

Run: `npm test -- --run`

Expected: all unit tests pass with the new client boundary.

Run: `npm run test:e2e`

Expected: all desktop/mobile browser tests pass with no console/page errors.

---

### Task 5: Documentation, security review, and full release gate

**Files:**
- Modify: `README.md`
- Modify: `docs/RUNBOOK.md`
- Modify: `docs/CONTRIBUTING.md`
- Modify: `docs/judge-brief.md`
- Modify: `docs/moonshot-paper.md`
- Modify: `docs/vision-presentation.md`

**Interfaces:**
- Documents the deployment contract without claiming configured credentials or a public URL.

- [x] **Step 1: Update documentation**

Document:

- `/api/geocode` same-origin POST contract.
- Redis production requirement and local memory-only development mode.
- Exact environment variable names without real values.
- Nominatim absolute one-request-per-second application limit, identifying User-Agent, caching, attribution, privacy, redirect rejection, and fixed official-provider host.
- No raw query logging/storage; hashed cache keys and coarse cached values only.
- Production fails closed when Redis is missing.
- Redis-backed hashed-client request quotas and the provider-miss circuit breaker are application controls; cache hits do not consume provider capacity. A Vercel WAF rate-limit rule remains a required public-launch defense in addition to the provider slot.
- No public deployment claim until live verification.

- [x] **Step 2: Run security review**

Check attacker-controlled request body, Origin and Content-Type boundaries, SSRF/provider configuration, raw-query exposure, Redis secrets, cache-key privacy, cache poisoning, provider error leakage, queue exhaustion, function timeout, and production fallback behavior.

- [x] **Step 3: Run final verification**

```bash
npm test -- --run
npm run build
npm run test:e2e
npm audit --audit-level=high
git diff --check
rg -n "nominatim.openstreetmap.org/search" src tests/app.spec.ts
rg -n "UPSTASH_REDIS_REST_TOKEN=.+|NVIDIA_API_KEY=.+|VITE_FIRMS" . --glob '!node_modules/**' --glob '!package-lock.json'
```

Expected: tests/build/browser/audit/diff all green; the browser-source scan finds no direct Nominatim request; secret scan finds placeholders or documentation names only, never values.

- [x] **Step 4: Update the existing CSB Afterlight project note**

Capture the branch, implementation boundary, environment requirements, verification evidence, and remaining external setup without storing secrets.
