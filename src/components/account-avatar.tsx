"use client";

import { useEffect, useState } from "react";

type AccountAvatarProps = {
  name: string;
  avatarUrl: string | null;
  initialsText: string;
  className?: string;
};

export function AccountAvatar({ name, avatarUrl, initialsText, className = "size-11" }: AccountAvatarProps) {
  // 0 = direct load, 1 = retry via server proxy (for hotlink-protected CDNs), 2 = give up.
  const [stage, setStage] = useState(0);

  useEffect(() => {
    setStage(0);
  }, [avatarUrl]);

  if (avatarUrl && stage < 2) {
    const src = stage === 0 ? avatarUrl : `/api/image-proxy?url=${encodeURIComponent(avatarUrl)}`;
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
