"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cartTotalQuantity, subscribeToCartChanges } from "../../../lib/cart";
import {
  clearAuthSession,
  getAuthSession,
  subscribeToAuthChanges,
  type AuthSession,
} from "../../../lib/auth";
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

  const handleLogout = () => {
    clearAuthSession();
    router.refresh();
  };

  return (
    <header className={`${tokens.root} ${styles.header}`}>
      <div className={styles.inner}>
        <Link href="/home" className={styles.brand}>
          CoBuy
        </Link>

        <nav className={styles.nav} aria-label="Основное меню">
          {nav.map((item) => {
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
          })}
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
          <button type="button" className={styles.iconBtn} aria-label="Уведомления">
            <span className={`material-symbols-outlined ${styles.icon}`}>notifications</span>
          </button>

          {session ? (
            <div className={styles.userCluster}>
              <Link href="/account" className={styles.avatarWrap} aria-label="Личный кабинет">
                <Image
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(session.user.email)}`}
                  alt=""
                  width={40}
                  height={40}
                  className={styles.avatar}
                  unoptimized
                />
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
    </header>
  );
}
