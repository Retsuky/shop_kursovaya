"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import api from "../../../lib/api";
import { getAuthSession, subscribeToAuthChanges, type AuthSession } from "../../../lib/auth";
import type { Purchase } from "../../../lib/purchasesMeta";
import { ACTIVE } from "../activeDealsCount";
import AccountDealCard from "../AccountDealCard";
import cabinet from "../cabinet.module.css";
import sub from "../account-subpages.module.css";

type MinePayload = {
  organized: Purchase[];
  joined: (Purchase & { my_quantity?: number })[];
};

type DealRow = { purchase: Purchase; role: "organizer" | "participant" };

type Tab = "active" | "archive" | "all";

export default function AccountOrdersView() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [mine, setMine] = useState<MinePayload>({ organized: [], joined: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("active");

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
            setError(e.response?.data?.message ?? "Не удалось загрузить заказы.");
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

  const merged = useMemo<DealRow[]>(() => {
    const map = new Map<number, DealRow>();
    for (const p of mine.organized) {
      map.set(p.id, { purchase: p, role: "organizer" });
    }
    for (const p of mine.joined) {
      if (!map.has(p.id)) {
        map.set(p.id, { purchase: p, role: "participant" });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.purchase.updated_at).getTime() - new Date(a.purchase.updated_at).getTime()
    );
  }, [mine]);

  const filtered = useMemo(() => {
    return merged.filter(({ purchase: p }) => {
      const st = String(p.status);
      if (tab === "active") {
        return ACTIVE.has(st);
      }
      if (tab === "archive") {
        return st === "completed" || st === "cancelled";
      }
      return true;
    });
  }, [merged, tab]);

  const counts = useMemo(() => {
    const active = merged.filter(({ purchase: p }) => ACTIVE.has(String(p.status))).length;
    const archive = merged.filter(
      ({ purchase: p }) => p.status === "completed" || p.status === "cancelled"
    ).length;
    return { active, archive, all: merged.length };
  }, [merged]);

  if (!session) {
    return null;
  }

  return (
    <>
      <div className={sub.pageHead}>
        <h1 className={sub.pageTitle}>Мои заказы</h1>
        <p className={sub.pageLead}>
          Сделки, где вы организатор или участник группы. Откройте карточку, чтобы управлять заявкой или
          следить за статусом.
        </p>
      </div>

      <div className={sub.tabs} role="tablist" aria-label="Фильтр заказов">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "active"}
          className={tab === "active" ? sub.tabActive : sub.tab}
          onClick={() => setTab("active")}
        >
          Активные
          <span className={sub.countBadge}>{counts.active}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "archive"}
          className={tab === "archive" ? sub.tabActive : sub.tab}
          onClick={() => setTab("archive")}
        >
          Архив
          <span className={sub.countBadge}>{counts.archive}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "all"}
          className={tab === "all" ? sub.tabActive : sub.tab}
          onClick={() => setTab("all")}
        >
          Все
          <span className={sub.countBadge}>{counts.all}</span>
        </button>
      </div>

      {error ? <div className={cabinet.errorBanner}>{error}</div> : null}

      {loading ? (
        <p className={cabinet.emptyHint}>Загрузка заказов…</p>
      ) : filtered.length === 0 ? (
        <p className={cabinet.emptyHint}>
          {tab === "active" ? (
            <>
              Нет активных заказов — загляните в <Link href="/catalog">каталог</Link> или{" "}
              <Link href="/purchases/new">создайте закупку</Link>.
            </>
          ) : tab === "archive" ? (
            <>Пока нет завершённых или отменённых сделок.</>
          ) : (
            <>Заказов пока нет.</>
          )}
        </p>
      ) : (
        <div className={cabinet.dealsGrid}>
          {filtered.map(({ purchase, role }) => (
            <AccountDealCard key={`${role}-${purchase.id}`} purchase={purchase} role={role} />
          ))}
        </div>
      )}
    </>
  );
}
