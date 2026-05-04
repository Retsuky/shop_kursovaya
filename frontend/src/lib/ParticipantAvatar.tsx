"use client";

import Image from "next/image";

export type ParticipantFace = {
  user_name: string;
  email?: string;
  avatar_url?: string | null;
};

export function participantAvatarSrc(p: ParticipantFace): string {
  const raw = typeof p.avatar_url === "string" ? p.avatar_url.trim() : "";
  if (raw) {
    return raw;
  }
  const seed = (p.email?.trim() || p.user_name || "user").slice(0, 120);
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

export default function ParticipantAvatar({
  participant,
  size,
  className,
}: {
  participant: ParticipantFace;
  size: number;
  className?: string;
}) {
  const src = participantAvatarSrc(participant);
  if (src.includes("api.dicebear.com")) {
    return <Image src={src} alt="" width={size} height={size} className={className} unoptimized />;
  }
  return <img src={src} alt="" width={size} height={size} className={className} />;
}
