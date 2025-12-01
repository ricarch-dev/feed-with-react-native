import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Video } from '@/types';
import { Pause, Play } from 'lucide-react-native';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { ThemedText } from './template/themed-text';
import { ThemedView } from './template/themed-view';

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
      {/* Placeholder for video player - will be replaced with actual player later */}
      <View style={styles.videoPlaceholder}>
        <ThemedText style={styles.placeholderText}>
          {isActive ? <Play /> : <Pause />} {video.title}
        </ThemedText>
        <ThemedText style={styles.urlText} numberOfLines={1}>
          {video.url}
        </ThemedText>
      </View>
      
      {/* Video info overlay */}
      <View style={styles.infoOverlay}>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#e0e0e0',
  },
  placeholderText: {
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  urlText: {
    fontSize: 10,
    opacity: 0.6,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    padding: 8,
    backgroundColor: colorScheme === 'dark' 
      ? 'rgba(0, 0, 0, 0.6)' 
      : 'rgba(255, 255, 255, 0.8)',
    borderTopLeftRadius: 8,
  },
  duration: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
});

// Export dimensions for use in other components
export const VIDEO_TILE_DIMENSIONS = {
  width: VIDEO_TILE_WIDTH,
  height: VIDEO_TILE_HEIGHT,
};

