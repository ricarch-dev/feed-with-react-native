import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Video, type AVPlaybackStatus } from 'expo-av';

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

  const [hasLoggedStart, setHasLoggedStart] = useState(false);
  const [hasLoggedComplete, setHasLoggedComplete] = useState(false);
  const [hasLoggedTTFF, setHasLoggedTTFF] = useState(false);
  const [mountTime] = useState<number>(() => Date.now());

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  const shouldPlay = isActive && !manuallyPaused;

  const log = useCallback((event: string, extra?: Record<string, unknown>) => {
    // Hook de analytics simple (se puede reemplazar por algo más robusto)
    // eslint-disable-next-line no-console
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

      // Time to first frame: primera vez que está cargado y no está bufferizando
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

  const togglePause = useCallback(() => {
    // Control manual simple: el usuario puede pausar/reanudar tocando
    setManuallyPaused((prev) => !prev);
  }, []);

  // Unload video resources when not active (core lifecycle management)
  useEffect(() => {
    if (!isActive && videoRef.current) {
      // When video becomes inactive, unload it to free memory and CPU/GPU resources
      videoRef.current
        .unloadAsync()
        .then(() => {
          log('video_unloaded', { reason: 'inactive' });
          // Reset manual pause state when video becomes inactive
          setManuallyPaused(false);
          // Reset buffering state
          setIsBuffering(true);
        })
        .catch((error) => {
          log('unload_error', { error: String(error) });
        });
    } else if (isActive && videoRef.current) {
      // When video becomes active again, reset analytics flags for new playback session
      setHasLoggedStart(false);
      setHasLoggedComplete(false);
      setHasLoggedTTFF(false);
      setIsBuffering(true);
      setRetryCount(0);
      setHasError(false);
    }
  }, [isActive, log]);

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
        resizeMode="cover"
        onPlaybackStatusUpdate={handleStatusUpdate}
        onError={handleError}
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


