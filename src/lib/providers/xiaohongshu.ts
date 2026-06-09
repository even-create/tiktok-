import { MAX_VIDEOS_PER_SYNC } from "@/lib/sync-config";
import { dig, isRecord, pickString, titleFromText, toNumber, unixToIso } from "@/lib/providers/parse-utils";
import { tikhubRequest } from "@/lib/tikhub";
import type { NormalizedTikTokProfile } from "@/lib/tiktok/types";

const USER_INFO_PATH = "/api/v1/xiaohongshu/app_v2/get_user_info";
const USER_NOTES_PATH = "/api/v1/xiaohongshu/app/get_user_notes";
// Per-note detail endpoints carry engagement data (views/comments/collects/time)
// that the list endpoint omits. One request per note (billed each).
const VIDEO_NOTE_DETAIL_PATH = "/api/v1/xiaohongshu/app_v2/get_video_note_detail";
const IMAGE_NOTE_DETAIL_PATH = "/api/v1/xiaohongshu/app_v2/get_image_note_detail";

export type XiaohongshuScrapeResult = {
  profile: NormalizedTikTokProfile;
  apiCalls: number;
};

type NoteDetail = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  collects: number;
  postedAt: string | null;
};

function isVideoNote(note: Record<string, unknown>): boolean {
  const type = pickString(note.type, note.note_type, dig(note, [["note", "type"]]));
  return type === "video" || type === "1";
}

/** Pull the view/play count out of an XHS note detail payload (field name varies). */
function extractViews(root: Record<string, unknown>, interact: Record<string, unknown> | null): number {
  const candidates = [
    interact?.view_count,
    interact?.viewed_count,
    interact?.read_count,
    interact?.play_count,
    interact?.video_play_count,
    root.view_count,
    root.viewed_count,
    root.read_count,
    root.play_count,
    dig(root, [
      ["video", "consume", "view_count"],
      ["video", "consume", "played_count"],
      ["video", "consume", "play_count"],
      ["page_info", "view_count"],
      ["page_info", "views"],
    ]),
  ];

  for (const candidate of candidates) {
    const value = toNumber(candidate);
    if (value > 0) return value;
  }
  return 0;
}

async function fetchNoteDetail(noteId: string, video: boolean): Promise<NoteDetail | null> {
  const payload = await tikhubRequest<unknown>({
    path: video ? VIDEO_NOTE_DETAIL_PATH : IMAGE_NOTE_DETAIL_PATH,
    query: { note_id: noteId },
  });

  const root =
    (dig(payload, [["note"], ["data", "note"], ["note_detail"], ["data"]]) as Record<string, unknown>) ??
    (isRecord(payload) ? payload : null);
  if (!root) return null;

  const interact =
    (dig(root, [["interact_info"], ["interactInfo"]]) as Record<string, unknown> | undefined) ?? null;

  return {
    views: extractViews(root, interact),
    likes: toNumber(interact?.liked_count ?? root.liked_count ?? root.likes),
    comments: toNumber(interact?.comment_count ?? root.comment_count ?? root.comments_count),
    shares: toNumber(interact?.share_count ?? root.share_count ?? root.shared_count),
    collects: toNumber(interact?.collected_count ?? root.collected_count ?? root.collects),
    postedAt: unixToIso(root.time ?? root.create_time ?? root.last_update_time ?? interact?.time),
  };
}

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
  let detailCalls = 0;
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

  const videos = await Promise.all(
    notes.map(async (note) => {
      const noteId =
        pickString(note.note_id, note.noteId, note.id) ??
        pickString(dig(note, [["note", "id"]])) ??
        "";
      const title = pickString(note.display_title, note.title, note.desc, note.name);

      // List-level values (always present).
      let views = toNumber(note.view_count ?? note.viewed_count ?? dig(note, [["interact_info", "view_count"]]));
      let likes = toNumber(
        note.liked_count ?? note.likes ?? note.like_count ?? dig(note, [["interact_info", "liked_count"]]),
      );
      let comments = toNumber(note.comment_count ?? dig(note, [["interact_info", "comment_count"]]));
      let shares = toNumber(note.share_count ?? dig(note, [["interact_info", "share_count"]]));
      let collects = toNumber(note.collected_count ?? dig(note, [["interact_info", "collected_count"]]));
      let postedAt = unixToIso(note.time ?? note.create_time ?? note.timestamp);

      // Enrich with the note detail endpoint (carries views / publish time / etc.).
      if (noteId) {
        try {
          const detail = await fetchNoteDetail(noteId, isVideoNote(note));
          detailCalls += 1;
          if (detail) {
            if (detail.views > 0) views = detail.views;
            if (detail.likes > 0) likes = detail.likes;
            if (detail.comments > 0) comments = detail.comments;
            if (detail.shares > 0) shares = detail.shares;
            if (detail.collects > 0) collects = detail.collects;
            if (!postedAt && detail.postedAt) postedAt = detail.postedAt;
          }
        } catch (error) {
          console.warn(`[xiaohongshu] note detail failed for ${noteId}`, error);
        }
      }

      return {
        tiktokVideoId: noteId,
        title: titleFromText(title, "小红书笔记"),
        videoUrl: noteId ? `https://www.xiaohongshu.com/explore/${noteId}` : null,
        thumbnailUrl: pickCover(note),
        viewsCount: views,
        likesCount: likes,
        commentsCount: comments,
        sharesCount: shares,
        collectsCount: collects,
        postedAt,
      };
    }),
  );

  apiCalls += detailCalls;

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
