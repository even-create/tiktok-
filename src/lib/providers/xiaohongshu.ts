import { MAX_VIDEOS_PER_SYNC } from "@/lib/sync-config";
import { dig, isRecord, pickString, titleFromText, toNumber, unixToIso } from "@/lib/providers/parse-utils";
import { tikhubRequest } from "@/lib/tikhub";
import type { NormalizedTikTokProfile } from "@/lib/tiktok/types";

const USER_INFO_PATH = "/api/v1/xiaohongshu/app_v2/get_user_info";
const USER_NOTES_PATH = "/api/v1/xiaohongshu/app/get_user_notes";

export type XiaohongshuScrapeResult = {
  profile: NormalizedTikTokProfile;
  apiCalls: number;
};

function parseUserId(input: string): string | null {
  const fromUrl = input.match(/xiaohongshu\.com\/user\/profile\/([a-z0-9]+)/i)?.[1];
  if (fromUrl) return fromUrl;

  const bare = input.trim().match(/^[a-f0-9]{24}$/i)?.[0];
  if (bare) return bare;

  return null;
}

function extractNoteList(payload: unknown): Record<string, unknown>[] {
  const list = dig(payload, [
    ["notes"],
    ["data", "notes"],
    ["note_list"],
    ["data", "note_list"],
    ["items"],
    ["data", "items"],
  ]);

  if (Array.isArray(list)) return list.filter(isRecord);
  return [];
}

function pickCover(note: Record<string, unknown>): string | null {
  return pickString(
    dig(note, [
      ["cover", "url_default"],
      ["cover", "url"],
      ["cover", "info_list", "0", "url"],
      ["image_list", "0", "url"],
      ["images_list", "0", "url"],
    ]),
    note.cover,
  );
}

export async function scrapeXiaohongshuProfile(inputUrl: string): Promise<XiaohongshuScrapeResult> {
  let apiCalls = 0;
  let userId = parseUserId(inputUrl);

  const infoPayload = await tikhubRequest<unknown>({
    path: USER_INFO_PATH,
    query: userId ? { user_id: userId } : { share_text: inputUrl.trim() },
  });
  apiCalls += 1;

  const userBlock =
    (dig(infoPayload, [["basic_info"], ["user"], ["data", "user"], ["data"]]) as Record<string, unknown>) ??
    (isRecord(infoPayload) ? infoPayload : {});

  userId =
    userId ??
    pickString(userBlock.user_id, userBlock.userId, userBlock.id, dig(infoPayload, [["user_id"]]));

  if (!userId) {
    throw new Error("无法解析小红书用户，请粘贴用户主页链接或分享链接。");
  }

  const interactions = dig(infoPayload, [["interactions"]]);
  const findInteraction = (type: string): number => {
    if (Array.isArray(interactions)) {
      const match = interactions.find(
        (item) => isRecord(item) && (item.type === type || item.name === type),
      );
      if (isRecord(match)) return toNumber(match.count);
    }
    return 0;
  };

  const followers = toNumber(
    userBlock.fans ??
      userBlock.fans_count ??
      userBlock.follower_count ??
      dig(infoPayload, [["fans"]]) ??
      findInteraction("fans"),
  );

  const totalLikes = toNumber(
    userBlock.liked ??
      userBlock.liked_count ??
      userBlock.likes ??
      findInteraction("liked") ??
      findInteraction("interaction"),
  );

  const handle =
    pickString(userBlock.red_id, userBlock.redId, userBlock.red_official_verify_name, userId) ?? userId;
  const displayName = pickString(userBlock.nickname, userBlock.nick_name, userBlock.name, handle) ?? handle;
  const avatarUrl = pickString(
    userBlock.images,
    userBlock.avatar,
    dig(userBlock, [["image"], ["imageb"]]),
  );

  const notesPayload = await tikhubRequest<unknown>({
    path: USER_NOTES_PATH,
    query: { user_id: userId },
  });
  apiCalls += 1;

  const notes = extractNoteList(notesPayload).slice(0, MAX_VIDEOS_PER_SYNC);

  const videos = notes.map((note) => {
    const noteId =
      pickString(note.note_id, note.noteId, note.id) ??
      pickString(dig(note, [["note", "id"]])) ??
      "";
    const title = pickString(note.display_title, note.title, note.desc, note.name);
    const likes = toNumber(
      note.liked_count ??
        note.likes ??
        note.like_count ??
        dig(note, [["interact_info", "liked_count"]]),
    );

    return {
      tiktokVideoId: noteId,
      title: titleFromText(title, "小红书笔记"),
      videoUrl: noteId ? `https://www.xiaohongshu.com/explore/${noteId}` : null,
      thumbnailUrl: pickCover(note),
      viewsCount: toNumber(note.view_count ?? note.viewed_count ?? dig(note, [["interact_info", "view_count"]])),
      likesCount: likes,
      commentsCount: toNumber(note.comment_count ?? dig(note, [["interact_info", "comment_count"]])),
      sharesCount: toNumber(note.share_count ?? dig(note, [["interact_info", "share_count"]])),
      collectsCount: toNumber(note.collected_count ?? dig(note, [["interact_info", "collected_count"]])),
      postedAt: unixToIso(note.time ?? note.create_time ?? note.timestamp),
    };
  });

  const aggregatedViews = videos.reduce((sum, video) => sum + video.viewsCount, 0);

  return {
    profile: {
      platform: "xiaohongshu",
      tiktokUserId: userId,
      handle,
      displayName,
      profileUrl: `https://www.xiaohongshu.com/user/profile/${userId}`,
      avatarUrl: avatarUrl ?? null,
      followersCount: followers,
      likesCount: totalLikes,
      videoCount: toNumber(userBlock.notes ?? userBlock.note_count ?? findInteraction("note")) || videos.length,
      totalViews: aggregatedViews,
      engagementRate: 0,
      videos,
    },
    apiCalls,
  };
}
