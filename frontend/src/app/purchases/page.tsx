"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import Header from "../components/header/Header";
import styles from "../page.module.css";
import pageStyles from "./page.module.css";
import api from "../../lib/api";
import type { Purchase } from "../../lib/purchasesMeta";
import { STATUS_LABELS } from "../../lib/purchasesMeta";

export default function PurchasesCatalogPage() {
  const [items, setItems] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const queryString = useMemo(() => {
    if (statusFilter === "all") {
      return "";
    }

    return `?status=${encodeURIComponent(statusFilter)}`;
  }, [statusFilter]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const url = `/purchases${queryString}`;
        const res = await api.get<Purchase[]>(url);

        if (!cancelled) {
          setItems(res.data);
        }
      } catch (e) {
        if (!cancelled) {
          if (axios.isAxiosError(e)) {
            setError(e.response?.data?.message ?? "Не удалось загрузить закупки.");
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
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [queryString]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Header />
        <section className={`${styles.content} ${pageStyles.layout}`}>
          <div className={pageStyles.topRow}>
            <div>
              <h1 className={pageStyles.title}>Активные закупки</h1>
              <p className={pageStyles.subtitle}>
                Участвуйте в совместных закупках или создайте свою — все заявки и статусы в одном месте.
              </p>
            </div>
            <div className={pageStyles.actionsRow}>
              <Link href="/purchases/new" className={pageStyles.primaryButton}>
                Новая закупка
              </Link>
              <Link href="/account" className={pageStyles.secondaryButton}>
                Мой аккаунт
              </Link>
            </div>
          </div>

          <div className={pageStyles.filters}>
            <label className={pageStyles.filterLabel} htmlFor="status-filter">
              Статус
            </label>
            <select
              id="status-filter"
              className={pageStyles.select}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Все статусы</option>
              {Object.keys(STATUS_LABELS).map((key) => (
                <option key={key} value={key}>
                  {STATUS_LABELS[key as keyof typeof STATUS_LABELS]}
                </option>
              ))}
            </select>
          </div>

          {error ? <div className={pageStyles.errorBanner}>{error}</div> : null}

          {loading ? <div className={pageStyles.loading}>Загрузка…</div> : null}

          {!loading && !items.length ? (
            <div className={pageStyles.emptyState}>
              <p>Закупок с выбранным фильтром пока нет.</p>
              <p>Создайте первую закупку или смените статус фильтра.</p>
            </div>
          ) : null}

          {!loading && items.length > 0 ? (
            <div className={pageStyles.grid}>
              {items.map((item) => (
                <article key={item.id} className={pageStyles.card}>
                  <div className={pageStyles.cardTitleRow}>
                    <h2 className={pageStyles.cardTitle}>{item.title}</h2>
                    <span className={pageStyles.badge}>
                      {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] ?? item.status}
                    </span>
                  </div>
                  <p className={pageStyles.product}>{item.product_name}</p>
                  <div className={pageStyles.priceRow}>
                    <span>
                      Цена: <strong>{item.unit_price} ₽</strong> за шт.
                    </span>
                    <span>
                      Участников: <strong>{item.participant_count ?? 0}</strong>
                    </span>
                  </div>
                  <div className={pageStyles.meta}>
                    Организатор: <strong>{item.organizer_name ?? "—"}</strong>
                    <br />
                    Сбор до:{" "}
                    <strong>{new Date(item.deadline).toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short", year: "numeric" })}</strong>
                    {item.city ? (
                      <>
                        <br />
                        Город: {item.city}
                      </>
                    ) : null}
                  </div>
                  <Link className={pageStyles.primaryButton} href={`/purchases/${item.id}`}>
                    Открыть
                  </Link>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
