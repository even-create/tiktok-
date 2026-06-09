"use client";

import { useEffect, useState } from "react";
import { resolveDisplayImageUrl } from "@/lib/providers/parse-utils";

type AccountAvatarProps = {
  name: string;
  avatarUrl: string | null;
  initialsText: string;
  className?: string;
};

export function AccountAvatar({ name, avatarUrl, initialsText, className = "size-11" }: AccountAvatarProps) {
  // 0 = resolved URL (may already be proxied), 1 = retry via proxy, 2 = give up.
  const [stage, setStage] = useState(0);
  const displayUrl = avatarUrl ? resolveDisplayImageUrl(avatarUrl) : null;

  useEffect(() => {
    setStage(0);
  }, [displayUrl]);

  if (displayUrl && stage < 2) {
    const src =
      stage === 0 || displayUrl.startsWith("/api/image-proxy")
        ? displayUrl
        : `/api/image-proxy?url=${encodeURIComponent(displayUrl)}`;

    return (
      <img
        key={`${src}-${stage}`}
        src={src}
        alt={name}
        className={`${className} shrink-0 rounded-xl object-cover ring-1 ring-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)]`}
        onError={() => {
          if (displayUrl.startsWith("/api/image-proxy") || stage >= 1) {
            setStage(2);
            return;
          }
          setStage(1);
        }}
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
