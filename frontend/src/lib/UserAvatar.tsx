"use client";

import type { AuthUser } from "./auth";

export function userAvatarSrc(user: Pick<AuthUser, "avatar_url">): string {
  const u = user.avatar_url?.trim();
  if (u) {
    return u;
  }
  return "";
}

function avatarInitial(user: Pick<AuthUser, "name" | "email">): string {
  const source = user.name?.trim() || user.email?.trim() || "?";
  return source.charAt(0).toUpperCase();
}

export function UserAvatar({
  user,
  size,
  className,
}: {
  user: Pick<AuthUser, "name" | "email" | "avatar_url">;
  size: number;
  className?: string;
}) {
  const src = userAvatarSrc(user);
  if (src) {
    return <img src={src} alt="" width={size} height={size} className={className} />;
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #008378 0%, #00685f 100%)",
        color: "#f4fffc",
        fontWeight: 800,
        fontSize: Math.max(12, Math.round(size * 0.44)),
        userSelect: "none",
      }}
      aria-hidden
    >
      {avatarInitial(user)}
    </div>
  );
}
