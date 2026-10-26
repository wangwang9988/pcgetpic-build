import type { RankConfig } from '../config/rankConfig';

const CACHE_SCHEMA_VERSION = 1;
const FRESH_TTL_MS = 5 * 60 * 1000;
const STALE_TTL_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8_000;
const TOTAL_ATTEMPTS = 3;
const MAX_CACHE_ENTRIES = 16;
const REQUEST_LOCK_TTL_MS = 35_000;
const CIRCUIT_WINDOW_MS = 60_000;
const CIRCUIT_INITIAL_OPEN_MS = 60_000;
const CIRCUIT_MAX_OPEN_MS = 5 * 60 * 1000;
const CHANNEL_NAME = 'ad-site-rank-data-v1';

const CACHE_PREFIX = 'ad-site:rank-cache:v1:';
const REQUEST_LOCK_PREFIX = 'ad-site:rank-lock:v1:';
const CIRCUIT_PREFIX = 'ad-site:rank-circuit:v1:';
const CIRCUIT_PROBE_PREFIX = 'ad-site:rank-circuit-probe:v1:';
const EVENT_PREFIX = 'ad-site:rank-event:v1:';

type ErrorCode =
  | 'aborted'
  | 'business'
  | 'circuit-open'
  | 'http'
  | 'network'
  | 'schema'
  | 'shared-request-ended'
  | 'timeout';

export type RankRawItem = Record<string, unknown>;

export interface RankDataResult {
  items: RankRawItem[];
  source: 'fresh-cache' | 'network' | 'stale-cache';
  /** stale-while-revalidate：失败时解析为 null，旧数据仍可继续展示。 */
  refresh?: Promise<RankRawItem[] | null>;
}

export interface RankDataOptions {
  signal?: AbortSignal;
  forceRefresh?: boolean;
}

interface CacheEntry {
  schemaVersion: number;
  fingerprint: string;
  fetchedAt: number;
  expiresAt: number;
  staleUntil: number;
  lastAccessedAt: number;
  items: RankRawItem[];
}

interface CacheHit {
  entry: CacheEntry;
  freshness: 'fresh' | 'stale';
}

interface SharedLock {
  owner: string;
  createdAt: number;
  expiresAt: number;
}

interface LockAcquisition {
  acquired: boolean;
  expiresAt: number;
  storageBacked: boolean;
  owner: string | null;
}

interface CircuitState {
  schemaVersion: number;
  endpoint: string;
  failureTimestamps: number[];
  openUntil: number;
  openCount: number;
}

interface SharedEvent {
  scope: typeof CHANNEL_NAME;
  fingerprint: string;
  state: 'failure' | 'success';
  at: number;
  errorCode?: ErrorCode;
  retryable?: boolean;
  items?: RankRawItem[];
}

interface CircuitGate {
  state: 'closed' | 'half-open' | 'open';
  openUntil: number;
}

class RankDataClientError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;

  constructor(
    code: ErrorCode,
    message: string,
    options: { retryable?: boolean; retryAfterMs?: number; cause?: unknown } = {},
  ) {
    super(message);
    this.name = 'RankDataClientError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.retryAfterMs = options.retryAfterMs;
    if (options.cause !== undefined) {
      Object.defineProperty(this, 'cause', {
        configurable: true,
        value: options.cause,
      });
    }
  }
}

const clientId = (() => {
  try {
    return globalThis.crypto?.randomUUID?.() ?? `rank-${Date.now()}-${Math.random()}`;
  } catch {
    return `rank-${Date.now()}-${Math.random()}`;
  }
})();

const inFlightRequests = new Map<string, Promise<RankRawItem[]>>();

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(',')}}`;
}

/** 相同 method、URL 与参数得到相同指纹，rankType 别名不会拆分缓存。 */
export function createRankRequestFingerprint(config: RankConfig): string {
  return `${config.method.toUpperCase()}|${config.apiUrl}|${stableSerialize(config.params)}`;
}

function getEndpointKey(config: RankConfig): string {
  try {
    const url = new URL(config.apiUrl);
    return `${url.origin}${url.pathname}`;
  } catch {
    return config.apiUrl;
  }
}

function cacheKey(fingerprint: string): string {
  return `${CACHE_PREFIX}${hashString(fingerprint)}`;
}

function requestLockKey(fingerprint: string): string {
  return `${REQUEST_LOCK_PREFIX}${hashString(fingerprint)}`;
}

function eventKey(fingerprint: string): string {
  return `${EVENT_PREFIX}${hashString(fingerprint)}`;
}

function circuitKey(endpoint: string): string {
  return `${CIRCUIT_PREFIX}${hashString(endpoint)}`;
}

function circuitProbeKey(endpoint: string): string {
  return `${CIRCUIT_PROBE_PREFIX}${hashString(endpoint)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRankItemArray(value: unknown): value is RankRawItem[] {
  return Array.isArray(value) && value.every(isRecord);
}

function parseCacheEntry(raw: string | null, fingerprint: string): CacheEntry | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return null;
    if (
      value.schemaVersion !== CACHE_SCHEMA_VERSION
      || value.fingerprint !== fingerprint
      || typeof value.fetchedAt !== 'number'
      || typeof value.expiresAt !== 'number'
      || typeof value.staleUntil !== 'number'
      || typeof value.lastAccessedAt !== 'number'
      || !isRankItemArray(value.items)
    ) {
      return null;
    }
    return value as unknown as CacheEntry;
  } catch {
    return null;
  }
}

function readCache(fingerprint: string): CacheHit | null {
  const storage = getStorage();
  if (!storage) return null;

  const key = cacheKey(fingerprint);
  let entry: CacheEntry | null = null;
  try {
    entry = parseCacheEntry(storage.getItem(key), fingerprint);
  } catch {
    return null;
  }

  if (!entry) {
    try {
      storage.removeItem(key);
    } catch {
      // 存储不可用时退回普通网络请求。
    }
    return null;
  }

  const now = Date.now();
  if (entry.staleUntil <= now) {
    try {
      storage.removeItem(key);
    } catch {
      // 过期缓存清理失败不影响后续请求。
    }
    return null;
  }

  if (now - entry.lastAccessedAt >= 60_000) {
    entry.lastAccessedAt = now;
    try {
      storage.setItem(key, JSON.stringify(entry));
    } catch {
      // 最近访问时间只用于淘汰，写失败可忽略。
    }
  }

  return {
    entry,
    freshness: entry.expiresAt > now ? 'fresh' : 'stale',
  };
}

function listCacheEntries(storage: Storage): Array<{ key: string; entry: CacheEntry }> {
  const result: Array<{ key: string; entry: CacheEntry }> = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(CACHE_PREFIX)) continue;
    try {
      const raw: unknown = JSON.parse(storage.getItem(key) ?? 'null');
      if (!isRecord(raw) || typeof raw.lastAccessedAt !== 'number') continue;
      result.push({ key, entry: raw as unknown as CacheEntry });
    } catch {
      // 历史脏缓存会在后续按 key 命中时清理。
    }
  }
  return result;
}

function pruneCache(storage: Storage, targetCount: number): void {
  const entries = listCacheEntries(storage).sort(
    (left, right) => left.entry.lastAccessedAt - right.entry.lastAccessedAt,
  );
  const removeCount = Math.max(0, entries.length - targetCount);
  for (let index = 0; index < removeCount; index += 1) {
    const item = entries[index];
    if (item) storage.removeItem(item.key);
  }
}

function writeCache(fingerprint: string, items: RankRawItem[]): CacheEntry {
  const now = Date.now();
  const entry: CacheEntry = {
    schemaVersion: CACHE_SCHEMA_VERSION,
    fingerprint,
    fetchedAt: now,
    expiresAt: now + FRESH_TTL_MS,
    staleUntil: now + STALE_TTL_MS,
    lastAccessedAt: now,
    items,
  };

  const storage = getStorage();
  if (!storage) return entry;

  const key = cacheKey(fingerprint);
  try {
    pruneCache(storage, MAX_CACHE_ENTRIES - 1);
    storage.setItem(key, JSON.stringify(entry));
  } catch {
    try {
      pruneCache(storage, Math.floor(MAX_CACHE_ENTRIES / 2));
      storage.setItem(key, JSON.stringify(entry));
    } catch {
      // 容量不足或隐私模式下缓存失败，网络结果仍正常返回。
    }
  }
  return entry;
}

function parseSharedLock(raw: string | null): SharedLock | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return null;
    if (
      typeof value.owner !== 'string'
      || typeof value.createdAt !== 'number'
      || typeof value.expiresAt !== 'number'
    ) {
      return null;
    }
    return value as unknown as SharedLock;
  } catch {
    return null;
  }
}

function readSharedLock(key: string): SharedLock | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return parseSharedLock(storage.getItem(key));
  } catch {
    return null;
  }
}

async function acquireSharedLock(
  key: string,
  ttlMs: number,
  signal?: AbortSignal,
): Promise<LockAcquisition> {
  const storage = getStorage();
  if (!storage) {
    return {
      acquired: true,
      expiresAt: Date.now() + ttlMs,
      storageBacked: false,
      owner: null,
    };
  }

  const now = Date.now();
  const existing = readSharedLock(key);
  if (existing && existing.expiresAt > now) {
    return {
      acquired: false,
      expiresAt: existing.expiresAt,
      storageBacked: true,
      owner: null,
    };
  }

  const owner = `${clientId}:${now}:${Math.random()}`;
  const lock: SharedLock = { owner, createdAt: now, expiresAt: now + ttlMs };
  try {
    storage.setItem(key, JSON.stringify(lock));
  } catch {
    return {
      acquired: true,
      expiresAt: lock.expiresAt,
      storageBacked: false,
      owner: null,
    };
  }

  // localStorage 没有原子 compare-and-set；短暂让出事件循环后再确认所有权。
  await abortableDelay(25 + Math.random() * 35, signal);
  const confirmed = readSharedLock(key);
  return {
    acquired: confirmed?.owner === owner && confirmed.expiresAt > Date.now(),
    expiresAt: confirmed?.expiresAt ?? lock.expiresAt,
    storageBacked: true,
    owner,
  };
}

function releaseSharedLock(key: string, lock: LockAcquisition): void {
  if (!lock.storageBacked || !lock.owner) return;
  const storage = getStorage();
  if (!storage) return;
  try {
    if (readSharedLock(key)?.owner === lock.owner) storage.removeItem(key);
  } catch {
    // 锁带有过期时间，即使释放失败也不会永久阻塞。
  }
}

function parseCircuitState(raw: string | null, endpoint: string): CircuitState | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return null;
    if (
      value.schemaVersion !== CACHE_SCHEMA_VERSION
      || value.endpoint !== endpoint
      || !Array.isArray(value.failureTimestamps)
      || !value.failureTimestamps.every((item) => typeof item === 'number')
      || typeof value.openUntil !== 'number'
      || typeof value.openCount !== 'number'
    ) {
      return null;
    }
    return value as unknown as CircuitState;
  } catch {
    return null;
  }
}

function readCircuit(endpoint: string): CircuitState {
  const empty: CircuitState = {
    schemaVersion: CACHE_SCHEMA_VERSION,
    endpoint,
    failureTimestamps: [],
    openUntil: 0,
    openCount: 0,
  };
  const storage = getStorage();
  if (!storage) return empty;
  try {
    return parseCircuitState(storage.getItem(circuitKey(endpoint)), endpoint) ?? empty;
  } catch {
    return empty;
  }
}

function writeCircuit(state: CircuitState): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(circuitKey(state.endpoint), JSON.stringify(state));
  } catch {
    // 熔断共享失败时仍保留单实例的重试上限。
  }
}

function getCircuitGate(endpoint: string, forceProbe: boolean): CircuitGate {
  const state = readCircuit(endpoint);
  const now = Date.now();
  if (state.openUntil > now) {
    return forceProbe
      ? { state: 'half-open', openUntil: state.openUntil }
      : { state: 'open', openUntil: state.openUntil };
  }
  if (state.openCount > 0) return { state: 'half-open', openUntil: state.openUntil };
  return { state: 'closed', openUntil: 0 };
}

function recordCircuitFailure(endpoint: string, halfOpen: boolean): void {
  const state = readCircuit(endpoint);
  const now = Date.now();

  if (halfOpen) {
    const openCount = Math.max(1, state.openCount + 1);
    const duration = Math.min(
      CIRCUIT_MAX_OPEN_MS,
      CIRCUIT_INITIAL_OPEN_MS * (2 ** (openCount - 1)),
    );
    writeCircuit({
      ...state,
      failureTimestamps: [now],
      openCount,
      openUntil: now + duration,
    });
    return;
  }

  const failureTimestamps = state.failureTimestamps
    .filter((timestamp) => now - timestamp <= CIRCUIT_WINDOW_MS)
    .concat(now);
  if (failureTimestamps.length < 3) {
    writeCircuit({ ...state, failureTimestamps });
    return;
  }

  const openCount = Math.max(1, state.openCount || 1);
  const duration = Math.min(
    CIRCUIT_MAX_OPEN_MS,
    CIRCUIT_INITIAL_OPEN_MS * (2 ** (openCount - 1)),
  );
  writeCircuit({
    ...state,
    failureTimestamps,
    openCount,
    openUntil: now + duration,
  });
}

function resetCircuit(endpoint: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(circuitKey(endpoint));
  } catch {
    // 成功响应已经返回，清理失败不会影响页面展示。
  }
}

function createAbortError(cause?: unknown): RankDataClientError {
  return new RankDataClientError('aborted', '请求已取消', { cause });
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw createAbortError(signal.reason);
}

function abortableDelay(delayMs: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const timerId = window.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, Math.max(0, delayMs));

    const handleAbort = () => {
      window.clearTimeout(timerId);
      signal?.removeEventListener('abort', handleAbort);
      reject(createAbortError(signal?.reason));
    };
    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(8_000, seconds * 1_000);
  }
  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  return Math.min(8_000, Math.max(0, date - Date.now()));
}

function isRetryableHttpStatus(status: number): boolean {
  return [408, 425, 429, 500, 502, 503, 504].includes(status);
}

function extractRankItems(payload: unknown): RankRawItem[] {
  if (!isRecord(payload)) {
    throw new RankDataClientError('schema', '榜单响应不是对象');
  }

  const successful = payload.code === 200 || payload.code === '200' || payload.success === true;
  if (!successful) {
    throw new RankDataClientError('business', '榜单接口返回业务失败');
  }

  const data = payload.data;
  const candidates: unknown[] = [];
  if (isRecord(data)) {
    candidates.push(data.data);
    if (isRecord(data.data)) candidates.push(data.data.list);
    candidates.push(data.item_info, data.list);
  }
  candidates.push(data, payload.list);

  for (const candidate of candidates) {
    if (isRankItemArray(candidate)) return candidate;
    if (Array.isArray(candidate)) {
      throw new RankDataClientError('schema', '榜单数组包含无效商品项');
    }
  }

  throw new RankDataClientError('schema', '榜单响应结构不符合预期');
}

function buildRequest(config: RankConfig): { url: string; init?: RequestInit } {
  if (config.method === 'GET') {
    const url = new URL(config.apiUrl);
    for (const key of Object.keys(config.params).sort()) {
      const value = config.params[key];
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
    return { url: url.toString() };
  }

  return {
    url: config.apiUrl,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config.params),
    },
  };
}

async function requestOnce(config: RankConfig, signal?: AbortSignal): Promise<RankRawItem[]> {
  throwIfAborted(signal);
  const requestController = new AbortController();
  let timedOut = false;
  const handleAbort = () => requestController.abort(signal?.reason);
  signal?.addEventListener('abort', handleAbort, { once: true });
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    requestController.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const request = buildRequest(config);
    const response = await fetch(request.url, { ...request.init, signal: requestController.signal });
    if (!response.ok) {
      throw new RankDataClientError('http', `榜单请求失败：HTTP ${response.status}`, {
        retryable: isRetryableHttpStatus(response.status),
        retryAfterMs: parseRetryAfter(response.headers.get('Retry-After')),
      });
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new RankDataClientError('schema', '榜单响应不是有效 JSON', { cause: error });
    }
    return extractRankItems(payload);
  } catch (error) {
    if (signal?.aborted) throw createAbortError(signal.reason);
    if (timedOut) {
      throw new RankDataClientError('timeout', '榜单请求超时', {
        retryable: true,
        cause: error,
      });
    }
    if (error instanceof RankDataClientError) throw error;
    throw new RankDataClientError('network', '榜单网络请求失败', {
      retryable: true,
      cause: error,
    });
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener('abort', handleAbort);
  }
}

async function fetchWithRetry(
  config: RankConfig,
  endpoint: string,
  halfOpen: boolean,
  signal?: AbortSignal,
): Promise<RankRawItem[]> {
  const attempts = halfOpen ? 1 : TOTAL_ATTEMPTS;
  let lastError: RankDataClientError | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    throwIfAborted(signal);
    try {
      const items = await requestOnce(config, signal);
      resetCircuit(endpoint);
      return items;
    } catch (error) {
      const normalized = error instanceof RankDataClientError
        ? error
        : new RankDataClientError('network', '榜单请求失败', { retryable: true, cause: error });
      lastError = normalized;
      if (normalized.code === 'aborted') throw normalized;
      if (normalized.retryable) recordCircuitFailure(endpoint, halfOpen);
      if (!normalized.retryable || attempt >= attempts - 1) throw normalized;

      const gate = getCircuitGate(endpoint, false);
      if (gate.state === 'open') {
        throw new RankDataClientError('circuit-open', '榜单服务暂时不可用');
      }

      const baseDelay = Math.min(8_000, 1_000 * (2 ** attempt));
      const delay = normalized.retryAfterMs ?? Math.random() * baseDelay;
      await abortableDelay(delay, signal);
    }
  }

  throw lastError ?? new RankDataClientError('network', '榜单请求失败');
}

function broadcastSharedEvent(event: SharedEvent): void {
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(event);
    channel.close();
  } catch {
    // Firefox 隐私限制等场景由 storage 事件兜底。
  }

  const storage = getStorage();
  if (!storage) return;
  try {
    const { items: _items, ...storageEvent } = event;
    storage.setItem(eventKey(event.fingerprint), JSON.stringify({ ...storageEvent, nonce: Math.random() }));
  } catch {
    // 共享通知失败时等待方还会轮询缓存与过期锁。
  }
}

function parseSharedEvent(value: unknown): SharedEvent | null {
  if (!isRecord(value)) return null;
  if (
    value.scope !== CHANNEL_NAME
    || typeof value.fingerprint !== 'string'
    || (value.state !== 'success' && value.state !== 'failure')
    || typeof value.at !== 'number'
  ) {
    return null;
  }
  if (value.items !== undefined && !isRankItemArray(value.items)) return null;
  return value as unknown as SharedEvent;
}

function readStoredSharedEvent(fingerprint: string): SharedEvent | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return parseSharedEvent(JSON.parse(storage.getItem(eventKey(fingerprint)) ?? 'null'));
  } catch {
    return null;
  }
}

async function waitForSharedResult(
  fingerprint: string,
  baselineFetchedAt: number,
  lockExpiresAt: number,
  signal?: AbortSignal,
): Promise<RankRawItem[]> {
  throwIfAborted(signal);
  const startedAt = Date.now();
  const deadline = Math.max(startedAt + 1_000, lockExpiresAt + 750);

  return new Promise((resolve, reject) => {
    let settled = false;
    let pollTimer: number | undefined;
    let channel: BroadcastChannel | null = null;

    const cleanup = () => {
      if (pollTimer !== undefined) window.clearTimeout(pollTimer);
      signal?.removeEventListener('abort', handleAbort);
      window.removeEventListener('storage', handleStorage);
      channel?.close();
    };

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };

    const resolveFromCache = (): boolean => {
      const cached = readCache(fingerprint);
      if (cached && cached.entry.fetchedAt > baselineFetchedAt) {
        finish(() => resolve(cached.entry.items));
        return true;
      }
      return false;
    };

    const handleEvent = (event: SharedEvent) => {
      if (event.fingerprint !== fingerprint || event.at < startedAt) return;
      if (event.state === 'success') {
        if (event.items) {
          finish(() => resolve(event.items ?? []));
          return;
        }
        resolveFromCache();
        return;
      }
      if (event.errorCode === 'aborted') {
        finish(() => reject(new RankDataClientError(
          'shared-request-ended',
          '共享榜单请求已取消',
          { retryable: true },
        )));
        return;
      }
      finish(() => reject(new RankDataClientError(
        event.errorCode ?? 'shared-request-ended',
        '共享榜单请求未完成',
        { retryable: event.retryable },
      )));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === cacheKey(fingerprint) && resolveFromCache()) return;
      if (event.key !== eventKey(fingerprint) || !event.newValue) return;
      try {
        const sharedEvent = parseSharedEvent(JSON.parse(event.newValue));
        if (sharedEvent) handleEvent(sharedEvent);
      } catch {
        // 忽略其他版本或损坏的共享事件。
      }
    };

    const handleAbort = () => finish(() => reject(createAbortError(signal?.reason)));

    const poll = () => {
      if (resolveFromCache()) return;
      if (!readSharedLock(requestLockKey(fingerprint))) {
        const storedEvent = readStoredSharedEvent(fingerprint);
        if (storedEvent && storedEvent.at >= startedAt) {
          handleEvent(storedEvent);
          if (settled) return;
        }
        finish(() => reject(new RankDataClientError(
          'shared-request-ended',
          '共享榜单请求已结束',
          { retryable: true },
        )));
        return;
      }
      if (Date.now() >= deadline) {
        finish(() => reject(new RankDataClientError(
          'shared-request-ended',
          '共享榜单请求已结束',
          { retryable: true },
        )));
        return;
      }
      pollTimer = window.setTimeout(poll, 250);
    };

    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<unknown>) => {
        const sharedEvent = parseSharedEvent(event.data);
        if (sharedEvent) handleEvent(sharedEvent);
      };
    } catch {
      channel = null;
    }

    signal?.addEventListener('abort', handleAbort, { once: true });
    window.addEventListener('storage', handleStorage);
    poll();
  });
}

async function refreshAcrossFrames(
  config: RankConfig,
  fingerprint: string,
  baselineFetchedAt: number,
  forceProbe: boolean,
  signal?: AbortSignal,
): Promise<RankRawItem[]> {
  const lockKey = requestLockKey(fingerprint);

  for (let lockAttempt = 0; lockAttempt < 2; lockAttempt += 1) {
    const lock = await acquireSharedLock(lockKey, REQUEST_LOCK_TTL_MS, signal);
    if (!lock.acquired) {
      try {
        return await waitForSharedResult(
          fingerprint,
          baselineFetchedAt,
          lock.expiresAt,
          signal,
        );
      } catch (error) {
        if (!(error instanceof RankDataClientError) || error.code !== 'shared-request-ended') {
          throw error;
        }
        continue;
      }
    }

    let probeLock: Awaited<ReturnType<typeof acquireSharedLock>> | null = null;
    const endpoint = getEndpointKey(config);
    try {
      const refreshed = readCache(fingerprint);
      if (refreshed && refreshed.entry.fetchedAt > baselineFetchedAt) {
        return refreshed.entry.items;
      }

      const gate = getCircuitGate(endpoint, forceProbe);
      if (gate.state === 'open') {
        throw new RankDataClientError(
          'circuit-open',
          `榜单服务熔断中，${Math.max(1, Math.ceil((gate.openUntil - Date.now()) / 1_000))} 秒后恢复探测`,
        );
      }

      if (gate.state === 'half-open') {
        probeLock = await acquireSharedLock(
          circuitProbeKey(endpoint),
          REQUEST_TIMEOUT_MS + 2_000,
          signal,
        );
        if (!probeLock.acquired) {
          throw new RankDataClientError('circuit-open', '榜单服务正在恢复探测');
        }
      }

      const items = await fetchWithRetry(config, endpoint, gate.state === 'half-open', signal);
      writeCache(fingerprint, items);
      broadcastSharedEvent({
        scope: CHANNEL_NAME,
        fingerprint,
        state: 'success',
        at: Date.now(),
        items,
      });
      return items;
    } catch (error) {
      const normalized = error instanceof RankDataClientError
        ? error
        : new RankDataClientError('network', '榜单请求失败', { retryable: true, cause: error });
      broadcastSharedEvent({
        scope: CHANNEL_NAME,
        fingerprint,
        state: 'failure',
        at: Date.now(),
        errorCode: normalized.code,
        retryable: normalized.retryable,
      });
      throw normalized;
    } finally {
      if (probeLock) {
        releaseSharedLock(circuitProbeKey(endpoint), probeLock);
      }
      releaseSharedLock(lockKey, lock);
    }
  }

  throw new RankDataClientError('shared-request-ended', '无法取得榜单请求锁', { retryable: true });
}

function startRefresh(
  config: RankConfig,
  fingerprint: string,
  baselineFetchedAt: number,
  forceProbe: boolean,
  signal?: AbortSignal,
): Promise<RankRawItem[]> {
  const existing = inFlightRequests.get(fingerprint);
  if (existing) return existing;

  const request = refreshAcrossFrames(
    config,
    fingerprint,
    baselineFetchedAt,
    forceProbe,
    signal,
  ).finally(() => {
    if (inFlightRequests.get(fingerprint) === request) inFlightRequests.delete(fingerprint);
  });
  inFlightRequests.set(fingerprint, request);
  return request;
}

/**
 * 读取榜单数据：fresh 缓存直接返回，stale 缓存立即展示并由唯一 iframe 刷新。
 * 无缓存时，同源 iframe 通过短时锁和 BroadcastChannel/storage 共享一次请求。
 */
export async function getRankData(
  config: RankConfig,
  options: RankDataOptions = {},
): Promise<RankDataResult> {
  throwIfAborted(options.signal);
  const fingerprint = createRankRequestFingerprint(config);
  const cached = readCache(fingerprint);

  if (!options.forceRefresh && cached?.freshness === 'fresh') {
    return { items: cached.entry.items, source: 'fresh-cache' };
  }

  const baselineFetchedAt = cached?.entry.fetchedAt ?? 0;
  const refresh = startRefresh(
    config,
    fingerprint,
    baselineFetchedAt,
    options.forceRefresh ?? false,
    options.signal,
  );

  if (!options.forceRefresh && cached?.freshness === 'stale') {
    return {
      items: cached.entry.items,
      source: 'stale-cache',
      refresh: refresh.catch(() => null),
    };
  }

  try {
    const items = await refresh;
    return { items, source: 'network' };
  } catch (error) {
    // 手动刷新失败时允许继续展示 30 分钟窗口内的旧数据。
    if (cached) return { items: cached.entry.items, source: 'stale-cache' };
    throw error;
  }
}
