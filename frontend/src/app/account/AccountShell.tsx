"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MarketingFooter from "../components/landing/MarketingFooter";
import MarketingHeader from "../components/landing/MarketingHeader";
import homeLanding from "../home/home-landing.module.css";
import api from "../../lib/api";
import { getAuthSession, subscribeToAuthChanges, type AuthSession } from "../../lib/auth";
import type { Purchase } from "../../lib/purchasesMeta";
import { UserAvatar } from "../../lib/UserAvatar";
import { tierLabel } from "./accountTier";
import styles from "./cabinet.module.css";

type MinePayload = {
  organized: Purchase[];
  joined: (Purchase & { my_quantity?: number })[];
};

type NavKey = "profile" | "orders" | "add-deal" | "notifications" | "settings";

function navKeyFromPath(path: string): NavKey {
  if (path.startsWith("/account/orders")) {
    return "orders";
  }
  if (path.startsWith("/account/add-deal")) {
    return "add-deal";
  }
  if (path.startsWith("/account/notifications")) {
    return "notifications";
  }
  if (path.startsWith("/account/settings")) {
    return "settings";
  }
  return "profile";
}

type Props = {
  children: React.ReactNode;
};

export default function AccountShell({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname() || "/account";
  const activeNav = navKeyFromPath(pathname);

  const [session, setSession] = useState<AuthSession | null>(null);
  const [mine, setMine] = useState<MinePayload>({ organized: [], joined: [] });
  const [notifUnread, setNotifUnread] = useState(0);

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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!session) {
        return;
      }
      try {
        const res = await api.get<MinePayload>("/purchases/mine");
        if (!cancelled) {
          setMine(res.data);
        }
      } catch {
        if (!cancelled) {
          setMine({ organized: [], joined: [] });
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    async function loadUnread() {
      if (!session) {
        return;
      }
      try {
        const res = await api.get<{ count: number }>("/notifications/unread-count");
        if (!cancelled) {
          setNotifUnread(res.data.count ?? 0);
        }
      } catch {
        if (!cancelled) {
          setNotifUnread(0);
        }
      }
    }
    void loadUnread();
    const onRead = () => {
      void loadUnread();
    };
    window.addEventListener("notifications-read", onRead);
    return () => {
      cancelled = true;
      window.removeEventListener("notifications-read", onRead);
    };
  }, [session, pathname]);

  if (!session) {
    return null;
  }

  function linkClass(key: NavKey): string {
    return activeNav === key ? styles.sideLinkActive : styles.sideLink;
  }

  return (
    <div className={homeLanding.landing}>
      <MarketingHeader />
      <div className={styles.page}>
        <div className={styles.grid}>
          <aside className={styles.sidebar}>
            <div className={styles.profileCard}>
              <div className={styles.profileHead}>
                <div className={styles.avatarLg}>
                  <UserAvatar user={session.user} size={56} />
                </div>
                <div>
                  <p className={styles.profileName}>{session.user.name}</p>
                  <p className={styles.tier}>{tierLabel(mine.organized.length, mine.joined.length)}</p>
                </div>
              </div>
              <nav className={styles.sideNav} aria-label="Разделы кабинета">
                <Link href="/account" className={linkClass("profile")}>
                  <span className={`material-symbols-outlined ${styles.sideIcon}`}>account_circle</span>
                  Профиль
                </Link>
                <Link href="/account/orders" className={linkClass("orders")}>
                  <span className={`material-symbols-outlined ${styles.sideIcon}`}>inventory_2</span>
                  Мои заказы
                </Link>
                <Link href="/account/add-deal" className={linkClass("add-deal")}>
                  <span className={`material-symbols-outlined ${styles.sideIcon}`}>add_circle</span>
                  Добавить сделку
                </Link>
                <Link href="/account/notifications" className={linkClass("notifications")}>
                  <span className={`material-symbols-outlined ${styles.sideIcon}`}>notifications_active</span>
                  Уведомления
                  {notifUnread > 0 ? (
                    <span className={styles.badgeCount}>{notifUnread > 99 ? "99+" : notifUnread}</span>
                  ) : null}
                </Link>
                <Link href="/account/settings" className={linkClass("settings")}>
                  <span className={`material-symbols-outlined ${styles.sideIcon}`}>settings</span>
                  Настройки
                </Link>
              </nav>
            </div>
            <div className={styles.promoCard}>
              <div style={{ position: "relative", zIndex: 1 }}>
                <h3 className={styles.promoTitle}>Экономьте больше вместе</h3>
                <p className={styles.promoText}>
                  Пригласите друзей в совместные закупки — чем больше участников, тем выгоднее цена для всех.
                </p>
                <Link href="/catalog" className={styles.promoBtn}>
                  В каталог
                </Link>
              </div>
              <span className={`material-symbols-outlined ${styles.promoIcon}`}>group_add</span>
            </div>
          </aside>

          <div className={styles.main}>{children}</div>
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}
