/**
 * Storage Utility for User & Branch Namespacing
 * 
 * Ensures that all localStorage and sessionStorage keys are strictly scoped
 * with the active User ID/Name, Business ID, and Branch ID/Name so that 
 * different businesses, branches, or cashiers on the same machine do not conflict.
 */

export interface StorageUserContext {
  id?: number | string;
  name?: string;
  business_id?: number | string;
  branch_id?: number | string;
  branch_name?: string;
  role?: string;
}

/**
 * Generate a consistent, isolated storage key scoped to the user and branch context.
 * Example: "epos_read_announcements_u_12_b_3_br_4"
 */
export function getScopedKey(key: string, user?: StorageUserContext | null): string {
  if (!user || (!user.id && !user.business_id)) {
    return `epos_${key}_global`;
  }
  const uId = user.id ? `u_${user.id}` : (user.name ? `u_${encodeURIComponent(user.name)}` : 'u_anon');
  const bId = user.business_id ? `b_${user.business_id}` : 'b_0';
  const brId = user.branch_id ? `br_${user.branch_id}` : (user.branch_name ? `br_${encodeURIComponent(user.branch_name)}` : 'br_0');
  
  return `epos_${key}_${uId}_${bId}_${brId}`;
}

/**
 * Get item from localStorage with user & branch namespacing.
 */
export function getScopedLocalStorage<T = any>(key: string, user?: StorageUserContext | null, defaultValue: T | null = null): T | null {
  try {
    const scopedKey = getScopedKey(key, user);
    const item = localStorage.getItem(scopedKey);
    if (item === null) {
      // Legacy fallback for backward compatibility
      const legacyKey = `epos_${key}`;
      const legacyItem = localStorage.getItem(legacyKey);
      if (legacyItem !== null) {
        try { return JSON.parse(legacyItem) as T; } catch { return legacyItem as unknown as T; }
      }
      return defaultValue;
    }
    try {
      return JSON.parse(item) as T;
    } catch {
      return item as unknown as T;
    }
  } catch (e) {
    console.error(`[Storage] Failed to read localStorage key: ${key}`, e);
    return defaultValue;
  }
}

/**
 * Set item in localStorage with user & branch namespacing.
 */
export function setScopedLocalStorage(key: string, value: any, user?: StorageUserContext | null): void {
  try {
    const scopedKey = getScopedKey(key, user);
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(scopedKey, serialized);
  } catch (e) {
    console.error(`[Storage] Failed to set localStorage key: ${key}`, e);
  }
}

/**
 * Remove item from localStorage with user & branch namespacing.
 */
export function removeScopedLocalStorage(key: string, user?: StorageUserContext | null): void {
  try {
    const scopedKey = getScopedKey(key, user);
    localStorage.removeItem(scopedKey);
  } catch (e) {
    console.error(`[Storage] Failed to remove localStorage key: ${key}`, e);
  }
}

/**
 * Get item from sessionStorage with user & branch namespacing.
 */
export function getScopedSessionStorage<T = any>(key: string, user?: StorageUserContext | null, defaultValue: T | null = null): T | null {
  try {
    const scopedKey = getScopedKey(key, user);
    const item = sessionStorage.getItem(scopedKey);
    if (item === null) {
      // Legacy fallback for backward compatibility
      const legacyKey = `epos_${key}`;
      const legacyItem = sessionStorage.getItem(legacyKey);
      if (legacyItem !== null) {
        try { return JSON.parse(legacyItem) as T; } catch { return legacyItem as unknown as T; }
      }
      return defaultValue;
    }
    try {
      return JSON.parse(item) as T;
    } catch {
      return item as unknown as T;
    }
  } catch (e) {
    console.error(`[Storage] Failed to read sessionStorage key: ${key}`, e);
    return defaultValue;
  }
}

/**
 * Set item in sessionStorage with user & branch namespacing.
 */
export function setScopedSessionStorage(key: string, value: any, user?: StorageUserContext | null): void {
  try {
    const scopedKey = getScopedKey(key, user);
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    sessionStorage.setItem(scopedKey, serialized);
  } catch (e) {
    console.error(`[Storage] Failed to set sessionStorage key: ${key}`, e);
  }
}

/**
 * Remove item from sessionStorage with user & branch namespacing.
 */
export function removeScopedSessionStorage(key: string, user?: StorageUserContext | null): void {
  try {
    const scopedKey = getScopedKey(key, user);
    sessionStorage.removeItem(scopedKey);
  } catch (e) {
    console.error(`[Storage] Failed to remove sessionStorage key: ${key}`, e);
  }
}

/**
 * Clean storage specifically for a given user & branch context without affecting other users or branches.
 */
export function clearUserBranchStorage(user?: StorageUserContext | null): void {
  try {
    const prefix = 'epos_';
    const userScope = user?.id ? `u_${user.id}` : '';
    const branchScope = user?.branch_id ? `br_${user.branch_id}` : '';

    // Clear matching keys in localStorage
    const localKeys = Object.keys(localStorage);
    localKeys.forEach(k => {
      if (k.startsWith(prefix) && k !== 'theme' && !k.includes('read_announcements')) {
        if (!userScope || (k.includes(userScope) || k.includes(branchScope))) {
          localStorage.removeItem(k);
        }
      }
    });

    // Clear matching keys in sessionStorage
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach(k => {
      if (k.startsWith(prefix) && k !== 'theme' && !k.includes('read_announcements')) {
        if (!userScope || (k.includes(userScope) || k.includes(branchScope))) {
          sessionStorage.removeItem(k);
        }
      }
    });
  } catch (e) {
    console.error('[Storage] Error during clearUserBranchStorage:', e);
  }
}
