import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { FlatList, ViewToken, StyleSheet, Dimensions } from 'react-native';
import { Post } from './Post';
import { Post as PostType } from '@/types';
import { prefetchVideoMetadata } from '@/utils/prefetch';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FeedProps {
  posts: PostType[];
  onScrollDirectionChange?: (direction: 'up' | 'down') => void;
}

interface ViewableItemsChanged {
  viewableItems: ViewToken[];
  changed: ViewToken[];
}

export const Feed: React.FC<FeedProps> = ({ posts, onScrollDirectionChange }) => {
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('up');

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
      // Find the post that is 100% visible (fully visible)
      // Only one post should be active at a time
      if (viewableItems.length === 0) {
        setActivePostId(null);
        return;
      }

      // Find the item that is fully visible (100%)
      // Prefer the first fully visible item, or the one with highest visibility
      let activePost: PostType | null = null;
      let maxVisibility = 0;

      for (const item of viewableItems) {
        if (item.isViewable && item.item) {
          // Check if item is fully visible (we use 100% threshold in viewabilityConfig)
          // For items that pass the threshold, they should be considered 100% visible
          const post = item.item as PostType;
          
          // If this is the first fully visible item, use it
          if (!activePost) {
            activePost = post;
            maxVisibility = 100;
          } else {
            // If multiple items are visible, prefer the one that appeared first
            // (usually the one with lower index)
            if (item.index !== null && item.index < (viewableItems.find(v => v.item?.id === activePost?.id)?.index ?? Infinity)) {
              activePost = post;
            }
          }
        }
      }

      // Set active post only if we found a fully visible item
      setActivePostId(activePost?.id ?? null);
    },
    []
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 100, // Post must be 100% visible to be considered active
    minimumViewTime: 200, // Minimum time in ms before considering it viewable
  });

  const renderPost = useCallback(
    ({ item }: { item: PostType }) => {
      const isActive = activePostId === item.id;
      return <Post post={item} isActive={isActive} />;
    },
    [activePostId]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => {
      // Estimate item height - will be refined later
      // For now, using a rough estimate based on video tile height + header/footer
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

  return (
    <FlatList
      data={posts}
      renderItem={renderPost}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig.current}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      removeClippedSubviews={true} // Optimize for performance
      maxToRenderPerBatch={3} // Render 3 items per batch (reduced for better performance)
      updateCellsBatchingPeriod={50} // Batch updates every 50ms
      initialNumToRender={2} // Render 2 items initially (reduced for faster initial render)
      windowSize={5} // Render 5 screens worth of items (reduced for better memory management)
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

