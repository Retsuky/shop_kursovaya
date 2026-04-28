"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  clearAuthSession,
  getAuthSession,
  subscribeToAuthChanges,
  type AuthSession,
} from "../../../lib/auth";
import styles from "./header.module.css";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const syncSession = () => {
      setSession(getAuthSession());
    };

    syncSession();

    return subscribeToAuthChanges(syncSession);
  }, []);

  const handleAccountClick = () => {
    if (session) {
      router.push("/account");
      return;
    }

    router.push("/");
  };

  const handleLogoutClick = () => {
    clearAuthSession();

    if (pathname === "/account") {
      router.push("/");
      return;
    }

    router.refresh();
  };

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.logo}>СП</span>
        <div>
          <p className={styles.title}>Совместные покупки</p>
          <p className={styles.subtitle}>Покупайте выгоднее вместе</p>
        </div>
      </div>

      <div className={styles.actions}>
        {session ? (
          <>
            <button type="button" className={styles.account} onClick={handleAccountClick}>
              Аккаунт: {session.user.name}
            </button>
            <button type="button" className={styles.logout} onClick={handleLogoutClick}>
              Выйти
            </button>
          </>
        ) : (
          <button type="button" className={styles.login} onClick={handleAccountClick}>
            Войти
          </button>
        )}
      </div>
    </header>
  );
}
