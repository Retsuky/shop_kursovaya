"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "../../components/header/Header";
import styles from "../../page.module.css";
import pageStyles from "./new.module.css";
import api from "../../../lib/api";
import { getAuthSession } from "../../../lib/auth";
import type { Purchase } from "../../../lib/purchasesMeta";

function toDatetimeLocal(isoDeadline: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = isoDeadline.getFullYear();
  const m = pad(isoDeadline.getMonth() + 1);
  const day = pad(isoDeadline.getDate());
  const h = pad(isoDeadline.getHours());
  const min = pad(isoDeadline.getMinutes());

  return `${y}-${m}-${day}T${h}:${min}`;
}

export default function NewPurchasePage() {
  const router = useRouter();
  const defaultDeadline = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setMinutes(0, 0, 0);

    return toDatetimeLocal(d);
  };

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [product_name, setProductName] = useState("");
  const [unit_price, setUnitPrice] = useState("100");
  const [min_participants, setMinParticipants] = useState("5");
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [city, setCity] = useState("");
  const [pickup_address, setPickupAddress] = useState("");
  const [category, setCategory] = useState("");
  const [image_url, setImageUrl] = useState("");
  const [retail_price, setRetailPrice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const session = getAuthSession();

    if (!session) {
      router.replace("/");
      return;
    }

    setAuthorized(true);
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await api.post<Purchase>("/purchases", {
        title,
        description,
        product_name,
        unit_price: Number(String(unit_price).replace(",", ".")),
        min_participants: Number(min_participants),
        deadline: new Date(deadline).toISOString(),
        city,
        pickup_address,
        category: category.trim() || undefined,
        image_url: image_url.trim() || undefined,
        retail_price:
          retail_price.trim() === "" ? undefined : Number(String(retail_price).replace(",", ".")),
      });

      router.push(`/purchases/${res.data.id}`);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setError(e.response?.data?.message ?? "Не удалось создать закупку.");
      } else {
        setError("Произошла ошибка.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Header />
        <section className={`${styles.content} ${pageStyles.layout}`}>
          <Link href="/catalog" className={pageStyles.backLink}>
            ← в каталог
          </Link>
          <h1 className={pageStyles.title}>Новая закупка</h1>
          <p className={pageStyles.lead}>Заполните данные — участники смогут присоединиться и указать объём заказа.</p>

          <form className={pageStyles.form} onSubmit={handleSubmit}>
            <label className={pageStyles.field}>
              Название закупки
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Например, Кофе в зёрнах, эспрессо"
              />
            </label>

            <label className={pageStyles.field}>
              Что именно покупаете (товар)
              <input
                value={product_name}
                onChange={(e) => setProductName(e.target.value)}
                required
                placeholder="Наименование и краткая характеристика"
              />
            </label>

            <label className={`${pageStyles.field} ${pageStyles.fieldWide}`}>
              Описание
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Условия, ссылка на товар, требования к качеству"
              />
            </label>

            <div className={pageStyles.row}>
              <label className={pageStyles.field}>
                Категория (для каталога)
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">— не указана —</option>
                  <option value="Электроника">Электроника</option>
                  <option value="Дом и уют">Дом и уют</option>
                  <option value="Одежда и обувь">Одежда и обувь</option>
                  <option value="Мода">Мода</option>
                  <option value="Фитнес">Фитнес</option>
                  <option value="Аксессуары">Аксессуары</option>
                  <option value="Дом и кухня">Дом и кухня</option>
                </select>
              </label>
              <label className={pageStyles.field}>
                Розничная цена, ₽ (зачёркнутая)
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={retail_price}
                  onChange={(e) => setRetailPrice(e.target.value)}
                  placeholder="Необязательно"
                />
              </label>
            </div>

            <label className={`${pageStyles.field} ${pageStyles.fieldWide}`}>
              URL картинки (для каталога)
              <input
                type="text"
                value={image_url}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
              />
            </label>

            <div className={pageStyles.row}>
              <label className={pageStyles.field}>
                Цена за единицу, ₽
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={unit_price}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  required
                />
              </label>
              <label className={pageStyles.field}>
                Мин. число участников
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={min_participants}
                  onChange={(e) => setMinParticipants(e.target.value)}
                  required
                />
              </label>
              <label className={pageStyles.field}>
                Сбор заявок до
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                />
              </label>
            </div>

            <div className={pageStyles.row}>
              <label className={pageStyles.field}>
                Город (необязательно)
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Москва" />
              </label>
              <label className={`${pageStyles.field} ${pageStyles.fieldGrow}`}>
                Точка выдачи / комментарий
                <input
                  value={pickup_address}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Метро, адрес склада или правила получения"
                />
              </label>
            </div>

            {error ? <div className={pageStyles.errorBanner}>{error}</div> : null}

            <button type="submit" className={pageStyles.submit} disabled={submitting}>
              {submitting ? "Создание..." : "Создать закупку"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
