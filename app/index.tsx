import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Feed } from '@/components/Feed';
import { generateMockPosts } from '@/utils/mockData';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme ?? 'light'].background;

  // Generate mock posts - memoized to avoid regenerating on every render
  const posts = useMemo(() => generateMockPosts(200), []);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Feed posts={posts} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
