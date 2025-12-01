import { ResizeMode, Video, type AVPlaybackStatus } from 'expo-av';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

interface VideoPlayerProps {
  uri: string;
  isActive: boolean;
}

/**
 * Minimal video player responsible ONLY for playback + analytics.
 * - UI (titles, overlays, etc.) vive en `VideoTile`.
 * - Control principal de autoplay viene por la prop `isActive`.
 */
const VideoPlayerComponent: React.FC<VideoPlayerProps> = ({ uri, isActive }) => {
  const videoRef = useRef<Video | null>(null);

  const [isBuffering, setIsBuffering] = useState(true);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [_showOverlayIcon, setShowOverlayIcon] = useState(false);
  const [hasLoggedStart, setHasLoggedStart] = useState(false);
  const [hasLoggedComplete, setHasLoggedComplete] = useState(false);
  const [hasLoggedTTFF, setHasLoggedTTFF] = useState(false);
  const [mountTime] = useState<number>(() => Date.now());

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  const shouldPlay = isActive && !manuallyPaused;

  const log = useCallback((event: string, extra?: Record<string, unknown>) => {
    console.log('[VideoAnalytics]', event, {
      uri,
      timestamp: new Date().toISOString(),
      ...extra,
    });
  }, [uri]);

  const handleStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        if ('error' in status) {
          const errorMessage = status.error;
          log('error', { message: errorMessage });
          
          // Retry logic for playback errors
          if (retryCount < MAX_RETRIES && isActive) {
            setHasError(true);
            setTimeout(() => {
              if (videoRef.current && isActive) {
                setRetryCount((prev) => prev + 1);
                setHasError(false);
                videoRef.current
                  .replayAsync()
                  .then(() => {
                    log('retry_success', { attempt: retryCount + 1 });
                  })
                  .catch((retryError) => {
                    log('retry_failed', { attempt: retryCount + 1, error: String(retryError) });
                  });
              }
            }, RETRY_DELAY);
          } else if (retryCount >= MAX_RETRIES) {
            log('max_retries_reached', { uri, retryCount });
            setHasError(true);
          }
        }
        return;
      }

      // Reset error state on successful load
      if (status.isLoaded && hasError) {
        setHasError(false);
        setRetryCount(0);
      }

      setIsBuffering(status.isBuffering);

      // Time to first frame: first time it's loaded and not buffering
      if (!hasLoggedTTFF && !status.isBuffering) {
        const ttff = Date.now() - mountTime;
        setHasLoggedTTFF(true);
        log('time_to_first_frame', { ms: ttff });
      }

      // Playback start
      if (!hasLoggedStart && status.isPlaying) {
        setHasLoggedStart(true);
        log('playback_start', { positionMillis: status.positionMillis });
      }

      // Playback completion
      if (!hasLoggedComplete && status.didJustFinish) {
        setHasLoggedComplete(true);
        log('playback_complete', { durationMillis: status.durationMillis });
      }
    },
    [hasLoggedComplete, hasLoggedStart, hasLoggedTTFF, log, mountTime, retryCount, isActive, hasError]
  );

  const handleError = useCallback(
    (error: unknown) => {
      log('playback_error', { error: String(error) });
      
      // Retry logic for initialization/network errors
      if (retryCount < MAX_RETRIES && isActive) {
        setHasError(true);
        setTimeout(() => {
          if (videoRef.current && isActive) {
            setRetryCount((prev) => prev + 1);
            setHasError(false);
            // Try to reload the video
            videoRef.current
              .loadAsync({ uri })
              .then(() => {
                log('retry_load_success', { attempt: retryCount + 1 });
              })
              .catch((retryError) => {
                log('retry_load_failed', { attempt: retryCount + 1, error: String(retryError) });
              });
          }
        }, RETRY_DELAY);
      } else if (retryCount >= MAX_RETRIES) {
        log('max_retries_reached', { uri, retryCount });
        setHasError(true);
      }
    },
    [log, retryCount, isActive, uri]
  );

  const hideOverlayIcon = useCallback(() => {
    setShowOverlayIcon(false);
  }, []);

  const togglePause = useCallback(() => {
    setManuallyPaused((prev) => {
      const newState = !prev;
      setShowOverlayIcon(true);

      if (!newState) {
        setTimeout(() => {
          hideOverlayIcon();
        }, 700);
      }
      return newState;
    });
  }, [hideOverlayIcon]);

  // Load and manage video lifecycle
  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive) {
      // When video becomes active, load and play
      videoRef.current
        .loadAsync({ uri }, { shouldPlay: shouldPlay, isMuted: false })
        .then(() => {
          log('video_loaded_active', { uri });
          // Reset analytics flags for new playback session
          setHasLoggedStart(false);
          setHasLoggedComplete(false);
          setHasLoggedTTFF(false);
          setIsBuffering(true);
          setRetryCount(0);
          setHasError(false);
        })
        .catch((error) => {
          log('load_error', { error: String(error) });
        });
    } else {
      // When video becomes inactive, pause first (faster than unload)
      videoRef.current
        .pauseAsync()
        .catch(() => {
          // Ignore errors
        });
      
      // Unload after delay to free memory, but allow quick return
      const unloadTimer = setTimeout(() => {
        if (videoRef.current && !isActive) {
          videoRef.current
            .unloadAsync()
            .then(() => {
              log('video_unloaded', { reason: 'inactive_after_delay' });
              setManuallyPaused(false);
              setIsBuffering(true);
            })
            .catch((error) => {
              log('unload_error', { error: String(error) });
            });
        }
      }, 3000); // 3 second delay before unloading

      return () => clearTimeout(unloadTimer);
    }
  }, [isActive, shouldPlay, uri, log]);

  // Cleanup: unload video when component unmounts
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.unloadAsync().catch(() => {
          // Ignore errors during cleanup
        });
      }
    };
  }, []);

  return (
    <Pressable style={styles.container} onPress={togglePause}>
      <Video
        ref={(ref) => {
          videoRef.current = ref;
        }}
        style={styles.video}
        source={{ uri }}
        shouldPlay={shouldPlay}
        isLooping
        resizeMode={ResizeMode.COVER}
        onPlaybackStatusUpdate={handleStatusUpdate}
        onError={handleError}
        useNativeControls={false}
        progressUpdateIntervalMillis={100}
      />

      {(isBuffering || hasError) && (
        <View style={styles.loadingOverlay}>
          {hasError && retryCount >= MAX_RETRIES ? (
            <View style={styles.errorContainer}>
              <ActivityIndicator color="#ffffff" size="small" />
            </View>
          ) : (
            <ActivityIndicator color="#ffffff" />
          )}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Memoize VideoPlayer component to prevent unnecessary re-renders
export const VideoPlayer = React.memo(VideoPlayerComponent, (prevProps, nextProps) => {
  // Only re-render if URI or isActive state changes
  return (
    prevProps.uri === nextProps.uri &&
    prevProps.isActive === nextProps.isActive
  );
});


