/**
 * MediaCache.js
 * LRU Cache for managing thumbnails and revokeable Blob URLs.
 * Prevents memory leaks by automatically calling URL.revokeObjectURL.
 */

class MediaCacheClass {
  constructor(maxSize = 50) {
    this.maxSize = maxSize;
    this.cache = new Map(); // Key -> Value
  }

  /**
   * Set cache limit dynamically.
   * @param {number} size 
   */
  setMaxSize(size) {
    this.maxSize = size;
    this.prune();
  }

  /**
   * Store a item in cache.
   * @param {string} key 
   * @param {any} value 
   */
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, value);
    this.prune();
  }

  /**
   * Retrieve an item from cache.
   * @param {string} key 
   * @returns {any}
   */
  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }
    // Refresh position for LRU
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * Remove item from cache and revoke its object URL if applicable.
   * @param {string} key 
   */
  delete(key) {
    if (this.cache.has(key)) {
      const val = this.cache.get(key);
      this.revokeIfBlob(val);
      this.cache.delete(key);
    }
  }

  /**
   * Revoke if the value contains a blob URL or is a blob URL.
   */
  revokeIfBlob(value) {
    if (typeof value === 'string' && value.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(value);
      } catch (e) {
        console.error('Error revoking blob URL:', e);
      }
    } else if (value && typeof value === 'object') {
      if (typeof value.url === 'string' && value.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(value.url);
        } catch (e) {
          console.error('Error revoking blob URL:', e);
        }
      }
      if (typeof value.thumbnail === 'string' && value.thumbnail.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(value.thumbnail);
        } catch (e) {
          console.error('Error revoking blob URL:', e);
        }
      }
    }
  }

  /**
   * Prune oldest entries from cache.
   */
  prune() {
    while (this.cache.size > this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        const val = this.cache.get(oldestKey);
        this.revokeIfBlob(val);
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Clear the entire cache.
   */
  clear() {
    for (const [key, val] of this.cache.entries()) {
      this.revokeIfBlob(val);
    }
    this.cache.clear();
  }
}

export const MediaCache = new MediaCacheClass();
