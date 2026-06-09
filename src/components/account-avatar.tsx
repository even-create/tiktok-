"use client";

import { useEffect, useState } from "react";

type AccountAvatarProps = {
  name: string;
  avatarUrl: string | null;
  initialsText: string;
  className?: string;
};

const PROXY_FIRST_HOSTS = /douyinpic\.com|douyincdn\.com|byteimg\.com|ibyteimg\.com|pstatp\.com|xhscdn\.com|cdninstagram\.com|fbcdn\.net$/i;

function needsProxyFirst(url: string): boolean {
  try {
    return PROXY_FIRST_HOSTS.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Douyin API often stores .heic first; browsers only render jpeg/png/webp. */
function toBrowserImageUrl(url: string): string {
  return url.replace(/\.heic(\?)/i, ".jpeg$1");
}

export function AccountAvatar({ name, avatarUrl, initialsText, className = "size-11" }: AccountAvatarProps) {
  // 0 = direct load, 1 = retry via server proxy (for hotlink-protected CDNs), 2 = give up.
  const [stage, setStage] = useState(0);

  const displayUrl = avatarUrl ? toBrowserImageUrl(avatarUrl) : null;

  useEffect(() => {
    setStage(displayUrl && needsProxyFirst(displayUrl) ? 1 : 0);
  }, [displayUrl]);

  if (displayUrl && stage < 2) {
    const src = stage === 0 ? displayUrl : `/api/image-proxy?url=${encodeURIComponent(displayUrl)}`;
    return (
      <img
        key={src}
        src={src}
        alt={name}
        className={`${className} shrink-0 rounded-xl object-cover ring-1 ring-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)]`}
        onError={() => setStage((current) => current + 1)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${className} grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--space-cadet)] to-[var(--jet)] text-sm font-bold text-[var(--eggshell)]`}
    >
      {initialsText}
    </div>
  );
}
