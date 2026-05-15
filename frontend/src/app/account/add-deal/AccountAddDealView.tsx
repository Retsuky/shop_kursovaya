"use client";

import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import PurchaseDealForm from "../../../components/purchases/PurchaseDealForm";
import {
  emptyDealForm,
  type PurchaseDealFormValues,
} from "../../../components/purchases/purchaseDealFormTypes";
import api from "../../../lib/api";
import { formatRub } from "../../../lib/catalogDisplay";
import type { Purchase, PurchaseStatus } from "../../../lib/purchasesMeta";
import { STATUS_LABELS } from "../../../lib/purchasesMeta";
import tokens from "../../components/landing/landing-tokens.module.css";
import sub from "../account-subpages.module.css";
import formStyles from "../../admin/admin.module.css";

type MinePayload = {
  organized: Purchase[];
  joined: (Purchase & { my_quantity?: number })[];
};

const SUBMISSION_STATUSES = new Set<PurchaseStatus>(["pending_review", "rejected"]);

function submitBodyFromForm(form: PurchaseDealFormValues) {
  return {
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
      form.retail_price.trim() === "" ? null : Number(String(form.retail_price).replace(",", ".")),
  };
}

function sortSubmissions(a: Purchase, b: Purchase): number {
  const rank = (s: string) => (s === "pending_review" ? 0 : 1);
  const diff = rank(String(a.status)) - rank(String(b.status));
  if (diff !== 0) {
    return diff;
  }
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function formatSubmittedAt(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AccountAddDealView() {
  const [form, setForm] = useState(() => emptyDealForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submissions, setSubmissions] = useState<Purchase[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);

  const loadSubmissions = useCallback(async () => {
    setSubmissionsLoading(true);
    try {
      const { data } = await api.get<MinePayload>("/purchases/mine");
      const list = data.organized
        .filter((p) => SUBMISSION_STATUSES.has(String(p.status) as PurchaseStatus))
        .sort(sortSubmissions);
      setSubmissions(list);
    } catch {
      setSubmissions([]);
    } finally {
      setSubmissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  const pendingCount = useMemo(
    () => submissions.filter((p) => p.status === "pending_review").length,
    [submissions]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitSuccess(false);
    setSaving(true);
    try {
      await api.post<Purchase>("/purchases/submit", submitBodyFromForm(form));
      setSubmitSuccess(true);
      setForm(emptyDealForm());
      await loadSubmissions();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Не удалось отправить заявку.");
      } else {
        setError("Ошибка сети.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={tokens.root}>
      <header className={sub.pageHead}>
        <h1 className={sub.pageTitle}>Добавить сделку</h1>
        <p className={sub.pageLead}>
          Оставьте заявку на товар, который появится в каталоге после рассмотрения администратором.
        </p>
      </header>

      <section className={sub.submissionsSection} aria-labelledby="my-submissions-heading">
        <h2 id="my-submissions-heading" className={sub.submissionsSectionTitle}>
          Мои заявки
          {pendingCount > 0 ? ` (${pendingCount} на рассмотрении)` : null}
        </h2>
        {submissionsLoading ? (
          <p className={sub.submissionMeta}>Загрузка…</p>
        ) : submissions.length === 0 ? (
          <p className={sub.submissionMeta}>Пока нет отправленных заявок.</p>
        ) : (
          <ul className={sub.submissionsList}>
            {submissions.map((p) => {
              const status = String(p.status) as PurchaseStatus;
              const imageUrl = p.image_url?.trim() ?? "";
              const statusLabel = STATUS_LABELS[status] ?? status;
              const statusClass =
                status === "rejected" ? sub.submissionStatusRejected : sub.submissionStatusPending;

              return (
                <li key={p.id} className={sub.submissionCard}>
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt=""
                      width={72}
                      height={72}
                      className={sub.submissionThumb}
                      unoptimized
                    />
                  ) : (
                    <div
                      className={`${sub.submissionThumb} ${sub.submissionThumbPlaceholder}`}
                      aria-hidden
                    >
                      <span className="material-symbols-outlined">inventory_2</span>
                    </div>
                  )}
                  <div className={sub.submissionBody}>
                    <div className={sub.submissionHead}>
                      <h3 className={sub.submissionTitle}>{p.title}</h3>
                      <span className={`${sub.submissionStatus} ${statusClass}`}>{statusLabel}</span>
                    </div>
                    <p className={sub.submissionMeta}>
                      {p.product_name} · {formatRub(p.unit_price)} · отправлена{" "}
                      {formatSubmittedAt(p.created_at)}
                    </p>
                    {status === "pending_review" ? (
                      <p className={sub.submissionMeta}>Ожидает решения администратора.</p>
                    ) : (
                      <p className={sub.submissionMeta}>
                        Заявка отклонена. Можно отправить новую с другими данными.
                      </p>
                    )}
                    <Link href={`/purchases/${p.id}`} className={formStyles.btnGhost} style={{ marginTop: 10 }}>
                      Подробнее
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {submitSuccess ? (
        <div className={sub.submitSuccessBanner} role="status">
          Заявка отправлена. После одобрения сделка появится в каталоге.
        </div>
      ) : null}

      {error ? <div className={formStyles.alert}>{error}</div> : null}

      <section className={formStyles.formCard}>
        <PurchaseDealForm
          form={form}
          onChange={setForm}
          onSubmit={handleSubmit}
          submitLabel="Оставить заявку"
          saving={saving}
          cancelHref="/account"
        />
      </section>
    </div>
  );
}
