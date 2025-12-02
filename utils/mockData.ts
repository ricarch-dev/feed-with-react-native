import { Post, Video } from '@/types';

// Sample video URLs - using publicly available test videos
const SAMPLE_VIDEO_URLS = [
  'https://videos.pexels.com/video-files/30280414/12980115_1440_2560_25fps.mp4',
  'https://videos.pexels.com/video-files/5532771/5532771-sd_226_426_25fps.mp4',
  'https://videos.pexels.com/video-files/30043254/12887771_1080_1920_30fps.mp4',
  'https://videos.pexels.com/video-files/28836213/12491352_1440_2560_30fps.mp4',
  'https://videos.pexels.com/video-files/29842217/12815329_1080_1920_30fps.mp4',
  'https://videos.pexels.com/video-files/5863152/5863152-sd_240_426_29fps.mp4',
  'https://videos.pexels.com/video-files/5532765/5532765-uhd_2160_4096_25fps.mp4',
  'https://videos.pexels.com/video-files/30129754/12920666_1440_2560_30fps.mp4',
  'https://videos.pexels.com/video-files/28728787/12464794_1080_1920_30fps.mp4',
  'https://videos.pexels.com/video-files/4620573/4620573-sd_226_426_25fps.mp4',
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
  const videoCount = randomInt(1, 5); // Each post has 1-5 videos
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
 * Generates mock data for approximately 200 posts
 */
export function generateMockPosts(count: number = 200): Post[] {
  const posts: Post[] = [];
  for (let i = 0; i < count; i++) {
    posts.push(generatePost(i));
  }
  return posts;
}

