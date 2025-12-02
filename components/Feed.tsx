import { Post as PostType } from '@/types';
import { prefetchVideoMetadata } from '@/utils/prefetch';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, ViewToken } from 'react-native';
import Animated from 'react-native-reanimated';
import { Post } from './Post';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FeedProps {
  posts: PostType[];
  onScrollDirectionChange?: (direction: 'up' | 'down') => void;
}

interface ViewableItemsChanged {
  viewableItems: ViewToken[];
  changed: ViewToken[];
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<PostType>);

export const Feed: React.FC<FeedProps> = ({ posts, onScrollDirectionChange }) => {
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('up');
  const [isScrolling, setIsScrolling] = useState(false);

  // Find active post index for prefetching
  const activePostIndex = useMemo(() => {
    if (!activePostId) return -1;
    return posts.findIndex((p) => p.id === activePostId);
  }, [activePostId, posts]);

  // Prefetch next post's first video metadata
  useEffect(() => {
    if (activePostIndex >= 0 && activePostIndex < posts.length - 1) {
      const nextPost = posts[activePostIndex + 1];
      if (nextPost.videos.length > 0) {
        const firstVideo = nextPost.videos[0];
        // Prefetch metadata for the first video of the next post
        prefetchVideoMetadata(firstVideo.url).catch(() => {
          // Silently fail - prefetching is optional
        });
      }
    }
  }, [activePostIndex, posts]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: ViewableItemsChanged) => {
      // Find the post that is most visible
      // Only one post should be active at a time
      if (viewableItems.length === 0) {
        return; // Don't clear active post immediately
      }

      // Find the most visible item (prefer centered items)
      let activePost: PostType | null = null;
      let bestIndex = -1;

      for (const item of viewableItems) {
        if (item.isViewable && item.item && item.index !== null) {
          const post = item.item as PostType;
          
          // Take the first viewable item or prefer lower index (top of screen)
          if (activePost === null || item.index < bestIndex) {
            activePost = post;
            bestIndex = item.index;
          }
        }
      }

      // Set active post only if it actually changed
      if (activePost) {
        const newActiveId = activePost.id;
        setActivePostId((prevId) => {
          if (prevId !== newActiveId) {
            console.log('[Feed] Active post changed:', newActiveId, 'index:', bestIndex);
            return newActiveId;
          }
          return prevId;
        });
      }
    },
    []
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 75, // Post must be 75% visible to be considered active (reduced for faster detection)
    minimumViewTime: 200, // Wait 200ms before considering it viewable (reduced for faster response)
    waitForInteraction: false, // Don't wait for user to stop scrolling
  });

  const renderPost = useCallback(
    ({ item }: { item: PostType }) => {
      const isActive = activePostId === item.id;
      return <Post post={item} isActive={isActive} />;
    },
    [activePostId]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => {
      // More accurate item height estimation
      // Header (60) + Content (40) + Video carousel (400) + Footer (80) + margins (20)
      const estimatedItemHeight = 600;
      return {
        length: estimatedItemHeight,
        offset: estimatedItemHeight * index,
        index,
      };
    },
    []
  );

  const keyExtractor = useCallback((item: PostType) => item.id, []);

  const handleScroll = useCallback(
    (event: any) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;
      const direction = currentScrollY > lastScrollY.current ? 'down' : 'up';
      
      // Only trigger if direction actually changed
      if (direction !== scrollDirection.current) {
        scrollDirection.current = direction;
        if (onScrollDirectionChange) {
          onScrollDirectionChange(direction);
        }
      }
      
      lastScrollY.current = currentScrollY;
    },
    [onScrollDirectionChange]
  );

  const handleScrollBeginDrag = useCallback(() => {
    setIsScrolling(true);
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    setIsScrolling(false);
  }, []);

  const handleMomentumScrollEnd = useCallback(() => {
    setIsScrolling(false);
  }, []);

  return (
    <AnimatedFlatList
      data={posts}
      renderItem={renderPost}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig.current}
      onScroll={handleScroll}
      onScrollBeginDrag={handleScrollBeginDrag}
      onScrollEndDrag={handleScrollEndDrag}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      scrollEventThrottle={16}
      removeClippedSubviews={false} 
      maxToRenderPerBatch={2} 
      updateCellsBatchingPeriod={100} 
      initialNumToRender={2} 
      windowSize={3}
      showsVerticalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
  },
  contentContainer: {
    paddingBottom: 80, // Extra padding for bottom navbar
  },
});

