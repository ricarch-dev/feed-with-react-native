import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Post as PostType } from '@/types';
import { prefetchVideoMetadata } from '@/utils/prefetch';
import { Heart, MessageCircleMore, Share2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View, ViewToken } from 'react-native';
import { ThemedText } from './template/themed-text';
import { ThemedView } from './template/themed-view';
import { VIDEO_TILE_DIMENSIONS, VideoTile } from './VideoTile';


const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PostProps {
  post: PostType;
  isActive?: boolean;
}

interface ViewableItemsChanged {
  viewableItems: ViewToken[];
  changed: ViewToken[];
}

export const Post: React.FC<PostProps> = ({ post, isActive = false }) => {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Calculate active index based on scroll position (primary method)
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const itemWidth = VIDEO_TILE_DIMENSIONS.width + 16; // width + margin
      
      // Calculate which video is currently centered/visible
      const newIndex = Math.round(contentOffsetX / itemWidth);
      
      // Ensure index is within bounds
      const clampedIndex = Math.max(0, Math.min(newIndex, post.videos.length - 1));
      
      // Update state only if index changed
      setActiveVideoIndex((prevIndex) => {
        if (prevIndex !== clampedIndex) {
          return clampedIndex;
        }
        return prevIndex;
      });
    },
    [post.videos.length]
  );

  // Horizontal visibility detection using onViewableItemsChanged (backup method)
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: ViewableItemsChanged) => {
      // Find the video that is most visible (centered or highest visibility)
      if (viewableItems.length === 0) {
        return;
      }

      let mostVisibleIndex = activeVideoIndex;
      let bestItem: ViewToken | null = null;

      for (const item of viewableItems) {
        if (item.isViewable && item.item && item.index !== null) {
          const index = item.index;
          
          if (index >= 0 && index < post.videos.length) {
            // Prefer the item that is viewable and has a valid index
            // If we don't have a best item yet, or this one is more centered, use it
            if (!bestItem || (item.index !== null && item.index === activeVideoIndex)) {
              bestItem = item;
              mostVisibleIndex = index;
            }
          }
        }
      }

      // Update if we found a valid index that's different
      if (mostVisibleIndex !== activeVideoIndex && mostVisibleIndex >= 0 && mostVisibleIndex < post.videos.length) {
        setActiveVideoIndex(mostVisibleIndex);
      }
    },
    [activeVideoIndex, post.videos.length]
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50, // Reduced threshold for better detection
    minimumViewTime: 100, // Slightly increased for stability while still being responsive
  });

  const renderVideo = useCallback(
    ({ item, index }: { item: PostType['videos'][0]; index: number }) => {
      // Only the active video in the active post should be considered active
      const isVideoActive = isActive && index === activeVideoIndex;
      
      return <VideoTile video={item} isActive={isVideoActive} />;
    },
    [isActive, activeVideoIndex]
  );

  const keyExtractor = useCallback((item: PostType['videos'][0]) => item.id, []);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: VIDEO_TILE_DIMENSIONS.width + 16,
      offset: (VIDEO_TILE_DIMENSIONS.width + 16) * index,
      index,
    }),
    []
  );

  // Prefetch next video in horizontal carousel
  useEffect(() => {
    if (isActive && post.videos.length > 0) {
      const nextVideoIndex = activeVideoIndex + 1;
      if (nextVideoIndex < post.videos.length) {
        const nextVideo = post.videos[nextVideoIndex];
        // Prefetch metadata for the next video
        prefetchVideoMetadata(nextVideo.url).catch(() => {
          console.log('[Post] prefetch_error', { error: 'next video' });
        });
      }
    }
  }, [isActive, activeVideoIndex, post.videos]);

  const styles = useMemo(() => createStyles(colors, colorScheme), [colors, colorScheme]);

  return (
    <ThemedView style={styles.container}>
      {/* Post Header */}
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          <ThemedText style={styles.avatarText}>
            {post.author.username.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.headerInfo}>
          <ThemedText style={styles.username}>{post.author.username}</ThemedText>
          <ThemedText style={styles.timestamp}>
            {new Date(post.timestamp).toLocaleDateString()}
          </ThemedText>
        </View>
      </View>

      {/* Post Content */}
      <ThemedText style={styles.content}>{post.content}</ThemedText>

      {/* Video Carousel */}
      <View style={styles.carouselContainer}>
        <FlatList
          ref={carouselRef}
          data={post.videos}
          renderItem={renderVideo}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={VIDEO_TILE_DIMENSIONS.width + 16}
          decelerationRate="fast"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig.current}
          getItemLayout={getItemLayout}
          removeClippedSubviews={true}
          maxToRenderPerBatch={2}
          initialNumToRender={1}
          windowSize={2}
        />
        
        {/* Video indicators */}
        {post.videos.length > 1 && (
          <View style={styles.indicators}>
            {post.videos.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === activeVideoIndex && styles.indicatorActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Post Footer */}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Heart />
          <ThemedText style={styles.footerText}>{post.likes}</ThemedText>
        </View>
        <View style={styles.footerItem}>
          <MessageCircleMore />
          <ThemedText style={styles.footerText}>{post.comments}</ThemedText>
        </View>
        <View style={styles.footerItem}>
          <Share2 />
          <ThemedText style={styles.footerText}>{post.shares}</ThemedText>
        </View>
      </View>
    </ThemedView>
  );
};

// Styles will be created dynamically based on theme
const createStyles = (colors: typeof Colors.light, colorScheme: 'light' | 'dark') => StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colorScheme === 'dark' 
      ? 'rgba(255, 255, 255, 0.1)' 
      : 'rgba(0, 0, 0, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colorScheme === 'dark' ? '#3a3a3a' : '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  headerInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.6,
  },
  content: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  carouselContainer: {
    marginBottom: 12,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colorScheme === 'dark' 
      ? 'rgba(255, 255, 255, 0.3)' 
      : 'rgba(0, 0, 0, 0.3)',
  },
  indicatorActive: {
    backgroundColor: colors.tint,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    gap: 24,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerIcon: {
    fontSize: 18,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

