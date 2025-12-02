import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Menu, Search } from 'lucide-react-native';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../template/themed-text';
import { ThemedView } from '../template/themed-view';

interface NavbarProps {
  onMenuPress?: () => void;
  onSearchPress?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onMenuPress, 
  onSearchPress 
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const handleMenuPress = () => {
    if (onMenuPress) {
      onMenuPress();
    } else {
      //TODO: Default behavior: log to console
      console.log('[Navbar] Menu pressed');
    }
  };

  const handleSearchPress = () => {
    if (onSearchPress) {
      onSearchPress();
    } else {
      //TODO: Default behavior: log to console
      console.log('[Navbar] Search pressed');
    }
  };

  return (
    <ThemedView 
      style={[
        styles.container,
        { 
          paddingTop: insets.top,
          backgroundColor: colors.background,
          borderBottomColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)',
        }
      ]}
    >
      {/* Left: Menu Icon */}
      <Pressable 
        style={styles.iconButton}
        onPress={handleMenuPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Menu size={24} color={colors.icon} />
      </Pressable>

      {/* Center: Logo */}
      <View style={styles.logoContainer}>
        <ThemedText style={styles.logoText}>Feed</ThemedText>
      </View>

      {/* Right: Search Icon */}
      <Pressable 
        style={styles.iconButton}
        onPress={handleSearchPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Search size={24} color={colors.icon} />
      </Pressable>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    minHeight: 56,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

