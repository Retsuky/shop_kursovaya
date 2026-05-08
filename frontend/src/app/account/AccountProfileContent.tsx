"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import { getAuthSession, subscribeToAuthChanges, type AuthSession } from "../../lib/auth";
import type { Purchase } from "../../lib/purchasesMeta";
import { STATUS_LABELS } from "../../lib/purchasesMeta";
import { ACTIVE } from "./activeDealsCount";
import AccountDealCard from "./AccountDealCard";
import styles from "./cabinet.module.css";

type MinePayload = {
  organized: Purchase[];
  joined: (Purchase & { my_quantity?: number })[];
};

function formatRub(n: number): string {
  if (!Number.isFinite(n) || n <= 0) {
    return "0 ₽";
  }
  return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
}

function participantSavingEstimate(p: Purchase & { my_quantity?: number }): number {
  if (p.retail_price == null || p.retail_price === "") {
    return 0;
  }
  const r = Number(String(p.retail_price).replace(",", "."));
  const u = Number(String(p.unit_price).replace(",", "."));
  if (!Number.isFinite(r) || !Number.isFinite(u) || r <= u) {
    return 0;
  }
  const q = p.my_quantity ?? 1;
  return (r - u) * q;
}

function organizerSavingShareEstimate(p: Purchase): number {
  if (p.retail_price == null || p.retail_price === "") {
    return 0;
  }
  const r = Number(String(p.retail_price).replace(",", "."));
  const u = Number(String(p.unit_price).replace(",", "."));
  if (!Number.isFinite(r) || !Number.isFinite(u) || r <= u) {
    return 0;
  }
  return (r - u) * 0.5;
}

/** Дата ISO в том же календарном месяце и годе, что и `now` (локальное время). */
function isInSameCalendarMonth(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function estimateSavedCompleted(
  organized: Purchase[],
  joined: (Purchase & { my_quantity?: number })[],
  options?: { withinMonthOf?: Date }
): number {
  const withinMonthOf = options?.withinMonthOf;
  const allowDate = withinMonthOf
    ? (iso: string) => isInSameCalendarMonth(iso, withinMonthOf)
    : () => true;

  let total = 0;
  for (const p of joined) {
    if (p.status !== "completed" || !allowDate(p.updated_at)) {
      continue;
    }
    total += participantSavingEstimate(p);
  }
  for (const p of organized) {
    if (p.status !== "completed" || !allowDate(p.updated_at)) {
      continue;
    }
    total += organizerSavingShareEstimate(p);
  }
  return total;
}

/** Оценка суммарной экономии только по завершённым сделкам (как участник и как организатор). */
function estimateSaved(purchases: Purchase[], joined: (Purchase & { my_quantity?: number })[]): number {
  return estimateSavedCompleted(purchases, joined);
}

/**
 Сумма оценочной экономии за текущий календарный месяц: завершённые сделки,
 у которых `updated_at` попал в этот месяц.
 */
function estimateSavedThisMonth(
  organized: Purchase[],
  joined: (Purchase & { my_quantity?: number })[],
  now: Date
): number {
  return estimateSavedCompleted(organized, joined, { withinMonthOf: now });
}

function relativeTime(iso: string): string {
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

type ActivityRow = {
  key: string;
  icon: string;
  tone: "teal" | "coral" | "gold";
  title: string;
  desc: string;
  time: string;
};

function purchaseToActivityRow(p: Purchase): ActivityRow | null {
  const label = STATUS_LABELS[p.status as keyof typeof STATUS_LABELS] ?? p.status;
  let base: Omit<ActivityRow, "key"> | null = null;
  if (p.status === "collecting") {
    base = {
      icon: "group",
      tone: "gold",
      title: "Сделка в сборе",
      desc: `«${p.title}» — ${label.toLowerCase()}.`,
      time: relativeTime(p.updated_at),
    };
  } else if (p.status === "payment" || p.status === "supplier_order") {
    base = {
      icon: "verified",
      tone: "coral",
      title: "Этап заказа",
      desc: `«${p.title}»: ${label.toLowerCase()}.`,
      time: relativeTime(p.updated_at),
    };
  } else if (p.status === "delivery") {
    base = {
      icon: "local_shipping",
      tone: "teal",
      title: "Доставка",
      desc: `«${p.title}» на этапе выдачи.`,
      time: relativeTime(p.updated_at),
    };
  } else if (p.status === "completed") {
    base = {
      icon: "check_circle",
      tone: "teal",
      title: "Сделка завершена",
      desc: `«${p.title}» успешно закрыта.`,
      time: relativeTime(p.updated_at),
    };
  }
  if (!base) {
    return null;
  }
  return { ...base, key: `purchase-${p.id}` };
}

const ACTIVITY_PREVIEW = 5;

export default function AccountProfileContent() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [mine, setMine] = useState<MinePayload>({ organized: [], joined: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activityExpanded, setActivityExpanded] = useState(false);

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
        const res = await api.get<MinePayload>("/purchases/mine");
        if (!cancelled) {
          setMine(res.data);
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
    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const activeOrganized = useMemo(
    () => mine.organized.filter((p) => ACTIVE.has(String(p.status))),
    [mine.organized]
  );
  const activeJoined = useMemo(
    () => mine.joined.filter((p) => ACTIVE.has(String(p.status)) && String(p.my_participant_status ?? "") !== "handed"),
    [mine.joined]
  );

  const activeDeals = useMemo(() => {
    const list: { purchase: Purchase; role: "organizer" | "participant" }[] = [];
    for (const p of activeOrganized) {
      list.push({ purchase: p, role: "organizer" });
    }
    for (const p of activeJoined) {
      list.push({ purchase: p, role: "participant" });
    }
    list.sort((a, b) => new Date(b.purchase.updated_at).getTime() - new Date(a.purchase.updated_at).getTime());
    return list;
  }, [activeOrganized, activeJoined]);

  const savedTotal = useMemo(
    () => estimateSaved(mine.organized, mine.joined),
    [mine.organized, mine.joined]
  );

  const savedThisMonth = useMemo(
    () => estimateSavedThisMonth(mine.organized, mine.joined, new Date()),
    [mine.organized, mine.joined]
  );

  const purchaseActivities = useMemo(() => {
    const rows: ActivityRow[] = [];
    const merged = [...mine.organized, ...mine.joined];
    const byId = new Map<number, Purchase>();
    for (const p of merged) {
      const prev = byId.get(p.id);
      if (!prev || new Date(p.updated_at).getTime() >= new Date(prev.updated_at).getTime()) {
        byId.set(p.id, p);
      }
    }
    const all = [...byId.values()].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    for (const p of all) {
      const row = purchaseToActivityRow(p);
      if (row) {
        rows.push(row);
      }
    }
    return rows;
  }, [mine.organized, mine.joined]);

  const activityRows = useMemo((): ActivityRow[] => {
    if (purchaseActivities.length === 0 && !loading) {
      return [
        {
          key: "catalog-hint",
          icon: "shopping_bag",
          tone: "teal",
          title: "Начните с каталога",
          desc: "Присоединитесь к групповой сделке или создайте свою закупку.",
          time: "—",
        },
      ];
    }
    if (activityExpanded || purchaseActivities.length <= ACTIVITY_PREVIEW) {
      return purchaseActivities;
    }
    return purchaseActivities.slice(0, ACTIVITY_PREVIEW);
  }, [purchaseActivities, loading, activityExpanded]);

  const showActivityLoadMore = purchaseActivities.length > ACTIVITY_PREVIEW && !activityExpanded;
  const activityScrollable = activityExpanded && purchaseActivities.length > ACTIVITY_PREVIEW;

  if (!session) {
    return null;
  }

  const firstName = session.user.name.split(/\s+/)[0] ?? session.user.name;

  return (
    <>
      <div className={styles.heroRow}>
        <div>
          <h1 className={styles.welcome}>С возвращением, {firstName}!</h1>
          <p className={styles.welcomeSub}>
            {loading
              ? "Загружаем ваши сделки…"
              : `У вас ${activeDeals.length} активных сделок в процессе.`}
          </p>
        </div>
        <div className={styles.statChips}>
          <div className={styles.statChip}>
            <span className={styles.statLabel}>Всего сэкономлено (оценка)</span>
            <span className={styles.statValue}>{formatRub(savedTotal)}</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statLabel}>Активных сделок</span>
            <span className={styles.statValue}>
              {String(activeDeals.length).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <section>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            <span className={`material-symbols-outlined ${styles.sectionTitleIcon}`}>local_mall</span>
            Мои активные сделки
          </h2>
          <Link href="/account/orders" className={styles.viewAll}>
            Все заказы
          </Link>
        </div>
        {!loading && activeDeals.length === 0 ? (
          <p className={styles.emptyHint}>
            Пока нет активных сделок. Загляните в{" "}
            <Link href="/catalog">каталог</Link> или{" "}
            <Link href="/purchases/new">создайте закупку</Link>.
          </p>
        ) : (
          <div className={styles.dealsGrid}>
            {activeDeals.slice(0, 4).map(({ purchase, role }) => (
              <AccountDealCard key={`${role}-${purchase.id}`} purchase={purchase} role={role} />
            ))}
          </div>
        )}
      </section>

      <div className={styles.lowerGrid}>
        <section>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 24 }}>
            <span className={`material-symbols-outlined ${styles.sectionTitleIcon}`}>history</span>
            Последняя активность
          </h2>
          <div className={styles.activityCard}>
            <div className={activityScrollable ? styles.activityScroll : undefined}>
              <ul className={styles.activityList}>
              {activityRows.map((a) => (
                <li key={a.key} className={styles.activityItem}>
                  <div
                    className={styles.activityIcon}
                    style={{
                      background:
                        a.tone === "coral"
                          ? "#ffdadb"
                          : a.tone === "gold"
                            ? "#ffe083"
                            : "rgba(13, 148, 136, 0.12)",
                      color: a.tone === "coral" ? "#b90538" : a.tone === "gold" ? "#735c00" : "#00685f",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                      {a.icon}
                    </span>
                  </div>
                  <div className={styles.activityBody}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <h5>{a.title}</h5>
                      <span className={styles.activityMeta}>{a.time}</span>
                    </div>
                    <p className={styles.activityDesc}>{a.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            </div>
          </div>
          {showActivityLoadMore ? (
            <button
              type="button"
              className={styles.loadMore}
              onClick={() => setActivityExpanded(true)}
            >
              Загрузить больше
            </button>
          ) : null}
        </section>

        <section className={styles.sidebar}>
          <div className={styles.dashCard}>
            <h3 className={styles.dashTitle}>Дашборд экономии</h3>
            <div className={styles.dashRow}>
              <span>В этом месяце</span>
              <span>+{formatRub(savedThisMonth)}</span>
            </div>
            <div className={styles.dashRow}>
              <span>Экономия за всё время</span>
              <span>{formatRub(savedTotal)}</span>
            </div>
            <p className={styles.dashFoot}>
              Оценка по разнице розничной и групповой цены только по сделкам со статусом «завершена».
              За месяц — из них те, у которых дата обновления в текущем календарном месяце.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
