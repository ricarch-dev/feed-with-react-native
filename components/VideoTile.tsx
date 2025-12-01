import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Video } from '@/types';
import { Pause, Play } from 'lucide-react-native';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { ThemedText } from './template/themed-text';
import { ThemedView } from './template/themed-view';
import { VideoPlayer } from './VideoPlayer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_TILE_WIDTH = SCREEN_WIDTH * 0.9; // 90% of screen width
const VIDEO_TILE_HEIGHT = VIDEO_TILE_WIDTH * 1.5; // 16:9 aspect ratio approximately

interface VideoTileProps {
  video: Video;
  isActive?: boolean;
}

export const VideoTile: React.FC<VideoTileProps> = ({ video, isActive = false }) => {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const styles = createStyles(colors, colorScheme);

  return (
    <ThemedView style={styles.container}>
      {/* Video player */}
      <View style={styles.videoPlaceholder}>
        <VideoPlayer uri={video.url} isActive={isActive} />
      </View>
      
      {/* Video info overlay */}
      <View style={styles.infoOverlay}>
        <View style={styles.titleContainer}>
          <ThemedText style={styles.placeholderText} numberOfLines={1}>
            {isActive ? <Play /> : <Pause />} {video.title}
          </ThemedText>
          <ThemedText style={styles.urlText} numberOfLines={1}>
            {video.url}
          </ThemedText>
        </View>
        <ThemedText style={styles.duration}>
          {video.duration ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}` : '--:--'}
        </ThemedText>
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
});

// Export dimensions for use in other components
export const VIDEO_TILE_DIMENSIONS = {
  width: VIDEO_TILE_WIDTH,
  height: VIDEO_TILE_HEIGHT,
};

