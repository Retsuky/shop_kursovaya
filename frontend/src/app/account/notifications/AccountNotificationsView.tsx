"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import api from "../../../lib/api";
import { getAuthSession, subscribeToAuthChanges, type AuthSession } from "../../../lib/auth";
import cabinet from "../cabinet.module.css";
import sub from "../account-subpages.module.css";

type NotificationRow = {
  id: number;
  user_id: number;
  purchase_id: number | null;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

type NotificationsResponse = {
  items: NotificationRow[];
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) {
    return "только что";
  }
  if (h < 24) {
    return `${h} ч назад`;
  }
  const d = Math.floor(h / 24);
  if (d === 1) {
    return "вчера";
  }
  return `${d} дн. назад`;
}

function iconForType(type: string, title: string): string {
  if (type === "join_request") {
    return "person_add";
  }
  if (type === "participant_left") {
    return "person_remove";
  }
  if (type === "status_change") {
    if (title.includes("Отменена") || title.includes("отмен")) {
      return "cancel";
    }
    return "trending_flat";
  }
  if (type === "delivery_status_change") {
    return "local_shipping";
  }
  if (type === "group_discount_ready") {
    return "groups";
  }
  if (type === "submission_review") {
    return title.includes("отклон") || title.includes("Отклон") ? "block" : "check_circle";
  }
  return "campaign";
}

export default function AccountNotificationsView() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      setLoading(true);
      setError("");
      try {
        const res = await api.get<NotificationsResponse>("/notifications?limit=80");
        if (cancelled) {
          return;
        }
        const list = res.data.items ?? [];
        setItems(list);
        const hasUnread = list.some((n) => n.read_at == null);
        if (hasUnread) {
          await api.patch("/notifications/read-all");
          const now = new Date().toISOString();
          if (!cancelled) {
            setItems(list.map((n) => ({ ...n, read_at: n.read_at ?? now })));
          }
          window.dispatchEvent(new Event("notifications-read"));
        }
      } catch (e) {
        if (!cancelled) {
          if (axios.isAxiosError(e)) {
            setError(e.response?.data?.message ?? "Не удалось загрузить данные.");
          } else {
            setError("Ошибка сети.");
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [items]);

  if (!session) {
    return null;
  }

  const firstName = session.user.name.split(/\s+/)[0] ?? session.user.name;

  return (
    <>
      <div className={sub.pageHead}>
        <h1 className={sub.pageTitle}>Уведомления</h1>
        <p className={sub.pageLead}>
          {firstName}, здесь сохраняются события по закупкам: заявки, выход участников и смена этапов. При открытии
          страницы новые отмечаются прочитанными.
        </p>
      </div>

      {error ? <div className={cabinet.errorBanner}>{error}</div> : null}

      {loading ? (
        <p className={cabinet.emptyHint}>Загрузка…</p>
      ) : (
        <div className={sub.notificationsList}>
          <div className={`${sub.notificationCard} ${sub.notificationCardUnread}`}>
            <div className={sub.notifIcon}>
              <span className="material-symbols-outlined">campaign</span>
            </div>
            <div className={sub.notifBody}>
              <p className={sub.notifTitle}>Как это работает</p>
              <p className={sub.notifDesc}>
                Уведомления пишутся в ваш аккаунт при действиях в закупках. Запись остаётся в списке, пока связанная
                сделка не удалена администратором.
              </p>
              <p className={sub.notifMeta}>Справка · всегда актуально</p>
            </div>
          </div>

          {sorted.length === 0 ? (
            <p className={cabinet.emptyHint}>
              Пока пусто. Загляните в <Link href="/catalog">каталог</Link> или откройте свои закупки — события
              появятся здесь.
            </p>
          ) : (
            sorted.map((n) => {
              const unread = n.read_at == null;
              return (
                <div
                  key={n.id}
                  className={`${sub.notificationCard} ${unread ? sub.notificationCardUnread : ""}`}
                >
                  <div className={sub.notifIcon}>
                    <span className="material-symbols-outlined">{iconForType(n.type, n.title)}</span>
                  </div>
                  <div className={sub.notifBody}>
                    <p className={sub.notifTitle}>{n.title}</p>
                    {n.body ? <p className={sub.notifDesc}>{n.body}</p> : null}
                    <p className={sub.notifMeta}>
                      {n.purchase_id ? (
                        <>
                          <Link href={`/purchases/${n.purchase_id}`} style={{ color: "inherit" }}>
                            К сделке
                          </Link>
                          ·{" "}
                        </>
                      ) : null}
                      {formatRelative(n.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
}
