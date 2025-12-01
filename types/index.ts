export interface Video {
  id: string;
  url: string;
  thumbnail?: string;
  duration?: number;
  title?: string;
}

export interface Post {
  id: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
  content: string;
  videos: Video[];
  timestamp: number;
  likes: number;
  comments: number;
  shares: number;
}

