/**
 * In-Memory Client Cache for POS Application
 * 
 * Provides branch-isolated, stale-while-revalidate data caching to eliminate
 * page flashing, screen blinking, and layout shifts during navigation.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

function buildCacheKey(key: string, branchId?: number | string): string {
  const br = branchId ? `br_${branchId}` : 'br_global';
  return `${br}::${key}`;
}

/**
 * Retrieve cached data if valid or return null.
 */
export function getCachedData<T = any>(key: string, branchId?: number | string): T | null {
  const fullKey = buildCacheKey(key, branchId);
  const entry = memoryCache.get(fullKey);
  if (!entry) return null;

  // Stale-While-Revalidate: Return data even if slightly expired, background fetch will refresh it
  return entry.data as T;
}

/**
 * Check if the cached entry is still strictly fresh (within TTL).
 */
export function isCacheFresh(key: string, branchId?: number | string): boolean {
  const fullKey = buildCacheKey(key, branchId);
  const entry = memoryCache.get(fullKey);
  if (!entry) return false;
  return Date.now() < entry.expiresAt;
}

/**
 * Store data in the branch-isolated memory cache.
 * Default TTL: 60 seconds.
 */
export function setCachedData<T = any>(
  key: string, 
  data: T, 
  branchId?: number | string, 
  ttlMs: number = 60000
): void {
  const fullKey = buildCacheKey(key, branchId);
  memoryCache.set(fullKey, {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttlMs
  });
}

/**
 * Invalidate specific cache keys or keys matching a pattern.
 */
export function invalidateCache(keyPattern?: string, branchId?: number | string): void {
  if (!keyPattern) {
    if (branchId) {
      const prefix = `br_${branchId}::`;
      for (const k of memoryCache.keys()) {
        if (k.startsWith(prefix)) memoryCache.delete(k);
      }
    } else {
      memoryCache.clear();
    }
    return;
  }

  for (const k of memoryCache.keys()) {
    if (branchId) {
      const prefix = `br_${branchId}::`;
      if (k.startsWith(prefix) && k.includes(keyPattern)) {
        memoryCache.delete(k);
      }
    } else if (k.includes(keyPattern)) {
      memoryCache.delete(k);
    }
  }
}

/**
 * Flush entire in-memory cache (called on logout, branch switch, or user switch).
 */
export function clearAppCache(): void {
  memoryCache.clear();
}
