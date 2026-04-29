"use client";

import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import MarketingFooter from "../components/landing/MarketingFooter";
import MarketingHeader from "../components/landing/MarketingHeader";
import homeLanding from "../home/home-landing.module.css";
import api from "../../lib/api";
import { getAuthSession, subscribeToAuthChanges, type AuthSession } from "../../lib/auth";
import type { Purchase } from "../../lib/purchasesMeta";
import { STATUS_LABELS } from "../../lib/purchasesMeta";
import AccountDealCard from "./AccountDealCard";
import styles from "./cabinet.module.css";

type MinePayload = {
  organized: Purchase[];
  joined: (Purchase & { my_quantity?: number })[];
};

const ACTIVE = new Set(["collecting", "payment", "supplier_order", "delivery"]);

function tierLabel(organized: number, joined: number): string {
  const n = organized + joined;
  if (n >= 12) {
    return "Платиновый участник";
  }
  if (n >= 5) {
    return "Золотой участник";
  }
  if (n >= 1) {
    return "Активный участник";
  }
  return "Новый участник";
}

function formatRub(n: number): string {
  if (!Number.isFinite(n) || n <= 0) {
    return "0 ₽";
  }
  return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
}

function estimateSaved(purchases: Purchase[], joined: (Purchase & { my_quantity?: number })[]): number {
  let total = 0;
  for (const p of joined) {
    if (p.retail_price == null || p.retail_price === "") {
      continue;
    }
    const r = Number(String(p.retail_price).replace(",", "."));
    const u = Number(String(p.unit_price).replace(",", "."));
    if (Number.isFinite(r) && Number.isFinite(u) && r > u) {
      const q = p.my_quantity ?? 1;
      total += (r - u) * q;
    }
  }
  for (const p of purchases) {
    if (p.retail_price == null || p.retail_price === "") {
      continue;
    }
    const r = Number(String(p.retail_price).replace(",", "."));
    const u = Number(String(p.unit_price).replace(",", "."));
    if (Number.isFinite(r) && Number.isFinite(u) && r > u) {
      total += (r - u) * 0.5;
    }
  }
  return total;
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

export default function AccountCabinet() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [mine, setMine] = useState<MinePayload>({ organized: [], joined: [] });
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
    () => mine.joined.filter((p) => ACTIVE.has(String(p.status))),
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

  const activities = useMemo(() => {
    const rows: { icon: string; tone: "teal" | "coral" | "gold"; title: string; desc: string; time: string }[] =
      [];
    const all = [...mine.organized, ...mine.joined].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    for (const p of all.slice(0, 5)) {
      const label = STATUS_LABELS[p.status as keyof typeof STATUS_LABELS] ?? p.status;
      if (p.status === "collecting") {
        rows.push({
          icon: "group",
          tone: "gold",
          title: "Сделка в сборе",
          desc: `«${p.title}» — ${label.toLowerCase()}.`,
          time: relativeTime(p.updated_at),
        });
      } else if (p.status === "payment" || p.status === "supplier_order") {
        rows.push({
          icon: "verified",
          tone: "coral",
          title: "Этап заказа",
          desc: `«${p.title}»: ${label.toLowerCase()}.`,
          time: relativeTime(p.updated_at),
        });
      } else if (p.status === "delivery") {
        rows.push({
          icon: "local_shipping",
          tone: "teal",
          title: "Доставка",
          desc: `«${p.title}» на этапе выдачи.`,
          time: relativeTime(p.updated_at),
        });
      } else if (p.status === "completed") {
        rows.push({
          icon: "check_circle",
          tone: "teal",
          title: "Сделка завершена",
          desc: `«${p.title}» успешно закрыта.`,
          time: relativeTime(p.updated_at),
        });
      }
    }
    if (rows.length === 0 && !loading) {
      rows.push({
        icon: "shopping_bag",
        tone: "teal",
        title: "Начните с каталога",
        desc: "Присоединитесь к групповой сделке или создайте свою закупку.",
        time: "—",
      });
    }
    return rows;
  }, [mine.organized, mine.joined, loading]);

  const monthProgress = Math.min(100, Math.round((savedTotal % 5000) / 50));

  if (!session) {
    return null;
  }

  const firstName = session.user.name.split(/\s+/)[0] ?? session.user.name;

  return (
    <div className={homeLanding.landing}>
      <MarketingHeader />
      <div className={styles.page}>
        <div className={styles.grid}>
          <aside className={styles.sidebar}>
            <div className={styles.profileCard}>
              <div className={styles.profileHead}>
                <div className={styles.avatarLg}>
                  <Image
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(session.user.email)}`}
                    alt=""
                    width={56}
                    height={56}
                    unoptimized
                  />
                </div>
                <div>
                  <p className={styles.profileName}>{session.user.name}</p>
                  <p className={styles.tier}>
                    {tierLabel(mine.organized.length, mine.joined.length)}
                  </p>
                </div>
              </div>
              <nav className={styles.sideNav} aria-label="Разделы кабинета">
                <Link href="/account" className={styles.sideLinkActive}>
                  <span className={`material-symbols-outlined ${styles.sideIcon}`}>account_circle</span>
                  Профиль
                </Link>
                <Link href="/catalog" className={styles.sideLink}>
                  <span className={`material-symbols-outlined ${styles.sideIcon}`}>inventory_2</span>
                  Мои заказы
                </Link>
                <button type="button" className={styles.sideLink} disabled title="Скоро">
                  <span className={`material-symbols-outlined ${styles.sideIcon}`}>notifications_active</span>
                  Уведомления
                  {activeDeals.length > 0 ? (
                    <span className={styles.badgeCount}>{Math.min(activeDeals.length, 9)}</span>
                  ) : null}
                </button>
                <button type="button" className={styles.sideLink} disabled title="Скоро">
                  <span className={`material-symbols-outlined ${styles.sideIcon}`}>settings</span>
                  Настройки
                </button>
                <div className={styles.divider} />
                <Link href="/home#how-it-works" className={styles.inviteLink}>
                  <span className="material-symbols-outlined">card_giftcard</span>
                  Пригласить друга
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

          <div className={styles.main}>
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
                <Link href="/catalog" className={styles.viewAll}>
                  Посмотреть все
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
                  <ul className={styles.activityList}>
                    {activities.map((a, i) => (
                      <li key={i} className={styles.activityItem}>
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
                <button type="button" className={styles.loadMore} disabled>
                  Загрузить больше
                </button>
              </section>

              <section className={styles.sidebar}>
                <div className={styles.dashCard}>
                  <h3 className={styles.dashTitle}>Дашборд экономии</h3>
                  <div className={styles.dashRow}>
                    <span>В этом месяце (прогресс цели)</span>
                    <span>+{formatRub(savedTotal * 0.15)}</span>
                  </div>
                  <div className={styles.dashBar}>
                    <div className={styles.dashBarFill} style={{ width: `${monthProgress}%` }} />
                  </div>
                  <div className={styles.dashRow}>
                    <span>Экономия за всё время (оценка)</span>
                    <span>{formatRub(savedTotal)}</span>
                  </div>
                  <p className={styles.dashFoot}>
                    Расчёт приблизительный: разница розничной и групповой цены по вашим закупкам.
                  </p>
                </div>
                <div className={styles.supportCard}>
                  <div className={styles.supportIcon}>
                    <span className="material-symbols-outlined">support_agent</span>
                  </div>
                  <div className={styles.supportBody}>
                    <h4>Нужна помощь?</h4>
                    <p>Напишите организатору сделки или в поддержку платформы.</p>
                    <button type="button" className={styles.supportChat}>
                      Связаться
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}
