"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "../../../lib/api";
import { cartTotalQuantity, subscribeToCartChanges } from "../../../lib/cart";
import {
  clearAuthSession,
  getAuthSession,
  subscribeToAuthChanges,
  type AuthSession,
} from "../../../lib/auth";
import { UserAvatar } from "../../../lib/UserAvatar";
import tokens from "./landing-tokens.module.css";
import styles from "./marketing-header.module.css";

const nav = [
  { href: "/catalog", label: "Каталог", key: "catalog" },
  { href: "/home#trending", label: "Тренды", key: "trends" },
  { href: "/home#how-it-works", label: "Как это работает", key: "how" },
];

function isNavActive(pathname: string | null, key: string) {
  if (!pathname) {
    return false;
  }
  if (key === "catalog") {
    return pathname.startsWith("/catalog");
  }
  return false;
}

export default function MarketingHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);

  useEffect(() => {
    const sync = () => setSession(getAuthSession());
    sync();
    return subscribeToAuthChanges(sync);
  }, []);

  useEffect(() => {
    const syncCart = () => setCartCount(cartTotalQuantity());
    syncCart();
    return subscribeToCartChanges(syncCart);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadUnread() {
      if (!session) {
        if (!cancelled) {
          setNotifUnread(0);
        }
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

  const handleLogout = () => {
    clearAuthSession();
    router.refresh();
  };

  const navLinks = nav.map((item) => {
    const active = isNavActive(pathname, item.key);
    return (
      <Link
        key={item.key}
        href={item.href}
        className={active ? styles.navLinkActive : styles.navLink}
      >
        {item.label}
      </Link>
    );
  });

  return (
    <header className={`${tokens.root} ${styles.header}`}>
      <div className={styles.inner}>
        <div className={styles.topRow}>
          <Link href="/home" className={styles.brand}>
            CoBuy
          </Link>

          <nav className={styles.nav} aria-label="Основное меню">
            {navLinks}
          </nav>

          <div className={styles.actions}>
            {session?.user?.is_admin === true ? (
              <Link href="/admin" className={styles.adminLink}>
                Админ
              </Link>
            ) : null}
            <Link href="/cart" className={styles.cartLink} aria-label="Корзина">
              <span className={`material-symbols-outlined ${styles.icon}`}>shopping_cart</span>
              {cartCount > 0 ? (
                <span className={styles.cartBadge}>{cartCount > 99 ? "99+" : cartCount}</span>
              ) : null}
            </Link>
            <Link href="/account/notifications" className={styles.iconBtn} aria-label="Уведомления">
              <span className={`material-symbols-outlined ${styles.icon}`}>notifications</span>
              {notifUnread > 0 ? (
                <span className={styles.notifBadge}>{notifUnread > 99 ? "99+" : notifUnread}</span>
              ) : null}
            </Link>

            {session ? (
              <div className={styles.userCluster}>
                <Link href="/account" className={styles.avatarWrap} aria-label="Личный кабинет">
                  <UserAvatar user={session.user} size={40} className={styles.avatar} />
                </Link>
                <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
                  Выйти
                </button>
              </div>
            ) : (
              <Link href="/" className={styles.loginLink}>
                Войти
              </Link>
            )}
          </div>
        </div>

        <nav className={styles.mobileNav} aria-label="Меню (мобильное)">
          {navLinks}
          {session ? (
            <Link href="/account" className={styles.mobileNavExtra}>
              Кабинет
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
