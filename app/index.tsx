import { Feed } from '@/components/Feed';
import { BottomNavbar } from '@/components/layout/BottomNavbar';
import { Navbar } from '@/components/layout/Navbar';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { generateMockPosts } from '@/utils/mockData';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme ?? 'light'].background;
  const [isBottomNavbarVisible, setIsBottomNavbarVisible] = useState(true);

  // Generate mock posts - memoized to avoid regenerating on every render
  const posts = useMemo(() => generateMockPosts(200), []);

  const handleMenuPress = () => {
    // TODO: Implement menu functionality
    console.log('Menu button pressed');
  };

  const handleSearchPress = () => {
    // TODO: Implement search functionality
    console.log('Search button pressed');
  };

  const handleScrollDirectionChange = useCallback((direction: 'up' | 'down') => {
    // Show navbar when scrolling up, hide when scrolling down
    setIsBottomNavbarVisible(direction === 'up');
  }, []);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Navbar 
        onMenuPress={handleMenuPress}
        onSearchPress={handleSearchPress}
      />
      <Feed 
        posts={posts} 
        onScrollDirectionChange={handleScrollDirectionChange}
      />
      <BottomNavbar isVisible={isBottomNavbarVisible} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
