/**
 * Prefetching utilities for video metadata
 * Uses HEAD requests to prefetch metadata without downloading the full video
 */

interface PrefetchOptions {
  timeout?: number;
}

/**
 * Prefetch video metadata using HEAD request
 * This validates the URL exists and gets headers without downloading the full video
 */
export async function prefetchVideoMetadata(
  url: string,
  options: PrefetchOptions = {}
): Promise<boolean> {
  const { timeout = 5000 } = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'Range': 'bytes=0-1', // Request only first 2 bytes to validate
      },
    });

    clearTimeout(timeoutId);

    // Check if the request was successful (200-299) or supports range requests (206)
    const isValid = response.ok || response.status === 206;

    if (isValid) {
      console.log('[Prefetch]', 'Video metadata prefetched', { url, status: response.status });
    } else {
      console.warn('[Prefetch]', 'Video metadata prefetch failed', { url, status: response.status });
    }

    return isValid;
  } catch (error) {
    // Silently fail - prefetching is optional and shouldn't break the app
    if (error instanceof Error && error.name !== 'AbortError') {
      console.warn('[Prefetch]', 'Video metadata prefetch error', { url, error: error.message });
    }
    return false;
  }
}

/**
 * Prefetch multiple video URLs in parallel (with limit)
 */
export async function prefetchMultipleVideos(
  urls: string[],
  options: PrefetchOptions = {}
): Promise<void> {
  // Limit concurrent prefetch requests to avoid overwhelming the network
  const MAX_CONCURRENT = 3;
  const batches: string[][] = [];

  // Split URLs into batches
  for (let i = 0; i < urls.length; i += MAX_CONCURRENT) {
    batches.push(urls.slice(i, i + MAX_CONCURRENT));
  }

  // Process batches sequentially, but items within batch in parallel
  for (const batch of batches) {
    await Promise.allSettled(
      batch.map((url) => prefetchVideoMetadata(url, options))
    );
  }
}

