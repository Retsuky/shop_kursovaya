"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import MarketingFooter from "../components/landing/MarketingFooter";
import MarketingHeader from "../components/landing/MarketingHeader";
import tokens from "../components/landing/landing-tokens.module.css";
import homeLanding from "../home/home-landing.module.css";
import api from "../../lib/api";
import { getAuthSession, subscribeToAuthChanges } from "../../lib/auth";
import type { Purchase, PurchaseStatus } from "../../lib/purchasesMeta";
import { STATUS_LABELS, STATUS_ORDER } from "../../lib/purchasesMeta";
import styles from "./admin.module.css";

type AdminUserRow = {
  id: number;
  name: string;
  email: string;
  created_at: string;
  is_admin: boolean;
};

type AdminPurchaseDetail = {
  purchase: Purchase;
  organizer: { id: number; name: string };
  participants: unknown[];
};

const ALL_STATUSES: PurchaseStatus[] = [...STATUS_ORDER, "cancelled"];

function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultDeadlineLocal() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setMinutes(0, 0, 0);
  return toDatetimeLocal(d);
}

function emptyForm(organizerId: string) {
  return {
    organizer_id: organizerId,
    title: "",
    description: "",
    product_name: "",
    unit_price: "100",
    min_participants: "5",
    deadline: defaultDeadlineLocal(),
    city: "",
    pickup_address: "",
    category: "",
    image_url: "",
    retail_price: "",
    status: "collecting" as PurchaseStatus,
  };
}

type Props = {
  mode: "new" | "edit";
  purchaseId?: number;
};

export default function AdminProductForm({ mode, purchaseId }: Props) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => emptyForm(""));

  const syncAccess = useCallback(() => {
    const session = getAuthSession();
    if (!session) {
      setAllowed(false);
      router.replace("/");
      return;
    }
    if (session.user.is_admin !== true) {
      setAllowed(false);
      router.replace("/home");
      return;
    }
    setAllowed(true);
  }, [router]);

  useEffect(() => {
    syncAccess();
    return subscribeToAuthChanges(syncAccess);
  }, [syncAccess]);

  useEffect(() => {
    if (!allowed) {
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");
      try {
        const { data: userRows } = await api.get<AdminUserRow[]>("/admin/users");
        if (cancelled) {
          return;
        }
        setUsers(userRows);

        if (mode === "edit" && purchaseId != null && Number.isInteger(purchaseId)) {
          const { data: detail } = await api.get<AdminPurchaseDetail>(`/admin/purchases/${purchaseId}`);
          if (cancelled) {
            return;
          }
          const p = detail.purchase;
          setForm({
            organizer_id: String(p.organizer_id),
            title: p.title,
            description: p.description ?? "",
            product_name: p.product_name,
            unit_price: String(p.unit_price),
            min_participants: String(p.min_participants),
            deadline: toDatetimeLocal(new Date(p.deadline)),
            city: p.city ?? "",
            pickup_address: p.pickup_address ?? "",
            category: p.category ?? "",
            image_url: p.image_url ?? "",
            retail_price: p.retail_price != null ? String(p.retail_price) : "",
            status: (p.status as PurchaseStatus) || "collecting",
          });
        } else {
          const org = userRows[0] ? String(userRows[0].id) : "";
          setForm(emptyForm(org));
        }
      } catch (e) {
        if (!cancelled && axios.isAxiosError(e)) {
          setError(e.response?.data?.message ?? "Не удалось загрузить данные формы.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [allowed, mode, purchaseId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body = {
        organizer_id: Number(form.organizer_id),
        title: form.title.trim(),
        description: form.description.trim(),
        product_name: form.product_name.trim(),
        unit_price: Number(String(form.unit_price).replace(",", ".")),
        min_participants: Number(form.min_participants),
        deadline: new Date(form.deadline).toISOString(),
        city: form.city.trim(),
        pickup_address: form.pickup_address.trim(),
        category: form.category.trim(),
        image_url: form.image_url.trim(),
        retail_price:
          form.retail_price.trim() === ""
            ? null
            : Number(String(form.retail_price).replace(",", ".")),
        status: mode === "new" ? ("collecting" as PurchaseStatus) : form.status,
      };

      if (mode === "edit" && purchaseId != null) {
        await api.patch<Purchase>(`/admin/purchases/${purchaseId}`, body);
      } else {
        await api.post<Purchase>("/admin/purchases", body);
      }

      router.push("/admin");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Не удалось сохранить.");
      } else {
        setError("Ошибка сохранения.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!allowed) {
    return null;
  }

  const title =
    mode === "new" ? "Добавить товар в каталог" : `Редактировать товар #${purchaseId ?? ""}`;

  return (
    <div className={`${tokens.root} ${homeLanding.landing}`}>
      <MarketingHeader />
      <div className={styles.page}>
        <p className={styles.formBack}>
          <Link href="/admin">← Назад к админ-каталогу</Link>
        </p>
        <header className={styles.head}>
          <p className={styles.badge}>{mode === "new" ? "Новая позиция" : "Редактирование"}</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>
            В разделе каталога «Открытые» показываются только сделки со статусом «Сбор заявок» и с датой окончания сбора
            в будущем. Новая позиция всегда создаётся в статусе «Сбор заявок»; этапы оплаты и завершения меняйте при
            редактировании.
          </p>
        </header>

        {error ? <div className={styles.alert}>{error}</div> : null}

        {loading ? (
          <p className={styles.muted}>Загрузка формы…</p>
        ) : users.length === 0 ? (
          <p className={styles.alert}>Нет пользователей — некому назначить организатора. Сначала зарегистрируйте аккаунт.</p>
        ) : (
          <section className={styles.formCard}>
            <form className={styles.formGrid} onSubmit={handleSubmit}>
              <label className={styles.field}>
                Организатор
                <select
                  value={form.organizer_id}
                  onChange={(e) => setForm((f) => ({ ...f, organizer_id: e.target.value }))}
                  required
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </label>
              {mode === "edit" ? (
                <label className={styles.field}>
                  Статус заказа
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PurchaseStatus }))}
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <span>Статус</span>
                  <p className={styles.formNote}>
                    Будет установлен «{STATUS_LABELS.collecting}» — иначе карточка не попадёт в раздел «Открытые» на
                    витрине.
                  </p>
                </div>
              )}
              <label className={styles.field}>
                Название в каталоге
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </label>
              <label className={styles.field}>
                Наименование товара
                <input
                  value={form.product_name}
                  onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
                  required
                />
              </label>
              <label className={styles.field}>
                Цена за ед., ₽
                <input
                  value={form.unit_price}
                  onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
                  required
                />
              </label>
              <label className={styles.field}>
                Мин. участников
                <input
                  type="number"
                  min={1}
                  value={form.min_participants}
                  onChange={(e) => setForm((f) => ({ ...f, min_participants: e.target.value }))}
                  required
                />
              </label>
              <label className={styles.field}>
                Срок сбора
                <input
                  type="datetime-local"
                  value={form.deadline}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                  required
                />
              </label>
              <label className={styles.field}>
                Розница, ₽ (необяз.)
                <input
                  value={form.retail_price}
                  onChange={(e) => setForm((f) => ({ ...f, retail_price: e.target.value }))}
                  placeholder="—"
                />
              </label>
              <label className={styles.field}>
                Категория
                <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
                <span className={styles.fieldHint}>
                  Если в каталоге включены фильтры по категориям, пустое поле скроет товар из выборки — укажите, например,
                  «Электроника».
                </span>
              </label>
              <label className={styles.fieldFull}>
                URL изображения
                <input
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://…"
                />
              </label>
              <label className={styles.field}>
                Город
                <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </label>
              <label className={styles.fieldFull}>
                Адрес выдачи
                <textarea
                  value={form.pickup_address}
                  onChange={(e) => setForm((f) => ({ ...f, pickup_address: e.target.value }))}
                />
              </label>
              <label className={styles.fieldFull}>
                Описание
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </label>
              <div className={`${styles.formActions} ${styles.fieldFull}`}>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {mode === "new" ? "Добавить в каталог" : "Сохранить изменения"}
                </button>
                <Link href="/admin" className={styles.btnGhost}>
                  Отмена
                </Link>
                <Link href="/catalog?deal=all" className={styles.btnGhost}>
                  Каталог (все сделки)
                </Link>
                <Link href="/catalog" className={styles.btnGhost}>
                  Каталог (только открытые)
                </Link>
              </div>
            </form>
          </section>
        )}
      </div>
      <MarketingFooter />
    </div>
  );
}
