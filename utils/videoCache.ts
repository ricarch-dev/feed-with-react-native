/**
 * Video Cache Manager
 * Keeps track of videos that have been watched and their playback state
 */

interface VideoCacheEntry {
  uri: string;
  lastWatched: number;
  watchCount: number;
  lastPosition: number;
  duration: number;
  isFullyWatched: boolean;
}

class VideoCache {
  private cache: Map<string, VideoCacheEntry> = new Map();
  private maxCacheSize = 100; // Maximum number of videos to cache

  /**
   * Mark a video as watched
   */
  markAsWatched(uri: string, position: number, duration: number): void {
    const existing = this.cache.get(uri);
    const isFullyWatched = position >= duration * 0.9; // 90% watched = fully watched

    if (existing) {
      existing.lastWatched = Date.now();
      existing.watchCount += 1;
      existing.lastPosition = position;
      existing.duration = duration;
      existing.isFullyWatched = isFullyWatched || existing.isFullyWatched;
    } else {
      this.cache.set(uri, {
        uri,
        lastWatched: Date.now(),
        watchCount: 1,
        lastPosition: position,
        duration,
        isFullyWatched,
      });
    }

    // Clean up old entries if cache is too large
    this.cleanupCache();
  }

  /**
   * Check if a video has been watched
   */
  hasBeenWatched(uri: string): boolean {
    return this.cache.has(uri);
  }

  /**
   * Get cache entry for a video
   */
  getCacheEntry(uri: string): VideoCacheEntry | undefined {
    return this.cache.get(uri);
  }

  /**
   * Get last position for a video
   */
  getLastPosition(uri: string): number {
    return this.cache.get(uri)?.lastPosition ?? 0;
  }

  /**
   * Check if video was fully watched
   */
  isFullyWatched(uri: string): boolean {
    return this.cache.get(uri)?.isFullyWatched ?? false;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove old entries to keep cache size manageable
   */
  private cleanupCache(): void {
    if (this.cache.size <= this.maxCacheSize) {
      return;
    }

    // Sort by last watched time and remove oldest entries
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => b[1].lastWatched - a[1].lastWatched);

    // Keep only the most recent entries
    const toKeep = entries.slice(0, this.maxCacheSize);
    this.cache = new Map(toKeep);

    console.log('[VideoCache] Cleaned up cache, kept', this.cache.size, 'entries');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalVideos: number;
    fullyWatchedVideos: number;
    totalWatchCount: number;
  } {
    const entries = Array.from(this.cache.values());
    return {
      totalVideos: entries.length,
      fullyWatchedVideos: entries.filter((e) => e.isFullyWatched).length,
      totalWatchCount: entries.reduce((sum, e) => sum + e.watchCount, 0),
    };
  }
}

// Export singleton instance
export const videoCache = new VideoCache();

