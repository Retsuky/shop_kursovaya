"use client";

import { UserAvatar } from "./UserAvatar";

export type ParticipantFace = {
  user_name: string;
  email?: string;
  avatar_url?: string | null;
};

export default function ParticipantAvatar({
  participant,
  size,
  className,
}: {
  participant: ParticipantFace;
  size: number;
  className?: string;
}) {
  const url = participant.avatar_url?.trim();
  return (
    <UserAvatar
      user={{
        name: participant.user_name,
        email: participant.email ?? "",
        avatar_url: url || undefined,
      }}
      size={size}
      className={className}
    />
  );
}
