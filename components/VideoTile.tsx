import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Video } from '@/types';
import { videoCache } from '@/utils/videoCache';
import { Image } from 'expo-image';
import React, { useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { ThemedView } from './template/themed-view';
import { VideoPlayer } from './VideoPlayer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_TILE_WIDTH = SCREEN_WIDTH * 0.9; // 90% of screen width
const VIDEO_TILE_HEIGHT = VIDEO_TILE_WIDTH * 1.5; // 16:9 aspect ratio approximately

interface VideoTileProps {
  video: Video;
  isActive?: boolean;
}

const VideoTileComponent: React.FC<VideoTileProps> = ({ video, isActive = false }) => {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const styles = useMemo(() => createStyles(colors, colorScheme), [colors, colorScheme]);
  const [showVideo, setShowVideo] = useState(false);
  
  // Check if video has been watched before
  const hasBeenWatched = videoCache.hasBeenWatched(video.url);
  const isFullyWatched = videoCache.isFullyWatched(video.url);

  // Show video player when active, hide when inactive
  React.useEffect(() => {
    if (isActive) {
      setShowVideo(true);
    } else {
      // Delay hiding to allow for smooth transitions when scrolling quickly
      const hideTimeout = setTimeout(() => {
        setShowVideo(false);
      }, 300);
      
      return () => clearTimeout(hideTimeout);
    }
  }, [isActive]);

  return (
    <ThemedView style={styles.container}>
      {/* Thumbnail overlay - shows before video loads or when inactive */}
      {video.thumbnail && !showVideo && (
        <Image
          source={{ uri: video.thumbnail }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={200}
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        />
      )}
      
      {/* Fallback placeholder when no thumbnail */}
      {!video.thumbnail && !showVideo && (
        <View style={styles.placeholderContainer}>
          <View style={styles.playIconPlaceholder} />
        </View>
      )}
      
      {/* Watched indicator */}
      {hasBeenWatched && (
        <View style={[styles.watchedBadge, isFullyWatched && styles.fullyWatchedBadge]}>
          <View style={styles.watchedDot} />
        </View>
      )}
      
      {/* Video player */}
      <View style={styles.videoPlaceholder}>
        <VideoPlayer uri={video.url} isActive={isActive} />
      </View>
    </ThemedView>
  );
};

// Styles will be created dynamically based on theme
const createStyles = (colors: typeof Colors.light, colorScheme: 'light' | 'dark') => StyleSheet.create({
  container: {
    width: VIDEO_TILE_WIDTH,
    height: VIDEO_TILE_HEIGHT,
    marginHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f0f0f0',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: colorScheme === 'dark' ? '#000000' : '#000000',
  },
  placeholderText: {
    fontSize: 18,
    marginBottom: 4,
  },
  urlText: {
    fontSize: 10,
    opacity: 0.6,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  infoOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: colorScheme === 'dark' 
      ? 'rgba(0, 0, 0, 0.6)'
      : 'rgba(255, 255, 255, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  duration: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  watchedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    padding: 6,
  },
  fullyWatchedBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
  },
  watchedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  placeholderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1,
  },
  playIconPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
});

// Memoize VideoTile component to prevent unnecessary re-renders
export const VideoTile = React.memo(VideoTileComponent, (prevProps, nextProps) => {
  // Only re-render if video data or isActive state changes
  return (
    prevProps.video.id === nextProps.video.id &&
    prevProps.video.url === nextProps.video.url &&
    prevProps.isActive === nextProps.isActive
  );
});

// Export dimensions for use in other components
export const VIDEO_TILE_DIMENSIONS = {
  width: VIDEO_TILE_WIDTH,
  height: VIDEO_TILE_HEIGHT,
};

