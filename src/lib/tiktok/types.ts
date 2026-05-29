export type UnifiedTikTokAuthor = {
  id: string | null;
  handle: string;
  displayName: string;
  profileUrl: string;
  avatarUrl: string | null;
  followers: number;
  likes: number;
  videoCount: number;
};

export type UnifiedTikTokVideo = {
  id: string;
  title: string;
  url: string | null;
  thumbnailUrl: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  postedAt: string | null;
};

/** Normalized profile payload consumed by Supabase storage (UI-agnostic). */
export type NormalizedTikTokProfile = {
  tiktokUserId: string | null;
  handle: string;
  displayName: string;
  profileUrl: string;
  avatarUrl: string | null;
  followersCount: number;
  likesCount: number;
  videoCount: number;
  totalViews: number;
  engagementRate: number;
  videos: Array<{
    tiktokVideoId: string;
    title: string;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    viewsCount: number;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    postedAt: string | null;
  }>;
};

export type UnifiedTikTokAccountData = {
  author: UnifiedTikTokAuthor;
  videos: UnifiedTikTokVideo[];
};
