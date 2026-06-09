import { MAX_VIDEOS_PER_SYNC } from "@/lib/sync-config";
import { dig, isRecord, pickString, titleFromText, toNumber, unixToIso } from "@/lib/providers/parse-utils";
import { tikhubRequest } from "@/lib/tikhub";
import type { NormalizedTikTokProfile } from "@/lib/tiktok/types";

const USER_INFO_PATH = "/api/v1/instagram/v1/fetch_user_info_by_username";
const USER_POSTS_PATH = "/api/v1/instagram/v1/fetch_user_posts";

export type InstagramScrapeResult = {
  profile: NormalizedTikTokProfile;
  apiCalls: number;
};

function parseUsername(input: string): string | null {
  const fromUrl = input.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1];
  if (fromUrl && !["p", "reel", "reels", "explore", "stories"].includes(fromUrl.toLowerCase())) {
    return fromUrl;
  }

  const bare = input.trim().match(/^@?([A-Za-z0-9._]+)$/)?.[1];
  if (bare) return bare;

  return null;
}

function extractPostList(payload: unknown): Record<string, unknown>[] {
  const list = dig(payload, [
    ["items"],
    ["data", "items"],
    ["posts"],
    ["data", "posts"],
    ["edges"],
    ["data", "edges"],
  ]);

  if (Array.isArray(list)) {
    return list
      .map((item) => (isRecord(item) && isRecord(item.node) ? item.node : item))
      .filter(isRecord);
  }
  return [];
}

function pickThumbnail(post: Record<string, unknown>): string | null {
  return pickString(
    post.thumbnail_url,
    post.display_url,
    dig(post, [
      ["image_versions2", "candidates", "0", "url"],
      ["image_versions", "items", "0", "url"],
      ["display_resources", "0", "src"],
    ]),
  );
}

export async function scrapeInstagramProfile(inputUrl: string): Promise<InstagramScrapeResult> {
  const username = parseUsername(inputUrl);
  if (!username) {
    throw new Error("请输入有效的 Instagram 主页链接或用户名，例如 https://www.instagram.com/username");
  }

  let apiCalls = 0;

  const infoPayload = await tikhubRequest<unknown>({
    path: USER_INFO_PATH,
    query: { username },
  });
  apiCalls += 1;

  const userBlock =
    (dig(infoPayload, [["user"], ["data", "user"], ["data"]]) as Record<string, unknown>) ??
    (isRecord(infoPayload) ? infoPayload : {});

  const userId = pickString(userBlock.id, userBlock.pk, userBlock.pk_id, userBlock.user_id);
  if (!userId) {
    throw new Error("无法解析 Instagram 用户 ID，请确认账号存在且为公开账号。");
  }

  const followers = toNumber(
    userBlock.follower_count ?? dig(userBlock, [["edge_followed_by", "count"]]),
  );
  const displayName = pickString(userBlock.full_name, userBlock.fullName, username) ?? username;
  const avatarUrl = pickString(userBlock.profile_pic_url_hd, userBlock.profile_pic_url, userBlock.hd_profile_pic_url_info);
  const mediaCount = toNumber(
    userBlock.media_count ?? dig(userBlock, [["edge_owner_to_timeline_media", "count"]]),
  );

  const postsPayload = await tikhubRequest<unknown>({
    path: USER_POSTS_PATH,
    query: { user_id: userId, count: MAX_VIDEOS_PER_SYNC },
  });
  apiCalls += 1;

  const posts = extractPostList(postsPayload).slice(0, MAX_VIDEOS_PER_SYNC);

  const videos = posts.map((post) => {
    const code = pickString(post.code, post.shortcode, dig(post, [["caption", "media", "code"]]));
    const id = pickString(post.id, post.pk, code) ?? "";
    const caption = pickString(post.caption_text, dig(post, [["caption", "text"]]), post.accessibility_caption);
    const likes = toNumber(
      post.like_count ?? dig(post, [["edge_liked_by", "count"], ["edge_media_preview_like", "count"]]),
    );
    const comments = toNumber(
      post.comment_count ?? dig(post, [["edge_media_to_comment", "count"]]),
    );
    const views = toNumber(post.play_count ?? post.view_count ?? post.ig_play_count ?? post.video_view_count);

    return {
      tiktokVideoId: id,
      title: titleFromText(caption, "Instagram post"),
      videoUrl: code ? `https://www.instagram.com/p/${code}/` : null,
      thumbnailUrl: pickThumbnail(post),
      viewsCount: views,
      likesCount: likes,
      commentsCount: comments,
      sharesCount: 0,
      collectsCount: 0,
      postedAt: unixToIso(post.taken_at ?? post.taken_at_timestamp ?? post.device_timestamp),
    };
  });

  const aggregatedViews = videos.reduce((sum, video) => sum + video.viewsCount, 0);

  return {
    profile: {
      platform: "instagram",
      tiktokUserId: userId,
      handle: username,
      displayName,
      profileUrl: `https://www.instagram.com/${username}/`,
      avatarUrl: avatarUrl ?? null,
      followersCount: followers,
      likesCount: videos.reduce((sum, video) => sum + video.likesCount, 0),
      videoCount: mediaCount || videos.length,
      totalViews: aggregatedViews,
      engagementRate: 0,
      videos,
    },
    apiCalls,
  };
}
