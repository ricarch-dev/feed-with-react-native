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
export const VideoPlayer: React.FC<VideoPlayerProps> = ({ uri, isActive }) => {
  const videoRef = useRef<Video | null>(null);

  const [isBuffering, setIsBuffering] = useState(true);
  const [manuallyPaused, setManuallyPaused] = useState(false);

  const [hasLoggedStart, setHasLoggedStart] = useState(false);
  const [hasLoggedComplete, setHasLoggedComplete] = useState(false);
  const [hasLoggedTTFF, setHasLoggedTTFF] = useState(false);
  const [mountTime] = useState<number>(() => Date.now());

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
          log('error', { message: status.error });
        }
        return;
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
    [hasLoggedComplete, hasLoggedStart, hasLoggedTTFF, log, mountTime]
  );

  const handleError = useCallback(
    (error: unknown) => {
      log('playback_error', { error: String(error) });
    },
    [log]
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

      {isBuffering && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#ffffff" />
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
});


