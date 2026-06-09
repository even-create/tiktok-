import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Allowlist of media CDNs we proxy (avoids SSRF to arbitrary hosts).
const ALLOWED_HOST_PATTERNS: RegExp[] = [
  // Douyin / ByteDance
  /douyinpic\.com$/,
  /douyincdn\.com$/,
  /douyinstatic\.com$/,
  /pstatp\.com$/,
  /byteimg\.com$/,
  /ibyteimg\.com$/,
  /bytecdn\.[a-z]+$/,
  /ibytedtos\.com$/,
  /amemv\.com$/,
  // TikTok
  /tiktokcdn(-[a-z]+)?\.com$/,
  /ttwstatic\.com$/,
  /muscdn\.com$/,
  /tiktokv\.com$/,
  // Xiaohongshu
  /xhscdn\.com$/,
  /xiaohongshu\.com$/,
  /sns-img[\w.-]*\.xhscdn\.com$/,
  /sns-avatar[\w.-]*\.xhscdn\.com$/,
  // Instagram / Meta
  /cdninstagram\.com$/,
  /fbcdn\.net$/,
];

function refererFor(host: string): string {
  if (host.includes("douyin") || host.includes("byte") || host.includes("pstatp") || host.includes("amemv")) {
    return "https://www.douyin.com/";
  }
  if (host.includes("xhscdn") || host.includes("xiaohongshu")) {
    return "https://www.xiaohongshu.com/";
  }
  if (host.includes("cdninstagram") || host.includes("fbcdn")) {
    return "https://www.instagram.com/";
  }
  return "https://www.tiktok.com/";
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url")?.trim();

  if (!raw) {
    return NextResponse.json({ error: "缺少图片地址" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "无效的图片地址" }, { status: 400 });
  }

  if (target.protocol !== "https:") {
    return NextResponse.json({ error: "仅支持 https 图片" }, { status: 400 });
  }

  const host = target.hostname.toLowerCase();
  if (!ALLOWED_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
    return NextResponse.json({ error: "不支持的图片来源" }, { status: 400 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        Referer: refererFor(host),
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "获取图片失败" }, { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "获取图片失败" }, { status: 502 });
  }
}
