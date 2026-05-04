"use client";

import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";
import api from "../../../lib/api";
import { mapPurchaseToTrendingDeal } from "../../../lib/catalogDisplay";
import type { CatalogResponse, Purchase } from "../../../lib/purchasesMeta";
import tokens from "./landing-tokens.module.css";
import TrendingDealCard from "./TrendingDealCard";
import styles from "./trending-deals-section.module.css";

const TRENDING_LIMIT = 3;

async function fetchTrendingPurchases(): Promise<Purchase[]> {
  const seen = new Set<number>();
  const out: Purchase[] = [];

  const takeUnique = (items: Purchase[]) => {
    for (const p of items) {
      if (seen.has(p.id)) {
        continue;
      }
      seen.add(p.id);
      out.push(p);
      if (out.length >= TRENDING_LIMIT) {
        return true;
      }
    }
    return false;
  };

  const queries = [
    new URLSearchParams({ deal: "almost", sort: "popular", limit: "8", offset: "0" }),
    new URLSearchParams({ deal: "active", sort: "popular", limit: "8", offset: "0" }),
    new URLSearchParams({ deal: "open", sort: "popular", limit: "8", offset: "0" }),
  ];

  for (const q of queries) {
    if (out.length >= TRENDING_LIMIT) {
      break;
    }
    try {
      const res = await api.get<CatalogResponse>(`/purchases/catalog?${q.toString()}`);
      takeUnique(res.data.items ?? []);
    } catch {
      /* следующий запрос */
    }
  }

  return out.slice(0, TRENDING_LIMIT);
}

export default function TrendingDealsSection() {
  const [items, setItems] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const list = await fetchTrendingPurchases();
        if (!cancelled) {
          setItems(list);
        }
      } catch (e) {
        if (!cancelled) {
          if (axios.isAxiosError(e)) {
            setError(e.response?.data?.message ?? "Не удалось загрузить сделки.");
          } else {
            setError("Ошибка сети.");
          }
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="trending" className={`${tokens.root} ${styles.section}`}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <div>
            <h2 className={styles.heading}>Трендовые групповые сделки</h2>
            <p className={styles.subtitle}>Популярные товары, близкие к целевому участию</p>
          </div>
          <Link href="/catalog" className={styles.viewAll}>
            Смотреть все
            <span className={`material-symbols-outlined ${styles.arrow}`}>arrow_forward</span>
          </Link>
        </div>

        {error ? <p className={styles.loadError}>{error}</p> : null}

        {loading ? (
          <p className={styles.loadingHint}>Загрузка сделок…</p>
        ) : items.length === 0 ? (
          <p className={styles.emptyHint}>
            Пока нет открытых закупок в каталоге.{" "}
            <Link href="/catalog" className={styles.emptyLink}>
              Перейти в каталог
            </Link>
          </p>
        ) : (
          <div className={styles.grid}>
            {items.map((p) => (
              <TrendingDealCard key={p.id} {...mapPurchaseToTrendingDeal(p)} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
