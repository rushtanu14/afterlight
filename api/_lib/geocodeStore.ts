export type GeocodeCacheEntry =
  | { kind: "location"; location: { label: string; latitude: number; longitude: number } }
  | { kind: "not_found" };

export type ProviderSlot = { allowed: boolean; retryAfterMs: number };
export type QuotaReservation = {
  allowed: boolean;
  retryAfterSeconds: number;
};
export type ProviderAccessReservation =
  | { allowed: true; retryAfterMs: 0; reason: "allowed" }
  | { allowed: false; retryAfterMs: number; reason: "quota" | "slot" };

export interface GeocodeStore {
  get(key: string): Promise<GeocodeCacheEntry | null>;
  set(key: string, value: GeocodeCacheEntry, ttlSeconds: number): Promise<void>;
  reserveClientQuota(
    clientKey: string,
    clientLimit: number,
    clientWindowSeconds: number
  ): Promise<QuotaReservation>;
  reserveProviderQuota(limit: number, windowSeconds: number): Promise<QuotaReservation>;
  reserveProviderSlot(minimumIntervalMs: number): Promise<ProviderSlot>;
  reserveProviderAccess(
    limit: number,
    windowSeconds: number,
    minimumIntervalMs: number
  ): Promise<ProviderAccessReservation>;
}

export interface RedisLike {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, options?: { ex?: number; px?: number }): Promise<unknown>;
  eval(script: string, keys: string[], args: unknown[]): Promise<unknown>;
}

const RESERVE_PROVIDER_SLOT_SCRIPT = `
local now = redis.call('TIME')
local now_ms = now[1] * 1000 + math.floor(now[2] / 1000)
local last = tonumber(redis.call('GET', KEYS[1]) or '0')
local interval = tonumber(ARGV[1])
if last > 0 and now_ms - last < interval then
  return {0, interval - (now_ms - last)}
end
redis.call('SET', KEYS[1], now_ms, 'PX', interval * 2)
return {1, 0}
`;

const PROVIDER_SLOT_KEY = "afterlight:geocode:v1:provider-slot";
const PROVIDER_QUOTA_KEY = "afterlight:geocode:v1:quota:provider";
const RESERVE_QUOTA_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
local ttl = redis.call('TTL', KEYS[1])
if count > tonumber(ARGV[1]) then
  return {0, math.max(ttl, 1)}
end
return {1, 0}
`;

const RESERVE_PROVIDER_ACCESS_SCRIPT = `
local now = redis.call('TIME')
local now_ms = now[1] * 1000 + math.floor(now[2] / 1000)
local quota_limit = tonumber(ARGV[1])
local quota_window = tonumber(ARGV[2])
local interval = tonumber(ARGV[3])
local count = tonumber(redis.call('GET', KEYS[1]) or '0')
local ttl = redis.call('TTL', KEYS[1])
if count >= quota_limit then
  return {0, math.max(ttl, 1) * 1000, 'quota'}
end
local last = tonumber(redis.call('GET', KEYS[2]) or '0')
if last > 0 and now_ms - last < interval then
  return {0, interval - (now_ms - last), 'slot'}
end
count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], quota_window) end
redis.call('SET', KEYS[2], now_ms, 'PX', interval * 2)
return {1, 0, 'allowed'}
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseCacheEntry(value: unknown): GeocodeCacheEntry | null {
  if (!isRecord(value)) return null;
  if (value.kind === "not_found") return { kind: "not_found" };
  if (value.kind !== "location" || !isRecord(value.location)) return null;
  const label = typeof value.location.label === "string" ? value.location.label.trim() : "";
  const latitude = value.location.latitude;
  const longitude = value.location.longitude;
  if (
    !label ||
    label.length > 160 ||
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    Math.abs(latitude) > 90 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }
  return { kind: "location", location: { label, latitude, longitude } };
}

function parseProviderSlot(value: unknown): ProviderSlot {
  if (!Array.isArray(value) || value.length < 2) throw new Error("Invalid provider slot response.");
  const allowed = Number(value[0]);
  const retryAfterMs = Number(value[1]);
  if (
    (allowed !== 0 && allowed !== 1) ||
    !Number.isFinite(retryAfterMs) ||
    retryAfterMs < 0 ||
    (allowed === 0 && retryAfterMs === 0) ||
    (allowed === 1 && retryAfterMs !== 0)
  ) {
    throw new Error("Invalid provider slot response.");
  }
  return { allowed: allowed === 1, retryAfterMs: Math.ceil(retryAfterMs) };
}

function parseQuotaReservation(value: unknown): QuotaReservation {
  if (!Array.isArray(value) || value.length < 2) throw new Error("Invalid quota response.");
  const allowed = Number(value[0]);
  const retryAfterSeconds = Number(value[1]);
  if (
    (allowed !== 0 && allowed !== 1) ||
    !Number.isFinite(retryAfterSeconds) ||
    retryAfterSeconds < 0 ||
    (allowed === 1 && retryAfterSeconds !== 0) ||
    (allowed === 0 && retryAfterSeconds < 1)
  ) {
    throw new Error("Invalid quota response.");
  }
  return { allowed: allowed === 1, retryAfterSeconds: Math.ceil(retryAfterSeconds) };
}

function parseProviderAccessReservation(value: unknown): ProviderAccessReservation {
  if (!Array.isArray(value) || value.length < 3) throw new Error("Invalid provider access response.");
  const allowed = Number(value[0]);
  const retryAfterMs = Number(value[1]);
  const reason = value[2];
  if (
    (allowed !== 0 && allowed !== 1) ||
    !Number.isFinite(retryAfterMs) ||
    retryAfterMs < 0 ||
    (allowed === 1 && (retryAfterMs !== 0 || reason !== "allowed")) ||
    (allowed === 0 && retryAfterMs < 1) ||
    (allowed === 0 && reason !== "quota" && reason !== "slot")
  ) {
    throw new Error("Invalid provider access response.");
  }
  return allowed === 1
    ? { allowed: true, retryAfterMs: 0, reason: "allowed" }
    : { allowed: false, retryAfterMs: Math.ceil(retryAfterMs), reason };
}

export class RedisGeocodeStore implements GeocodeStore {
  constructor(private readonly redis: RedisLike) {}

  async get(key: string) {
    return parseCacheEntry(await this.redis.get(key));
  }

  async set(key: string, value: GeocodeCacheEntry, ttlSeconds: number) {
    await this.redis.set(key, value, { ex: ttlSeconds });
  }

  async reserveClientQuota(
    clientKey: string,
    clientLimit: number,
    clientWindowSeconds: number
  ) {
    const result = await this.redis.eval(
      RESERVE_QUOTA_SCRIPT,
      [`afterlight:geocode:v1:quota:client:${clientKey}`],
      [clientLimit, clientWindowSeconds]
    );
    return parseQuotaReservation(result);
  }

  async reserveProviderQuota(limit: number, windowSeconds: number) {
    const result = await this.redis.eval(RESERVE_QUOTA_SCRIPT, [PROVIDER_QUOTA_KEY], [limit, windowSeconds]);
    return parseQuotaReservation(result);
  }

  async reserveProviderSlot(minimumIntervalMs: number) {
    const result = await this.redis.eval(RESERVE_PROVIDER_SLOT_SCRIPT, [PROVIDER_SLOT_KEY], [minimumIntervalMs]);
    return parseProviderSlot(result);
  }

  async reserveProviderAccess(limit: number, windowSeconds: number, minimumIntervalMs: number) {
    const result = await this.redis.eval(
      RESERVE_PROVIDER_ACCESS_SCRIPT,
      [PROVIDER_QUOTA_KEY, PROVIDER_SLOT_KEY],
      [limit, windowSeconds, minimumIntervalMs]
    );
    return parseProviderAccessReservation(result);
  }
}

type MemoryGeocodeStoreOptions = {
  now?: () => number;
  maxEntries?: number;
};

export class MemoryGeocodeStore implements GeocodeStore {
  private readonly entries = new Map<string, { value: GeocodeCacheEntry; expiresAt: number }>();
  private readonly now: () => number;
  private readonly maxEntries: number;
  private lastProviderRequestAt = Number.NEGATIVE_INFINITY;
  private readonly clientQuotas = new Map<string, { count: number; expiresAt: number }>();
  private providerQuota = { count: 0, expiresAt: 0 };

  constructor(options: MemoryGeocodeStoreOptions = {}) {
    this.now = options.now ?? Date.now;
    this.maxEntries = options.maxEntries ?? 100;
  }

  async get(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return null;
    }
    return structuredClone(entry.value);
  }

  async set(key: string, value: GeocodeCacheEntry, ttlSeconds: number) {
    if (this.entries.size >= this.maxEntries && !this.entries.has(key)) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey) this.entries.delete(oldestKey);
    }
    this.entries.set(key, { value: structuredClone(value), expiresAt: this.now() + ttlSeconds * 1_000 });
  }

  async reserveClientQuota(
    clientKey: string,
    clientLimit: number,
    clientWindowSeconds: number
  ): Promise<QuotaReservation> {
    const now = this.now();
    const currentClient = this.clientQuotas.get(clientKey);
    if (!currentClient && this.clientQuotas.size >= this.maxEntries) {
      const oldestClientKey = this.clientQuotas.keys().next().value;
      if (oldestClientKey) this.clientQuotas.delete(oldestClientKey);
    }
    const client = !currentClient || currentClient.expiresAt <= now
      ? { count: 0, expiresAt: now + clientWindowSeconds * 1_000 }
      : currentClient;
    const nextClient = { ...client, count: client.count + 1 };
    this.clientQuotas.set(clientKey, nextClient);
    if (nextClient.count > clientLimit) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((nextClient.expiresAt - now) / 1_000)) };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }

  async reserveProviderQuota(limit: number, windowSeconds: number): Promise<QuotaReservation> {
    const now = this.now();
    if (this.providerQuota.expiresAt <= now) {
      this.providerQuota = { count: 0, expiresAt: now + windowSeconds * 1_000 };
    }
    this.providerQuota = { ...this.providerQuota, count: this.providerQuota.count + 1 };
    if (this.providerQuota.count > limit) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((this.providerQuota.expiresAt - now) / 1_000)) };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }

  async reserveProviderSlot(minimumIntervalMs: number): Promise<ProviderSlot> {
    const now = this.now();
    const elapsed = now - this.lastProviderRequestAt;
    if (elapsed < minimumIntervalMs) {
      return { allowed: false, retryAfterMs: minimumIntervalMs - elapsed };
    }
    this.lastProviderRequestAt = now;
    return { allowed: true, retryAfterMs: 0 };
  }

  async reserveProviderAccess(
    limit: number,
    windowSeconds: number,
    minimumIntervalMs: number
  ): Promise<ProviderAccessReservation> {
    const now = this.now();
    if (this.providerQuota.expiresAt <= now) {
      this.providerQuota = { count: 0, expiresAt: now + windowSeconds * 1_000 };
    }
    if (this.providerQuota.count >= limit) {
      return {
        allowed: false,
        retryAfterMs: Math.max(1_000, this.providerQuota.expiresAt - now),
        reason: "quota"
      };
    }
    const elapsed = now - this.lastProviderRequestAt;
    if (elapsed < minimumIntervalMs) {
      return { allowed: false, retryAfterMs: minimumIntervalMs - elapsed, reason: "slot" };
    }
    this.providerQuota = { ...this.providerQuota, count: this.providerQuota.count + 1 };
    this.lastProviderRequestAt = now;
    return { allowed: true, retryAfterMs: 0, reason: "allowed" };
  }
}
