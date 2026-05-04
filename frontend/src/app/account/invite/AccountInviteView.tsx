"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getAuthSession, subscribeToAuthChanges, type AuthSession } from "../../../lib/auth";
import sub from "../account-subpages.module.css";

export default function AccountInviteView() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const s = getAuthSession();
    if (!s) {
      router.replace("/");
      return;
    }
    setSession(s);
  }, [router]);

  useEffect(() => {
    return subscribeToAuthChanges(() => {
      if (!getAuthSession()) {
        router.replace("/");
      }
    });
  }, [router]);

  const copyLink = useCallback(async () => {
    if (!session) {
      return;
    }
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/catalog?ref=${session.user.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  }, [session]);

  if (!session) {
    return null;
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const referralUrl = `${origin}/catalog?ref=${session.user.id}`;

  const firstName = session.user.name.split(/\s+/)[0] ?? session.user.name;

  return (
    <>
      <div className={sub.pageHead}>
        <h1 className={sub.pageTitle}>Пригласить друга</h1>
        <p className={sub.pageLead}>
          {firstName}, поделитесь ссылкой на каталог CoBuy — пусть друзья тоже находят выгодные групповые
          закупки.
        </p>
      </div>

      <section className={sub.inviteHero}>
        <p className={sub.inviteLead}>
          По вашей персональной ссылке открывается каталог с отметкой <strong>ref={session.user.id}</strong> — так
          вы сможете отследить переходы, если поддержка добавит статистику.
        </p>
        <div className={sub.linkRow}>
          <span className={sub.linkField} title={referralUrl}>
            {referralUrl}
          </span>
          <button type="button" className={sub.copyBtn} onClick={() => void copyLink()}>
            {copied ? "Скопировано" : "Копировать"}
          </button>
        </div>
        {copied ? <p className={sub.copyOk}>Ссылка в буфере обмена</p> : null}

        <div className={sub.shareRow}>
          <button type="button" className={sub.shareChip} onClick={() => void copyLink()}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              link
            </span>
            Скопировать ссылку
          </button>
          <a href={`mailto:?subject=CoBuy%20каталог&body=${encodeURIComponent(referralUrl)}`} className={sub.shareChip}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              mail
            </span>
            Открыть почту
          </a>
        </div>
      </section>
    </>
  );
}
