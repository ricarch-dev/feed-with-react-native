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
      // Find the post that is most visible (highest percentage visible)
      if (viewableItems.length === 0) {
        setActivePostId(null);
        return;
      }

      // Find the item with the highest visibility percentage
      let mostVisible: ViewToken | null = null;
      let maxPercentVisible = 0;

      for (const item of viewableItems) {
        if (item.isViewable && item.item) {
          // Use the percentage visible if available, otherwise default to 100% for fully visible items
          const percentVisible = item.index !== null ? 100 : 0;
          if (percentVisible > maxPercentVisible) {
            mostVisible = item;
            maxPercentVisible = percentVisible;
          }
        }
      }

      // Set active post if we found a visible item
      if (mostVisible && mostVisible.item) {
        const post = mostVisible.item as PostType;
        setActivePostId(post.id);
      } else {
        setActivePostId(null);
      }
    },
    []
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80, // Post must be 80% visible to be considered active
    minimumViewTime: 100, // Minimum time in ms before considering it viewable
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

