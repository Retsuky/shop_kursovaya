"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import CatalogProductCard from "../components/catalog/CatalogProductCard";
import MarketingFooter from "../components/landing/MarketingFooter";
import MarketingHeader from "../components/landing/MarketingHeader";
import homeLanding from "../home/home-landing.module.css";
import api from "../../lib/api";
import type { CatalogResponse, Purchase } from "../../lib/purchasesMeta";
import styles from "./catalog.module.css";

const PAGE_SIZE = 12;

const CATEGORY_OPTIONS = [
  "Электроника",
  "Дом и уют",
  "Одежда и обувь",
  "Мода",
  "Фитнес",
  "Аксессуары",
  "Дом и кухня",
];

const PRICE_SLIDER_MAX = 100000;

type DealFilter = "open" | "active" | "almost" | "closed" | "all";

export default function CatalogView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const deal = (searchParams.get("deal") || "open") as DealFilter;
  const sort = searchParams.get("sort") || "popular";
  const maxPriceParam = searchParams.get("max_price");
  const categoriesParam = searchParams.get("categories");

  const [items, setItems] = useState<Purchase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCategories, setSelectedCategories] = useState<string[]>(() =>
    categoriesParam ? categoriesParam.split(",").filter(Boolean) : []
  );
  const [dealDraft, setDealDraft] = useState<DealFilter>(deal);
  const [sortDraft, setSortDraft] = useState(sort);
  const [priceDraft, setPriceDraft] = useState(() => {
    const n = maxPriceParam != null ? Number(maxPriceParam) : PRICE_SLIDER_MAX;
    return Number.isFinite(n) && n > 0 ? Math.min(PRICE_SLIDER_MAX, n) : PRICE_SLIDER_MAX;
  });

  useEffect(() => {
    setSelectedCategories(categoriesParam ? categoriesParam.split(",").filter(Boolean) : []);
    setDealDraft(deal);
    setSortDraft(sort);
    const n = maxPriceParam != null ? Number(maxPriceParam) : PRICE_SLIDER_MAX;
    setPriceDraft(Number.isFinite(n) && n > 0 ? Math.min(PRICE_SLIDER_MAX, n) : PRICE_SLIDER_MAX);
  }, [categoriesParam, deal, sort, maxPriceParam]);

  const queryString = useMemo(() => {
    const q = new URLSearchParams();
    q.set("limit", String(PAGE_SIZE));
    q.set("offset", String((page - 1) * PAGE_SIZE));
    q.set("deal", deal);
    q.set("sort", sort);
    if (maxPriceParam != null && maxPriceParam !== "" && Number(maxPriceParam) < PRICE_SLIDER_MAX) {
      q.set("max_price", maxPriceParam);
    }
    if (categoriesParam) {
      q.set("categories", categoriesParam);
    }
    return q.toString();
  }, [page, deal, sort, maxPriceParam, categoriesParam]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<CatalogResponse>(`/purchases/catalog?${queryString}`);
      setItems(res.data.items);
      setTotal(res.data.total);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setError(e.response?.data?.message ?? "Не удалось загрузить каталог.");
      } else {
        setError("Ошибка сети.");
      }
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const applyFilters = () => {
    const q = new URLSearchParams();
    q.set("deal", dealDraft);
    q.set("sort", sortDraft);
    if (selectedCategories.length) {
      q.set("categories", selectedCategories.join(","));
    }
    if (priceDraft < PRICE_SLIDER_MAX) {
      q.set("max_price", String(priceDraft));
    }
    router.push(`/catalog?${q.toString()}`);
  };

  const goPage = (p: number) => {
    const q = new URLSearchParams(searchParams.toString());
    q.set("page", String(p));
    router.push(`/catalog?${q.toString()}`);
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const subtitle = loading
    ? "Загрузка…"
    : total === 0
      ? "Нет позиций по выбранным условиям"
      : `Всего в выборке: ${total}`;

  return (
    <div className={homeLanding.landing}>
      <MarketingHeader />
      <main className={`${homeLanding.main} ${styles.main}`}>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarSticky}>
              <section>
                <h3 className={styles.sidebarTitle}>Категории</h3>
                <div className={styles.checkboxList}>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <label key={cat} className={styles.checkRow}>
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                      />
                      <span>{cat}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section>
                <h3 className={styles.sidebarTitle}>Статус сделки</h3>
                <div className={styles.radioList}>
                  {(
                    [
                      ["open", "Открытые"],
                      ["active", "Активно"],
                      ["almost", "Почти собран"],
                      ["closed", "Выкуплено"],
                      ["all", "Все"],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value} className={styles.checkRow}>
                      <input
                        type="radio"
                        name="deal"
                        checked={dealDraft === value}
                        onChange={() => setDealDraft(value)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section>
                <h3 className={styles.sidebarTitle}>Цена, ₽</h3>
                <input
                  type="range"
                  className={styles.range}
                  min={0}
                  max={PRICE_SLIDER_MAX}
                  step={500}
                  value={priceDraft}
                  onChange={(e) => setPriceDraft(Number(e.target.value))}
                />
                <div className={styles.rangeLabels}>
                  <span>0</span>
                  <span>{priceDraft >= PRICE_SLIDER_MAX ? "без лимита" : `${priceDraft.toLocaleString("ru-RU")} ₽`}</span>
                </div>
              </section>

              <button type="button" className={styles.applyBtn} onClick={applyFilters}>
                Применить фильтры
              </button>
            </div>
          </aside>

          <section className={styles.content}>
            <div className={styles.contentHead}>
              <div>
                <h1 className={styles.title}>Каталог товаров</h1>
                <p className={styles.subtitle}>{subtitle}</p>
              </div>
              <label className={styles.sortRow}>
                <span>Сортировка:</span>
                <select
                  className={styles.sortSelect}
                  value={sortDraft}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSortDraft(v);
                    const q = new URLSearchParams(searchParams.toString());
                    q.set("sort", v);
                    q.delete("page");
                    router.push(`/catalog?${q.toString()}`);
                  }}
                >
                  <option value="popular">Популярные</option>
                  <option value="newest">Новинки</option>
                  <option value="closing">Скоро закрываются</option>
                </select>
              </label>
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}

            {!loading && !error && items.length === 0 ? (
              <p className={styles.empty}>
                Попробуйте смягчить фильтры. Новые товары от администратора с этапами «Оплата» / «Завершена» не попадают
                в раздел «Открытые» — выберите в боковой панели «Все» или «Выкуплено», затем «Применить фильтры».{" "}
                <Link href="/catalog?deal=all">Показать все сделки</Link>.
              </p>
            ) : null}

            <div className={styles.grid}>
              {items.map((p) => (
                <CatalogProductCard
                  key={p.id}
                  purchase={p}
                  alreadyJoined={p.my_quantity != null && p.my_quantity > 0}
                />
              ))}
            </div>

            {totalPages > 1 ? (
              <nav className={styles.pagination} aria-label="Страницы">
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={page <= 1}
                  onClick={() => goPage(page - 1)}
                  aria-label="Предыдущая страница"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <span className={styles.pageStatus}>
                  Страница {page} из {totalPages}
                </span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={page >= totalPages}
                  onClick={() => goPage(page + 1)}
                  aria-label="Следующая страница"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </nav>
            ) : null}
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
