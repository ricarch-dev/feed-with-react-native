import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Heart, Home, MessageCircle, PlusSquare, User } from 'lucide-react-native';
import React from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedView } from '../template/themed-view';

interface BottomNavbarProps {
  isVisible?: boolean;
}

export const BottomNavbar: React.FC<BottomNavbarProps> = ({ isVisible = true }) => {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  // Animated value for translateY
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withTiming(
      isVisible ? 0 : 100,
      {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      }
    );
  }, [isVisible, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const handleIconPress = (iconName: string) => {
    //TODO: Placeholder for future functionality
    console.log(`[BottomNavbar] ${iconName} pressed`);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        {
          paddingBottom: insets.bottom,
          backgroundColor: colors.background,
          borderTopColor: colorScheme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)',
        }
      ]}
    >
      <ThemedView style={styles.navContainer}>
        {/* Home */}
        <Pressable
          style={styles.iconButton}
          onPress={() => handleIconPress('Home')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Home size={24} color={colors.icon} strokeWidth={2} />
        </Pressable>

        {/* Message */}
        <Pressable
          style={styles.iconButton}
          onPress={() => handleIconPress('Message')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MessageCircle size={24} color={colors.icon} strokeWidth={2} />
        </Pressable>

        {/* Add Post */}
        <Pressable
          style={styles.iconButton}
          onPress={() => handleIconPress('AddPost')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <PlusSquare size={24} color={colors.icon} strokeWidth={2} />
        </Pressable>

        {/* Activity */}
        <Pressable
          style={styles.iconButton}
          onPress={() => handleIconPress('Activity')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Heart size={24} color={colors.icon} strokeWidth={2} />
        </Pressable>

        {/* Profile */}
        <Pressable
          style={styles.iconButton}
          onPress={() => handleIconPress('Profile')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <User size={24} color={colors.icon} strokeWidth={2} />
        </Pressable>
      </ThemedView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  navContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingTop: 12,
    minHeight: 56,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
});

