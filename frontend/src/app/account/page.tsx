"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/header/Header";
import styles from "../page.module.css";
import accountStyles from "./profile.module.css";
import { getAuthSession, type AuthSession } from "../../lib/auth";

export default function AccountPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const currentSession = getAuthSession();

    if (!currentSession) {
      router.replace("/");
      return;
    }

    setSession(currentSession);
  }, [router]);

  if (!session) {
    return null;
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Header />
        <section className={styles.content}>
          <section className={accountStyles.card}>
            <p className={accountStyles.badge}>Личный кабинет</p>
            <h1 className={accountStyles.title}>Здравствуйте, {session.user.name}</h1>
            <p className={accountStyles.subtitle}>
              Здесь отображаются данные аккаунта авторизованного пользователя.
            </p>

            <div className={accountStyles.infoGrid}>
              <article className={accountStyles.infoItem}>
                <span>ID пользователя</span>
                <strong>{session.user.id}</strong>
              </article>

              <article className={accountStyles.infoItem}>
                <span>Email</span>
                <strong>{session.user.email}</strong>
              </article>

              <article className={accountStyles.infoItem}>
                <span>Дата регистрации</span>
                <strong>{new Date(session.user.created_at).toLocaleString("ru-RU")}</strong>
              </article>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
