import { Post as PostType } from '@/types';
import { prefetchVideoMetadata } from '@/utils/prefetch';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, ViewToken } from 'react-native';
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
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          //! Silently fail - prefetching is optional
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

      // Find the most visible item - works for both scroll up and down
      // Strategy: Find the item with the highest visibility percentage
      let activePost: PostType | null = null;
      let bestIndex = -1;
      let bestVisibility = 0;

      for (const item of viewableItems) {
        if (item.isViewable && item.item && item.index !== null) {
          const post = item.item as PostType;
          
          // Calculate visibility: use percentage if available, otherwise use boolean
          // ViewToken may have percentageVisible or similar, but for now we'll use
          // a simple heuristic: prefer items that are fully viewable
          const visibility = item.isViewable === true ? 1 : (typeof item.isViewable === 'number' ? item.isViewable : 0);
          
          // Always prefer the item with highest visibility
          // This works correctly for both scroll directions
          if (activePost === null || visibility > bestVisibility) {
            activePost = post;
            bestIndex = item.index;
            bestVisibility = visibility;
          } else if (visibility === bestVisibility && item.index !== null) {
            // If visibility is equal, prefer the one that's more centered
            // For scroll up: prefer higher index (post that's coming into view)
            // For scroll down: prefer lower index (post that's at top)
            // But actually, we should prefer the one closest to center of screen
            // For now, if visibility is same, keep the first one found (stable)
            // This prevents flickering when multiple posts have same visibility
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
    itemVisiblePercentThreshold: 50, // Post must be 50% visible to be considered active (reduced for faster detection in both directions)
    minimumViewTime: 100, // Wait 100ms before considering it viewable (reduced for faster response when scrolling up)
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
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;
      const direction = currentScrollY > lastScrollY.current ? 'down' : 'up';
      
      // Only trigger if direction actually changed
      if (direction !== scrollDirection.current) {
        scrollDirection.current = direction;
        if (onScrollDirectionChange) {
          onScrollDirectionChange(direction);
        }
      }
      
      // Clear any pending scroll-based updates
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Calculate which post is most centered based on scroll position
      // This helps detect active post when scrolling up (backup to onViewableItemsChanged)
      const estimatedItemHeight = 600; // Same as getItemLayout
      const screenHeight = Dimensions.get('window').height;
      const centerY = currentScrollY + screenHeight / 2;
      const estimatedIndex = Math.floor(centerY / estimatedItemHeight);
      
      // Only update if index is valid and different from current
      if (estimatedIndex >= 0 && estimatedIndex < posts.length) {
        const estimatedPost = posts[estimatedIndex];
        if (estimatedPost && estimatedPost.id !== activePostId) {
          // Use a small delay to avoid flickering during fast scroll
          scrollTimeoutRef.current = setTimeout(() => {
            setActivePostId((prevId) => {
              if (estimatedPost.id !== prevId) {
                console.log('[Feed] Active post changed (scroll-based):', estimatedPost.id, 'index:', estimatedIndex);
                return estimatedPost.id;
              }
              return prevId;
            });
          }, 200); // Small delay to avoid rapid changes
        }
      }
      
      lastScrollY.current = currentScrollY;
    },
    [onScrollDirectionChange, posts, activePostId]
  );

  const handleScrollBeginDrag = useCallback(() => {
    setIsScrolling(true);
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    setIsScrolling(false);
  }, []);

  const handleMomentumScrollEnd = useCallback(() => {
    setIsScrolling(false);
    // Clear any pending scroll-based updates when scroll ends
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
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
      removeClippedSubviews={true} 
      maxToRenderPerBatch={2} 
      updateCellsBatchingPeriod={50} 
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
    paddingBottom: 80,
  },
});

