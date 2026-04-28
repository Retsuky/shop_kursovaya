"use client";

import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/header/Header";
import styles from "../page.module.css";
import accountStyles from "./profile.module.css";
import api from "../../lib/api";
import { getAuthSession, type AuthSession } from "../../lib/auth";
import type { Purchase } from "../../lib/purchasesMeta";
import { STATUS_LABELS } from "../../lib/purchasesMeta";

type MinePayload = {
  organized: Purchase[];
  joined: (Purchase & { my_quantity?: number })[];
};

export default function AccountPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [mine, setMine] = useState<MinePayload>({ organized: [], joined: [] });
  const [mineLoading, setMineLoading] = useState(false);
  const [mineError, setMineError] = useState("");

  useEffect(() => {
    const currentSession = getAuthSession();

    if (!currentSession) {
      router.replace("/");

      return;
    }

    setSession(currentSession);
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadMine() {
      if (!session) {
        return;
      }

      setMineLoading(true);
      setMineError("");

      try {
        const res = await api.get<MinePayload>("/purchases/mine");

        if (!cancelled) {
          setMine(res.data);
        }
      } catch (e) {
        if (!cancelled) {
          if (axios.isAxiosError(e)) {
            setMineError(e.response?.data?.message ?? "Не удалось загрузить закупки.");
          } else {
            setMineError("Ошибка сети.");
          }
          setMine({ organized: [], joined: [] });
        }
      } finally {
        if (!cancelled) {
          setMineLoading(false);
        }
      }
    }

    loadMine();

    return () => {
      cancelled = true;
    };
  }, [session]);

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
              Данные профиля и ваши активные совместные закупки на платформе.
            </p>

            <div className={accountStyles.infoGrid}>
              <article className={accountStyles.infoItem}>
                <span>Email</span>
                <strong>{session.user.email}</strong>
              </article>

              <article className={accountStyles.infoItem}>
                <span>Имя</span>
                <strong>{session.user.name}</strong>
              </article>

              <article className={accountStyles.infoItem}>
                <span>На платформе с</span>
                <strong>{new Date(session.user.created_at).toLocaleDateString("ru-RU")}</strong>
              </article>
            </div>

            <Link href="/purchases/new" className={accountStyles.titleLinkPrimary}>
              + Новая закупка
            </Link>
          </section>

          <section className={`${accountStyles.card} ${accountStyles.cardMuted}`}>
            <h2 className={accountStyles.sectionHeading}>Вы организуете</h2>

            {mineLoading ? <p className={accountStyles.miniMeta}>Загрузка…</p> : null}
            {!mineLoading && mineError ? (
              <p className={accountStyles.errorInline}>{mineError}</p>
            ) : null}
            {!mineLoading && !mine.organized.length ? (
              <p className={accountStyles.miniMeta}>Вы ещё не создавали закупок.</p>
            ) : (
              <div className={accountStyles.miniList}>
                {mine.organized.map((item) => (
                  <article key={`org-${item.id}`} className={accountStyles.miniCard}>
                    <div>
                      <Link href={`/purchases/${item.id}`} className={accountStyles.miniTitle}>
                        {item.title}
                      </Link>
                      <p className={accountStyles.miniMeta}>
                        {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] ?? item.status} · участников{" "}
                        {item.participant_count ?? 0}
                      </p>
                    </div>
                    <Link className={accountStyles.linkBtn} href={`/purchases/${item.id}`}>
                      Открыть
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className={`${accountStyles.card} ${accountStyles.cardMuted}`}>
            <h2 className={accountStyles.sectionHeading}>Вы участвуете</h2>

            {!mineLoading && !mine.joined.length ? (
              <p className={accountStyles.miniMeta}>Вы пока ни в каких чужих закупках не участвуете.</p>
            ) : null}
            {!mineLoading && mine.joined.length > 0 ? (
              <div className={accountStyles.miniList}>
                {mine.joined.map((item) => (
                  <article key={`joined-${item.id}`} className={accountStyles.miniCard}>
                    <div>
                      <Link href={`/purchases/${item.id}`} className={accountStyles.miniTitle}>
                        {item.title}
                      </Link>
                      <p className={accountStyles.miniMeta}>
                        {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] ?? item.status} · вы заказали{" "}
                        {item.my_quantity ?? 0} шт.
                      </p>
                    </div>
                    <Link className={accountStyles.linkBtn} href={`/purchases/${item.id}`}>
                      Открыть
                    </Link>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </section>
      </main>
    </div>
  );
}
