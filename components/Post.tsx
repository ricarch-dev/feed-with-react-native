import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Post as PostType } from '@/types';
import { Heart, MessageCircleMore, Share2 } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, View, ViewToken } from 'react-native';
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

  // Horizontal visibility detection using onViewableItemsChanged
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: ViewableItemsChanged) => {
      // Find the video that is fully visible in the horizontal carousel
      if (viewableItems.length === 0) {
        setActiveVideoIndex(0);
        return;
      }

      // Find the first fully visible video item
      let activeVideo: PostType['videos'][0] | null = null;
      let activeIndex = 0;

      for (const item of viewableItems) {
        if (item.isViewable && item.item) {
          const video = item.item as PostType['videos'][0];
          const index = item.index ?? 0;
          
          // Use the first visible item, or prefer the one with lower index
          if (!activeVideo || index < activeIndex) {
            activeVideo = video;
            activeIndex = index;
          }
        }
      }

      // Update active video index
      if (activeVideo) {
        setActiveVideoIndex((prevIndex) => {
          // Only update if the index actually changed
          if (prevIndex !== activeIndex) {
            return activeIndex;
          }
          return prevIndex;
        });
      }
    },
    []
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 100, // Video must be 100% visible to be considered active
    minimumViewTime: 100, // Minimum time in ms before considering it viewable
  });

  const renderVideo = ({ item, index }: { item: PostType['videos'][0]; index: number }) => {
    // Only the active video in the active post should be considered active
    const isVideoActive = isActive && index === activeVideoIndex;
    
    return <VideoTile video={item} isActive={isVideoActive} />;
  };

  const styles = createStyles(colors, colorScheme);

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
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={VIDEO_TILE_DIMENSIONS.width + 16} // width + margin
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig.current}
          getItemLayout={(_, index) => ({
            length: VIDEO_TILE_DIMENSIONS.width + 16,
            offset: (VIDEO_TILE_DIMENSIONS.width + 16) * index,
            index,
          })}
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

