import { MAX_VIDEOS_PER_SYNC } from "@/lib/sync-config";
import { dig, isRecord, pickString, titleFromText, toNumber, unixToIso } from "@/lib/providers/parse-utils";
import { tikhubRequest } from "@/lib/tikhub";
import type { NormalizedTikTokProfile } from "@/lib/tiktok/types";

const USER_PROFILE_PATH = "/api/v1/reddit/app/fetch_user_profile";
const USER_POSTS_PATH = "/api/v1/reddit/app/fetch_user_posts";

export type RedditScrapeResult = {
  profile: NormalizedTikTokProfile;
  apiCalls: number;
};

function parseUsername(input: string): string | null {
  const fromUserUrl = input.match(/reddit\.com\/(?:user|u)\/([A-Za-z0-9_-]+)/i)?.[1];
  if (fromUserUrl) return fromUserUrl;

  const bare = input.trim().match(/^u\/([A-Za-z0-9_-]+)$/i)?.[1];
  if (bare) return bare;

  const handle = input.trim().match(/^@?([A-Za-z0-9_-]{2,})$/);
  if (handle && !input.includes("/") && !input.includes(".")) {
    return handle[1];
  }

  return null;
}

function extractPostList(payload: unknown): Record<string, unknown>[] {
  const list = dig(payload, [
    ["posts"],
    ["items"],
    ["data", "posts"],
    ["data", "items"],
    ["data", "children"],
    ["children"],
  ]);

  if (Array.isArray(list)) {
    return list
      .map((item) => (isRecord(item) && isRecord(item.data) ? item.data : item))
      .filter(isRecord);
  }

  return [];
}

function pickPostThumbnail(post: Record<string, unknown>): string | null {
  const direct = pickString(post.thumbnail, post.thumbnail_url, post.thumbnailUrl);
  if (direct && !["self", "default", "nsfw", "spoiler", "image"].includes(direct)) {
    return direct;
  }

  return pickString(
    dig(post, [
      ["preview", "images", "0", "source", "url"],
      ["preview", "images", "0", "resolutions", "0", "url"],
      ["media", "thumbnail"],
      ["media_metadata", "0", "s", "u"],
    ]),
  );
}

function buildPostUrl(post: Record<string, unknown>, username: string): string | null {
  const permalink = pickString(post.permalink, post.url);
  if (permalink?.startsWith("http")) return permalink;
  if (permalink?.startsWith("/")) return `https://www.reddit.com${permalink}`;

  const id = pickString(post.id, post.name)?.replace(/^t3_/, "");
  if (id) return `https://www.reddit.com/user/${username}/comments/${id}`;

  return null;
}

export async function scrapeRedditProfile(inputUrl: string): Promise<RedditScrapeResult> {
  const username = parseUsername(inputUrl);
  if (!username) {
    throw new Error("请输入有效的 Reddit 用户链接或用户名，例如 https://www.reddit.com/user/spez");
  }

  let apiCalls = 0;

  const profilePayload = await tikhubRequest<unknown>({
    path: USER_PROFILE_PATH,
    query: { username, need_format: true },
  });
  apiCalls += 1;

  const profileBlock =
    (dig(profilePayload, [["profile"], ["user"], ["data", "profile"], ["data", "user"], ["data"]]) as Record<
      string,
      unknown
    >) ?? (isRecord(profilePayload) ? profilePayload : {});

  const userId = pickString(profileBlock.id, profileBlock.user_id, profileBlock.userId, username) ?? username;
  const displayName = pickString(profileBlock.display_name, profileBlock.displayName, profileBlock.title, username) ?? username;
  const avatarUrlRaw = pickString(
    profileBlock.icon_img,
    profileBlock.iconImg,
    profileBlock.avatar,
    profileBlock.snoovatar_img,
    profileBlock.snoovatarImg,
  );
  const avatarUrl = avatarUrlRaw?.replace(/&amp;/g, "&") ?? null;

  const followers = toNumber(
    profileBlock.followers ??
      profileBlock.follower_count ??
      profileBlock.followerCount ??
      dig(profileBlock, [["subscribers"], ["profile", "followers"]]),
  );

  const totalKarma = toNumber(
    profileBlock.total_karma ??
      profileBlock.totalKarma ??
      profileBlock.karma ??
      (toNumber(profileBlock.link_karma) + toNumber(profileBlock.comment_karma)),
  );

  const postsPayload = await tikhubRequest<unknown>({
    path: USER_POSTS_PATH,
    query: { username, sort: "NEW", need_format: true },
  });
  apiCalls += 1;

  const posts = extractPostList(postsPayload).slice(0, MAX_VIDEOS_PER_SYNC);

  const videos = posts.map((post) => {
    const postId = pickString(post.id, post.name, post.post_id)?.replace(/^t3_/, "") ?? "";
    const title = titleFromText(
      pickString(post.title, post.headline, dig(post, [["post", "title"]])),
      "Reddit post",
    );
    const likes = toNumber(post.ups ?? post.score ?? post.upvote_count ?? post.upvoteCount ?? post.likes);
    const comments = toNumber(post.num_comments ?? post.comment_count ?? post.commentCount ?? post.comments);

    return {
      tiktokVideoId: postId || title,
      title,
      videoUrl: buildPostUrl(post, username),
      thumbnailUrl: pickPostThumbnail(post),
      viewsCount: 0,
      likesCount: likes,
      commentsCount: comments,
      sharesCount: 0,
      collectsCount: 0,
      postedAt: unixToIso(post.created_utc ?? post.created ?? post.created_at ?? post.createdAt),
    };
  });

  const aggregatedLikes = videos.reduce((sum, video) => sum + video.likesCount, 0);

  return {
    profile: {
      platform: "reddit",
      tiktokUserId: userId,
      handle: username,
      displayName,
      profileUrl: `https://www.reddit.com/user/${username}/`,
      avatarUrl: avatarUrl ?? null,
      followersCount: followers,
      likesCount: aggregatedLikes || totalKarma,
      videoCount: videos.length,
      totalViews: 0,
      engagementRate: 0,
      videos,
    },
    apiCalls,
  };
}
