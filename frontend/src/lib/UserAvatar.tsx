"use client";

import Image from "next/image";
import type { AuthUser } from "./auth";

export function userAvatarSrc(user: Pick<AuthUser, "email" | "avatar_url">): string {
  const u = user.avatar_url?.trim();
  if (u) {
    return u;
  }
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}`;
}

export function UserAvatar({
  user,
  size,
  className,
}: {
  user: Pick<AuthUser, "email" | "avatar_url">;
  size: number;
  className?: string;
}) {
  const src = userAvatarSrc(user);
  if (src.includes("api.dicebear.com")) {
    return <Image src={src} alt="" width={size} height={size} className={className} unoptimized />;
  }

  return <img src={src} alt="" width={size} height={size} className={className} />;
}
