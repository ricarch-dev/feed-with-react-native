import { videoCache } from '@/utils/videoCache';
import { useVideoPlayer, VideoView } from 'expo-video';
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
 * - Optimized for fast loading and smooth transitions
 */
const VideoPlayerComponent: React.FC<VideoPlayerProps> = ({ uri, isActive }) => {
  const [isBuffering, setIsBuffering] = useState(true);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [showOverlayIcon, setShowOverlayIcon] = useState(false);
  const [overlayIconType, setOverlayIconType] = useState<'play' | 'pause'>('play');
  const [hasLoggedStart, setHasLoggedStart] = useState(false);
  const [hasLoggedComplete, setHasLoggedComplete] = useState(false);
  const [hasLoggedTTFF, setHasLoggedTTFF] = useState(false);
  const [mountTime] = useState<number>(() => Date.now());
  const lastActiveState = useRef(isActive);

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  const log = useCallback((event: string, extra?: Record<string, unknown>) => {
    console.log('[VideoAnalytics]', event, {
      uri,
      timestamp: new Date().toISOString(),
      ...extra,
    });
  }, [uri]);

  // Create video player instance - useVideoPlayer handles the URI automatically
  const player = useVideoPlayer(uri, (player) => {
    player.loop = true;
    player.muted = false;
  });

  // Handle playback status changes
  useEffect(() => {
    if (!player) return;

    const subscription = player.addListener('statusChange', (status) => {
      // Handle different status states
      switch (status.status) {
        case 'loading':
          setIsBuffering(true);
          break;
        case 'readyToPlay':
          setIsBuffering(false);
          
          // Time to first frame: only log if video is active
          if (!hasLoggedTTFF && isActive) {
            const ttff = Date.now() - mountTime;
            setHasLoggedTTFF(true);
            log('time_to_first_frame', { ms: ttff });
          }
          
          // Reset error state on successful load
          if (hasError) {
            setHasError(false);
            setRetryCount(0);
          }
          break;
        case 'idle':
          setIsBuffering(false);
          break;
        case 'error':
          {
            const errorMessage = status.error?.message || 'Unknown error';
            log('error', { message: errorMessage });
            setHasError(true);
            
            // Retry logic for playback errors
            if (retryCount < MAX_RETRIES && isActive) {
              setTimeout(() => {
                if (player && isActive) {
                  setRetryCount((prev) => prev + 1);
                  setHasError(false);
                  try {
                    player.replay();
                    log('retry_success', { attempt: retryCount + 1 });
                  } catch (retryError) {
                    log('retry_failed', { attempt: retryCount + 1, error: String(retryError) });
                  }
                }
              }, RETRY_DELAY);
            } else if (retryCount >= MAX_RETRIES) {
              log('max_retries_reached', { uri, retryCount });
              setHasError(true);
            }
          }
          break;
      }
    });

    // Monitor playing state for analytics
    const playingSubscription = player.addListener('playingChange', (isPlaying) => {
      // Only log if video is active
      if (isPlaying && !hasLoggedStart && isActive) {
        setHasLoggedStart(true);
        setIsBuffering(false);
        const position = player.currentTime || 0;
        log('playback_start', { 
          positionMillis: position * 1000,
          hasBeenWatched: videoCache.hasBeenWatched(uri)
        });
        
        // Update cache with current position
        if (player.duration) {
          videoCache.markAsWatched(uri, position, player.duration);
        }
      }
    });

    // Handle playback end (for completion logging)
    const endSubscription = player.addListener('playToEnd', () => {
      if (!hasLoggedComplete) {
        setHasLoggedComplete(true);
        const duration = player.duration || 0;
        log('playback_complete', { 
          durationMillis: duration * 1000 
        });
        
        // Mark video as fully watched in cache
        videoCache.markAsWatched(uri, duration, duration);
      }
    });

    return () => {
      subscription.remove();
      playingSubscription.remove();
      endSubscription.remove();
    };
  }, [player, hasLoggedComplete, hasLoggedStart, hasLoggedTTFF, log, mountTime, retryCount, isActive, hasError, uri]);

  const hideOverlayIcon = useCallback(() => {
    setShowOverlayIcon(false);
  }, []);

  const togglePause = useCallback(() => {
    if (!player) return;
    
    setManuallyPaused((prev) => {
      const newState = !prev;
      
      // Show overlay icon with appropriate type
      if (newState) {
        // Pausing - show pause icon
        setOverlayIconType('pause');
        setShowOverlayIcon(true);
        player.pause();
        
        // Hide icon after delay
        setTimeout(() => {
          hideOverlayIcon();
        }, 800);
      } else {
        // Playing - show play icon
        setOverlayIconType('play');
        setShowOverlayIcon(true);
        player.play();
        
        // Hide icon after delay
        setTimeout(() => {
          hideOverlayIcon();
        }, 800);
      }
      
      return newState;
    });
  }, [hideOverlayIcon, player]);

  // Control playback based on isActive
  useEffect(() => {
    if (!player) return;

    // Only react to actual state changes
    if (lastActiveState.current === isActive) {
      return;
    }
    
    lastActiveState.current = isActive;

    if (isActive) {
      // When video becomes active, reset analytics and states
      setHasLoggedStart(false);
      setHasLoggedComplete(false);
      setHasLoggedTTFF(false);
      setRetryCount(0);
      setHasError(false);
      setManuallyPaused(false);
      setIsBuffering(true); // Set buffering state immediately
      
      // Small delay before playing to avoid overwhelming the network
      const playTimeout = setTimeout(() => {
        if (player && isActive) {
          player.play();
        }
      }, 100); // Small delay before playing to avoid overwhelming the network
      
      return () => clearTimeout(playTimeout);
    } else {
      // When video becomes inactive, pause immediately and reset buffering
      player.pause();
      setIsBuffering(false); // Clear buffering state when inactive
    }
  }, [isActive, player]);

  if (!player) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  return (
    <Pressable style={styles.container} onPress={togglePause}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
      />

      {/* Loading overlay */}
      {(isBuffering || hasError) && (
        <View style={styles.loadingOverlay}>
          {hasError && retryCount >= MAX_RETRIES ? (
            <View style={styles.errorContainer}>
              <View style={styles.loadingIndicator}>
                <ActivityIndicator color="#ffffff" size="large" />
                <View style={styles.errorBadge}>
                  <ActivityIndicator color="#ff4444" size="small" />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.loadingIndicator}>
              <ActivityIndicator color="#ffffff" size="large" />
            </View>
          )}
        </View>
      )}

      {/* Play/Pause overlay icon */}
      {showOverlayIcon && !isBuffering && (
        <View style={styles.overlayIconContainer}>
          <View style={styles.overlayIconBackground}>
            {overlayIconType === 'play' ? (
              // Play icon (triangle)
              <View style={styles.playIcon}>
                <View style={styles.playTriangle} />
              </View>
            ) : (
              // Pause icon (two bars)
              <View style={styles.pauseIcon}>
                <View style={styles.pauseBar} />
                <View style={styles.pauseBar} />
              </View>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  errorBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderRadius: 12,
    padding: 4,
  },
  overlayIconContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  overlayIconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  playIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4, // Offset to center the triangle
  },
  playTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 24,
    borderRightWidth: 0,
    borderTopWidth: 14,
    borderBottomWidth: 14,
    borderLeftColor: '#ffffff',
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  pauseIcon: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseBar: {
    width: 8,
    height: 32,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
});

// Memoize VideoPlayer component to prevent unnecessary re-renders
export const VideoPlayer = React.memo(VideoPlayerComponent, (prevProps, nextProps) => {
  // Only re-render if URI or isActive state changes
  const shouldNotRerender = (
    prevProps.uri === nextProps.uri &&
    prevProps.isActive === nextProps.isActive
  );
  
  return shouldNotRerender;
});
