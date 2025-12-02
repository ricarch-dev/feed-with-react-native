# High-Performance Video Feed - React Native Challenge

A high-performance vertical video feed implementation in Expo React Native, inspired by Twitter's video feed. This application demonstrates advanced rendering strategies, list virtualization, video lifecycle management, and end-to-end performance optimization for handling ~200 posts with horizontal video carousels.

## 📋 Table of Contents

- [Setup Instructions](#setup-instructions)
- [Architecture Overview](#architecture-overview)
- [Performance Strategies](#performance-strategies)
- [Prefetching Logic](#prefetching-logic)
- [Error Handling & Retry Logic](#error-handling--retry-logic)
- [Analytics](#analytics)
- [Testing Notes](#testing-notes)
- [Gaps & Areas for Improvement](#gaps--areas-for-improvement)

## 🚀 Setup Instructions

### Prerequisites

- Node.js 18+ and npm/pnpm
- Expo CLI
- iOS Simulator (for iOS testing) or Android Emulator (for Android testing)
- Physical device (recommended for performance testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd feed-with-react-native
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Install required Expo packages**
   ```bash
   npx expo install expo-video expo-image react-native-reanimated react-native-gesture-handler
   ```

4. **Start the development server**
   ```bash
   npm start
   # or
   npx expo start
   ```

5. **Run on device/simulator**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app for physical device

### Project Structure

```
feed-with-react-native/
├── app/                    # Expo Router app directory
│   ├── index.tsx          # Main feed screen
│   └── _layout.tsx        # Root layout
├── components/            # React components
│   ├── Feed.tsx           # Vertical feed container
│   ├── Post.tsx           # Individual post with horizontal carousel
│   ├── VideoTile.tsx      # Video tile wrapper with UI
│   ├── VideoPlayer.tsx    # Core video player component
│   └── template/          # Themed components
├── types/                 # TypeScript type definitions
│   └── index.ts           # Post and Video interfaces
├── utils/                 # Utility functions
│   ├── mockData.ts        # Mock data generator (~200 posts)
│   └── prefetch.ts        # Prefetching utilities
├── hooks/                 # Custom React hooks
├── constants/             # App constants
│   └── theme.ts           # Theme colors
└── README.md              # This file
```

## 🏗️ Architecture Overview

### Component Separation: Player vs. View

The architecture follows a clear separation of concerns:

1. **VideoPlayer** (`components/VideoPlayer.tsx`)
   - **Responsibility**: Video playback, lifecycle management, analytics
   - **Props**: `uri` (video URL), `isActive` (playback state)
   - **Features**:
     - Autoplay based on `isActive` prop
     - Automatic unload when inactive
     - Retry logic for errors
     - Analytics logging
   - **No UI**: Pure playback logic

2. **VideoTile** (`components/VideoTile.tsx`)
   - **Responsibility**: Video container UI, overlay information
   - **Props**: `video` (video data), `isActive` (playback state)
   - **Features**:
     - Video player wrapper
     - Title and duration overlay
     - Themed styling
   - **UI Only**: No playback logic

3. **Post** (`components/Post.tsx`)
   - **Responsibility**: Post layout, horizontal carousel management
   - **Features**:
     - Horizontal FlatList for video carousel
     - Active video detection
     - Prefetching next video
     - Post metadata (author, content, metrics)

4. **Feed** (`components/Feed.tsx`)
   - **Responsibility**: Vertical feed container, active post detection
   - **Features**:
     - Vertical FlatList for posts
     - Active post detection (100% visibility)
     - Prefetching next post
     - Virtualization optimization

### Virtualization Strategy

Both vertical and horizontal lists use React Native's `FlatList` with optimized virtualization:

**Vertical Feed:**
- `removeClippedSubviews={false}` - Keeps nearby items rendered for smooth transitions
- `maxToRenderPerBatch={2}` - Renders 2 items per batch
- `initialNumToRender={2}` - Initial render of 2 items
- `windowSize={3}` - Renders 3 screens worth of items (optimized for memory)
- `getItemLayout` - Pre-calculated layout for faster scrolling
- `itemVisiblePercentThreshold={75}` - 75% visibility for active detection
- `minimumViewTime={200}` - 200ms delay for stable detection

**Horizontal Carousel:**
- `removeClippedSubviews={false}` - Prevents visual jumps
- `maxToRenderPerBatch={2}` - Renders 2 items per batch
- `initialNumToRender={1}` - Initial render of 1 item (first video)
- `windowSize={2}` - Renders 2 screens worth of items
- `pagingEnabled` - Snap-to-page behavior
- `snapToInterval` - Precise snapping based on video tile dimensions
- `itemVisiblePercentThreshold={50}` - 50% visibility for carousel detection
- `minimumViewTime={100}` - 100ms delay for responsive detection

### Caching Strategy

Currently, the app uses:
- **No offline caching** - Videos are streamed on-demand
- **Prefetching** - Lightweight HEAD requests to validate URLs before playback
- **Memory management** - Videos are unloaded when inactive to free memory

**Future Enhancement**: Implement offline caching using `expo-file-system` or similar.

## ⚡ Performance Strategies

### 1. Memoization

All list components use `React.memo` with custom comparison functions:

- **Post**: Re-renders only when `post.id`, `isActive`, or `videos.length` changes
- **VideoTile**: Re-renders only when `video.id`, `video.url`, or `isActive` changes
- **VideoPlayer**: Re-renders only when `uri` or `isActive` changes

### 2. Hook Optimization

- **useCallback**: All event handlers and render functions are memoized
- **useMemo**: Expensive calculations (styles, formatted values) are memoized
- **useRef**: Stable references for refs and config objects

### 3. Lifecycle Management

**Video Unloading:**
- Videos are automatically unloaded when `isActive` becomes `false`
- Unload happens via `unloadAsync()` to free memory and CPU/GPU resources
- Cleanup on component unmount

**Active Detection:**
- Vertical: Post must be 100% visible to be considered active
- Horizontal: Video must be 100% visible in carousel to be active
- Only one video plays at a time (active video of active post)

### 4. Rendering Optimization

- **Component boundaries**: Clear separation prevents unnecessary re-renders
- **FlatList optimization**: Optimized batch rendering and window size
- **Style memoization**: Styles are recalculated only when theme changes

### Performance Trade-offs

1. **Memory vs. Smoothness**
   - **Trade-off**: Smaller `windowSize` reduces memory but may cause slight stutter when scrolling fast
   - **Decision**: `windowSize={5}` balances both concerns

2. **Initial Load vs. Smooth Scrolling**
   - **Trade-off**: Lower `initialNumToRender` speeds initial load but may show blank areas
   - **Decision**: `initialNumToRender={2}` prioritizes fast initial render

3. **Prefetching vs. Bandwidth**
   - **Trade-off**: Aggressive prefetching uses more bandwidth
   - **Decision**: Only prefetch next item (vertical and horizontal) to minimize bandwidth

## 🔮 Prefetching Logic

### Implementation

Prefetching uses lightweight HEAD requests to validate video URLs without downloading the full video:

**Location**: `utils/prefetch.ts`

**Strategy:**
1. **Vertical Prefetching** (Feed.tsx)
   - When a post becomes active, prefetch the first video of the next post
   - Uses `prefetchVideoMetadata()` with HEAD request
   - Timeout: 5 seconds
   - Silent failure (doesn't break app)

2. **Horizontal Prefetching** (Post.tsx)
   - When a video becomes active, prefetch the next video in the carousel
   - Same implementation as vertical prefetching
   - Only prefetches if next video exists

### Prefetching Heuristics

- **Depth**: Only prefetch 1 item ahead (next post/video)
- **Timing**: Prefetch happens immediately when item becomes active
- **Concurrency**: Limited to 3 concurrent prefetch requests
- **Failure Handling**: Silent failure - prefetching is optional

### Configuration

Prefetching can be configured via `PrefetchOptions`:
- `timeout`: Request timeout (default: 5000ms)
- Future: Feature flags for prefetch depth and behavior

## 🛡️ Error Handling & Retry Logic

### Error Types Handled

1. **Network Errors**
   - Connection failures
   - Timeout errors
   - Invalid URLs

2. **Player Initialization Failures**
   - Video format not supported
   - Codec errors
   - Resource loading failures

3. **Playback Errors**
   - Buffering failures
   - Decoding errors
   - Stream interruptions

### Retry Strategy

**Implementation**: `components/VideoPlayer.tsx`

**Retry Logic:**
- **Max Retries**: 3 attempts
- **Retry Delay**: 2 seconds between attempts
- **Retry Methods**:
  - Playback errors: `player.replay()` (expo-video)
  - Initialization errors: `player.replaceAsync(uri)` (expo-video)
- **State Management**: Tracks retry count and error state
- **Logging**: All retry attempts are logged for analytics

**Error States:**
- Shows loading indicator during retry
- Logs error after max retries reached
- Gracefully degrades (doesn't crash app)

### Error Recovery

- Automatic retry on transient errors
- Manual recovery: User can tap to pause/resume
- State reset when video becomes active again

## 📊 Analytics

### Events Logged

All analytics events are logged to console with `[VideoAnalytics]` prefix:

1. **playback_start**
   - Triggered: When video starts playing
   - Data: `{ uri, timestamp, positionMillis }`

2. **playback_complete**
   - Triggered: When video finishes playing
   - Data: `{ uri, timestamp, durationMillis }`

3. **time_to_first_frame** (TTFF)
   - Triggered: First frame rendered
   - Data: `{ uri, timestamp, ms }` (milliseconds from mount)

4. **playback_error**
   - Triggered: On playback errors
   - Data: `{ uri, timestamp, error }`

5. **video_unloaded**
   - Triggered: When video is unloaded
   - Data: `{ uri, timestamp, reason }`

6. **retry_success / retry_failed**
   - Triggered: During retry attempts
   - Data: `{ uri, timestamp, attempt }`

### Analytics Implementation

**Location**: `components/VideoPlayer.tsx`

**Method**: Console logging (can be replaced with analytics service)

**Future Enhancement**: Integrate with analytics service (Firebase, Amplitude, etc.)

## 🧪 Testing Notes

### Device Models Tested

**Development Environment:**
- **OS**: Windows 10 (Build 22631)
- **Development**: Expo SDK 54, React Native 0.81.5
- **Testing**: Expo Go app for real-time testing

**Recommended Testing Devices:**
- iOS: iPhone 12/13 (mid-tier), iPhone 14 Pro (high-end)
- Android: Pixel 5/6 (mid-tier), Samsung Galaxy S21 (high-end)

**Note**: For production deployment, test on actual mid-tier devices to validate 60 FPS target.

### Performance Behavior

**Target**: ~60 FPS on mid-tier devices

**Optimizations Applied:**
- Virtualization with optimized window size
- Memoization to prevent unnecessary re-renders
- Video unloading to free resources
- Prefetching to reduce perceived load time

**Bottlenecks Addressed:**

1. **Initial Render**
   - Reduced `initialNumToRender` to 2
   - Memoized styles and callbacks
   - Lazy video loading

2. **Scroll Performance**
   - Optimized `windowSize` and `maxToRenderPerBatch`
   - Used `getItemLayout` for faster scrolling
   - Removed clipped subviews

3. **Memory Management**
   - Automatic video unloading
   - Limited prefetching depth
   - Component memoization

4. **Video Playback**
   - Only one video active at a time
   - Unload inactive videos immediately
   - Retry logic for errors

### Performance Metrics to Monitor

- FPS during scrolling
- Memory usage with 200 posts
- Time to first frame (TTFF)
- Network bandwidth usage
- Battery consumption

## 🎁 Bonus Features Implemented

Beyond the core requirements, this implementation includes several enhancements:

### 1. Video Cache System
**Location**: `utils/videoCache.ts`

- Tracks viewed videos and completion status
- In-memory cache with automatic cleanup (max 100 entries)
- Features:
  - `hasBeenWatched(url)` - Check if video was viewed
  - `isFullyWatched(url)` - Check if video was completed
  - `markAsWatched(url, position, duration)` - Update watch status
  - Visual badges on video tiles showing watch status

### 2. Lazy Loading Thumbnails
**Location**: `components/VideoTile.tsx`

- Progressive image loading with `expo-image`
- Blurhash placeholders for smooth transitions
- Fallback placeholder when no thumbnail available
- Reduces initial bandwidth and improves perceived performance

### 3. Enhanced UI/UX
- **Play/Pause Overlay**: Animated icons on video tap
- **Loading Indicators**: Visible, styled loading states
- **Theme Support**: Light/dark mode with `useColorScheme`
- **Navigation**: Top navbar (logo, menu, search) and bottom navbar (5 icons)
- **Scroll-Reactive UI**: Bottom navbar hides on scroll down, shows on scroll up

### 4. Gesture Handler Integration
**Location**: `components/Feed.tsx`

- `react-native-gesture-handler` for precise scroll detection
- Tracks scroll direction for UI animations
- Better scroll performance and responsiveness

### 5. Advanced Analytics
- Tracks video cache hits (`hasBeenWatched` in logs)
- Detailed prefetch logging
- Retry attempt tracking
- Position tracking for resume functionality

## 🔍 Gaps & Areas for Improvement

### Current Limitations

1. **No Offline Caching**
   - Videos are not cached for offline viewing
   - **Enhancement**: Implement caching using `expo-file-system` or `react-native-fs`

2. **No Adaptive Bitrate**
   - Videos use single quality/bitrate
   - **Enhancement**: Implement adaptive bitrate selection based on network conditions

3. **Basic Error UI**
   - Error states show only loading indicator
   - **Enhancement**: Add user-friendly error messages and retry buttons

4. **Fixed Prefetch Depth**
   - Prefetch depth is hardcoded to 1
   - **Enhancement**: Make configurable via feature flags

5. **No Scroll Velocity Detection**
   - Doesn't pause videos during fast scrolling
   - **Enhancement**: Implement velocity-based pausing

### Future Enhancements

1. **Offline Caching**
   - Cache videos after first watch
   - Implement cache size limits
   - Cache eviction policies

2. **Adaptive Bitrate**
   - Detect network conditions
   - Select appropriate video quality
   - Smooth quality transitions

3. **Feature Flags**
   - Configurable prefetch depth
   - Toggle prefetching on/off
   - Adjustable retry attempts

4. **Intelligent Heuristics**
   - Pause on high scroll velocity
   - Prefetch based on user behavior
   - Predictive prefetching

5. **Advanced Analytics**
   - Integration with analytics service
   - Performance metrics dashboard
   - User engagement tracking

6. **Accessibility**
   - Screen reader support
   - Keyboard navigation
   - High contrast mode

## 📝 Video Sources

The app uses publicly available test videos from:
- **Pexels**: High-quality royalty-free videos
  - `https://videos.pexels.com/video-files/...`
- **Google GTV Sample Bucket**: Standard test videos
  - `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/`

**Video Pool**: 10 unique video URLs to minimize conflicts and improve caching

**Data Generation**: 
- ~200 posts generated with varied metadata
- Each post contains 1-5 videos in a horizontal carousel
- Randomized usernames, content, timestamps, and metrics
- Videos are rotated to create diverse content

**Approach**: Small set of video URLs rotated with different metadata (usernames, content, metrics) to simulate a large feed without requiring 200+ unique videos.

**Implementation**: `utils/mockData.ts`

## 🎯 Requirements Checklist

✅ **Vertical Feed of Posts**
- ✅ Vertically scrolling feed using FlatList
- ✅ Only fully visible post is "active"
- ✅ Inactive posts pause/unload video resources

✅ **Horizontal Video Carousel**
- ✅ Horizontally scrollable list of videos per post
- ✅ Autoplay only currently visible video tile
- ✅ Pause and unload non-visible videos

✅ **Prefetching**
- ✅ Prefetch next post in vertical feed
- ✅ Prefetch next video in horizontal carousel
- ✅ Optimized for memory and bandwidth

✅ **Performance & Smoothness**
- ✅ Target ~60 FPS optimizations
- ✅ Re-render management with memoization
- ✅ Component boundaries optimized
- ✅ Virtualization configured
- ✅ Player lifecycle managed

✅ **Error Handling**
- ✅ Network errors handled
- ✅ Player initialization failures handled
- ✅ Playback errors handled
- ✅ Retry logic implemented

✅ **Analytics Hooks**
- ✅ Playback start logged
- ✅ Playback completion logged
- ✅ Errors logged
- ✅ Time-to-first-frame logged

✅ **Documentation**
- ✅ Setup instructions
- ✅ Architecture overview
- ✅ Performance strategies explained
- ✅ Prefetching logic documented
- ✅ Gaps and improvements listed

## 📄 License

This project is part of a coding challenge and is provided as-is.

## 👤 Author

Built as part of a React Native engineering challenge.

---

**Note**: This implementation focuses on core requirements. Optional enhancements can be added based on specific needs and priorities.
