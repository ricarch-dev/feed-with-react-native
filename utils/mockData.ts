import { Post, Video } from '@/types';

// Sample video URLs - using publicly available test videos
// Using ONLY SD (Standard Definition) videos for better Android compatibility
// These are lower resolution but load much faster and use less memory
// All URLs verified to be publicly accessible (no 403 errors)
const SAMPLE_VIDEO_URLS = [
  'https://videos.pexels.com/video-files/5532771/5532771-sd_226_426_25fps.mp4',      
  'https://videos.pexels.com/video-files/5863152/5863152-sd_240_426_29fps.mp4',      
  'https://videos.pexels.com/video-files/4620573/4620573-sd_226_426_25fps.mp4',      
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', 
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', 
];

const SAMPLE_USERNAMES = [
  'johndoe',
  'janedoe',
  'techguru',
  'videolover',
  'contentcreator',
  'socialmedia',
  'trendingnow',
  'viralvideos',
  'entertainment',
  'dailyfeed',
];

const SAMPLE_CONTENT = [
  'Check out this amazing video! 🎬',
  'Just discovered this gem 💎',
  'Can\'t stop watching this 🔥',
  'This is incredible! 👏',
  'Must watch! ⭐',
  'So cool! 😎',
  'Love this content! ❤️',
  'Amazing work! 🙌',
  'This is trending! 📈',
  'Great find! 🎯',
];

/**
 * Generates a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random video from the sample pool
 */
function generateVideo(videoIndex: number): Video {
  const urlIndex = videoIndex % SAMPLE_VIDEO_URLS.length;
  return {
    id: `video-${videoIndex}`,
    url: SAMPLE_VIDEO_URLS[urlIndex],
    thumbnail: undefined, // Will be added later
    duration: randomInt(10, 120), // Random duration between 10-120 seconds
    title: `Video ${videoIndex + 1}`,
  };
}

/**
 * Generates a post with a horizontal carousel of videos
 */
function generatePost(postIndex: number): Post {
  const videoCount = randomInt(1, 4); // Each post has 1-4 videos
  const videos: Video[] = [];
  
  for (let i = 0; i < videoCount; i++) {
    videos.push(generateVideo(postIndex * 10 + i));
  }

  const usernameIndex = postIndex % SAMPLE_USERNAMES.length;
  const contentIndex = postIndex % SAMPLE_CONTENT.length;

  return {
    id: `post-${postIndex}`,
    author: {
      id: `user-${usernameIndex}`,
      username: SAMPLE_USERNAMES[usernameIndex],
      avatar: undefined, // Will be added later
    },
    content: SAMPLE_CONTENT[contentIndex],
    videos,
    timestamp: Date.now() - randomInt(0, 7 * 24 * 60 * 60 * 1000), // Random time in last 7 days
    likes: randomInt(0, 10000),
    comments: randomInt(0, 500),
    shares: randomInt(0, 200),
  };
}

/**
 * Generates mock data for posts
 * Using SD (Standard Definition) videos for optimal Android performance
 * Full 200 posts supported on both iOS and Android with SD videos
 */
export function generateMockPosts(count: number = 200): Post[] {
  const posts: Post[] = [];
  for (let i = 0; i < count; i++) {
    posts.push(generatePost(i));
  }
  return posts;
}

