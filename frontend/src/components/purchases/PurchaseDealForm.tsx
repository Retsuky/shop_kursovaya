"use client";

import { useRef, useState } from "react";
import { uploadProductImage } from "../../lib/uploadProductImage";
import type { PurchaseStatus } from "../../lib/purchasesMeta";
import { STATUS_LABELS } from "../../lib/purchasesMeta";
import {
  CATALOG_CATEGORIES,
  type PurchaseDealFormValues,
} from "./purchaseDealFormTypes";
import styles from "../../app/admin/admin.module.css";

type UserOption = { id: number; name: string; email: string };

type Props = {
  form: PurchaseDealFormValues;
  onChange: (next: PurchaseDealFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  saving?: boolean;
  showOrganizer?: boolean;
  users?: UserOption[];
  showStatusSelect?: boolean;
  statusOptions?: PurchaseStatus[];
  extraActions?: React.ReactNode;
  cancelHref?: string;
};

const ALL_STATUSES: PurchaseStatus[] = [
  "collecting",
  "closed",
  "completed",
  "cancelled",
  "pending_review",
  "rejected",
];

export default function PurchaseDealForm({
  form,
  onChange,
  onSubmit,
  submitLabel,
  saving = false,
  showOrganizer = false,
  users = [],
  showStatusSelect = false,
  statusOptions = ALL_STATUSES,
  extraActions,
  cancelHref,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const categoryKnown = CATALOG_CATEGORIES.includes(form.category);

  const set = (patch: Partial<PurchaseDealFormValues>) => {
    onChange({ ...form, ...patch });
  };

  return (
    <form className={styles.formGrid} onSubmit={onSubmit}>
      {uploadError ? <div className={`${styles.alert} ${styles.fieldFull}`}>{uploadError}</div> : null}

      {showOrganizer ? (
        <label className={styles.field}>
          Организатор
          <select
            value={form.organizer_id}
            onChange={(e) => set({ organizer_id: e.target.value })}
            required
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {showStatusSelect ? (
        <label className={styles.field}>
          Статус
          <select
            value={form.status}
            onChange={(e) => set({ status: e.target.value as PurchaseStatus })}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className={styles.field}>
        Название в каталоге
        <input value={form.title} onChange={(e) => set({ title: e.target.value })} required />
      </label>
      <label className={styles.field}>
        Наименование товара
        <input
          value={form.product_name}
          onChange={(e) => set({ product_name: e.target.value })}
          required
        />
      </label>
      <label className={styles.field}>
        Цена со скидкой, ₽
        <input
          value={form.unit_price}
          onChange={(e) => set({ unit_price: e.target.value })}
          required
        />
      </label>
      <label className={styles.field}>
        Участников для скидки
        <input
          type="number"
          min={1}
          value={form.min_participants}
          onChange={(e) => set({ min_participants: e.target.value })}
          required
        />
      </label>
      <label className={styles.field}>
        Цена без скидки, ₽ (необяз.)
        <input
          value={form.retail_price}
          onChange={(e) => set({ retail_price: e.target.value })}
          placeholder="—"
        />
      </label>
      <label className={styles.field}>
        Срок сбора
        <input
          type="datetime-local"
          value={form.deadline}
          onChange={(e) => set({ deadline: e.target.value })}
          required
        />
      </label>

      <label className={styles.field}>
        Категория
        <select value={form.category} onChange={(e) => set({ category: e.target.value })} required>
          <option value="" disabled>
            Выберите категорию
          </option>
          {!categoryKnown && form.category ? (
            <option value={form.category}>{form.category} (текущее значение)</option>
          ) : null}
          {CATALOG_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <span className={styles.fieldHint}>Те же категории, что в фильтрах каталога.</span>
      </label>

      <label className={styles.fieldFull}>
        Изображение товара
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
          className={styles.visuallyHidden}
          tabIndex={-1}
          aria-hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) {
              return;
            }
            setUploadError("");
            setUploadBusy(true);
            try {
              const url = await uploadProductImage(file);
              set({ image_url: url });
            } catch (err) {
              setUploadError(err instanceof Error ? err.message : "Не удалось загрузить изображение.");
            } finally {
              setUploadBusy(false);
            }
          }}
        />
        <div className={styles.imageUploadRow}>
          <button
            type="button"
            className={`${styles.btnGhost} ${styles.imagePickBtn}`}
            disabled={uploadBusy || saving}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadBusy ? "Загрузка…" : form.image_url.trim() ? "Заменить файл…" : "Выбрать файл…"}
          </button>
          {form.image_url.trim() ? (
            <button
              type="button"
              className={styles.imageUploadClear}
              disabled={uploadBusy || saving}
              onClick={() => set({ image_url: "" })}
            >
              Убрать
            </button>
          ) : null}
        </div>
        {form.image_url.trim() ? (
          <div className={styles.imagePreviewWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.image_url.trim()} alt="" className={styles.imagePreview} />
          </div>
        ) : (
          <span className={styles.fieldHint}>Необязательно. JPEG, PNG, GIF или WebP, до 5 МБ.</span>
        )}
      </label>

      <label className={styles.field}>
        Город
        <input value={form.city} onChange={(e) => set({ city: e.target.value })} />
      </label>
      <label className={styles.fieldFull}>
        Адрес выдачи
        <textarea value={form.pickup_address} onChange={(e) => set({ pickup_address: e.target.value })} />
      </label>
      <label className={styles.fieldFull}>
        Описание
        <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} />
      </label>

      <div className={`${styles.formActions} ${styles.fieldFull}`}>
        <button type="submit" className={styles.btnPrimary} disabled={saving || uploadBusy}>
          {submitLabel}
        </button>
        {extraActions}
        {cancelHref ? (
          <a href={cancelHref} className={styles.btnGhost}>
            Отмена
          </a>
        ) : null}
      </div>
    </form>
  );
}
