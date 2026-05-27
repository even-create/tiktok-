"use client";

import { useState } from "react";

type AccountAvatarProps = {
  name: string;
  avatarUrl: string | null;
  initialsText: string;
  className?: string;
};

export function AccountAvatar({ name, avatarUrl, initialsText, className = "size-11" }: AccountAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${className} shrink-0 rounded-xl object-cover ring-1 ring-[color-mix(in_srgb,var(--cadet-gray)_30%,transparent)]`}
        onError={() => setFailed(true)}
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
