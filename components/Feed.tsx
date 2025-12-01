import React, { useState, useCallback, useRef } from 'react';
import { FlatList, ViewToken, StyleSheet, Dimensions } from 'react-native';
import { Post } from './Post';
import { Post as PostType } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FeedProps {
  posts: PostType[];
}

interface ViewableItemsChanged {
  viewableItems: ViewToken[];
  changed: ViewToken[];
}

export const Feed: React.FC<FeedProps> = ({ posts }) => {
  const [activePostId, setActivePostId] = useState<string | null>(null);

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

  return (
    <FlatList
      data={posts}
      renderItem={renderPost}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig.current}
      removeClippedSubviews={true} // Optimize for performance
      maxToRenderPerBatch={5} // Render 5 items per batch
      updateCellsBatchingPeriod={50} // Batch updates every 50ms
      initialNumToRender={3} // Render 3 items initially
      windowSize={10} // Render 10 screens worth of items
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
    paddingBottom: 20,
  },
});

