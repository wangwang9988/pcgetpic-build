import { ref } from 'vue';
import { RANK_POOL, RANK_MAPPING, RANK_LIST_CONFIG } from '../config/rankConfig';

export const AD_RANK_API_BASE = 'https://api.downpictures.com';
export const NUMERIC_SLOT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

/** 用于触发 Vue computed 重新计算 RANK_LIST_CONFIG 的版本号 */
export const rankMappingVersion = ref(0);

let inFlightPromise: Promise<Record<string, string>> | null = null;
let lastFetchedAt = 0;
const MEMORY_TTL_MS = 10_000;

export function isNumericRankSlot(rankType: number | string): boolean {
  return NUMERIC_SLOT_KEYS.includes(String(rankType) as (typeof NUMERIC_SLOT_KEYS)[number]);
}

export function getSnapshotSlotMapping(): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (const slot of NUMERIC_SLOT_KEYS) {
    snapshot[slot] = RANK_MAPPING[slot] || 'A';
  }
  return snapshot;
}

export function applyRankMappingInMemory(mapping: Record<string, string>): void {
  let changed = false;
  for (const slot of NUMERIC_SLOT_KEYS) {
    const poolKey = mapping[slot];
    const targetPool = poolKey ? RANK_POOL[poolKey] : undefined;
    if (poolKey && targetPool) {
      if (RANK_MAPPING[slot] !== poolKey) {
        changed = true;
      }
      RANK_MAPPING[slot] = poolKey;
      RANK_LIST_CONFIG[slot] = {
        id: slot,
        ...targetPool,
      };
    }
  }
  if (changed) {
    rankMappingVersion.value += 1;
  }
}

export async function ensureRemoteRankMapping(options?: {
  force?: boolean;
}): Promise<Record<string, string>> {
  const force = options?.force === true;

  // 离线自动化测试环境 (127.0.0.1) 不发起跨站外网请求，保持测试隔离与确定性
  if (
    !force &&
    typeof window !== 'undefined' &&
    window.location.hostname === '127.0.0.1'
  ) {
    return getSnapshotSlotMapping();
  }

  const now = Date.now();
  if (!force && lastFetchedAt > 0 && now - lastFetchedAt < MEMORY_TTL_MS) {
    return getSnapshotSlotMapping();
  }

  if (!force && inFlightPromise) {
    return inFlightPromise;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);

  inFlightPromise = (async () => {
    try {
      const response = await fetch(`${AD_RANK_API_BASE}/api/v1/ad-rank-mapping`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });
      if (response.ok) {
        const payload = (await response.json()) as {
          success?: boolean;
          data?: { mapping?: Record<string, string> };
        };
        if (payload?.success && payload.data?.mapping) {
          applyRankMappingInMemory(payload.data.mapping);
          lastFetchedAt = Date.now();
        }
      }
    } catch {
      // 网络异常或超时时静默降级为 rankConfig.ts 内置默认配置
    } finally {
      clearTimeout(timer);
      inFlightPromise = null;
    }
    return getSnapshotSlotMapping();
  })();

  return inFlightPromise;
}
