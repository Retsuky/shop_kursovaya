"use client";

import axios from "axios";
import Link from "next/link";
import { useState } from "react";
import PurchaseDealForm from "../../../components/purchases/PurchaseDealForm";
import {
  emptyDealForm,
  type PurchaseDealFormValues,
} from "../../../components/purchases/purchaseDealFormTypes";
import api from "../../../lib/api";
import type { Purchase } from "../../../lib/purchasesMeta";
import tokens from "../../components/landing/landing-tokens.module.css";
import sub from "../account-subpages.module.css";
import formStyles from "../../admin/admin.module.css";

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

export default function AccountAddDealView() {
  const [form, setForm] = useState(() => emptyDealForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post<Purchase>("/purchases/submit", submitBodyFromForm(form));
      setSuccess(true);
      setForm(emptyDealForm());
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

  if (success) {
    return (
      <div className={tokens.root}>
        <header className={sub.pageHead}>
          <h1 className={sub.pageTitle}>Заявка отправлена</h1>
          <p className={sub.pageLead}>
            Администратор рассмотрит предложение. После одобрения сделка появится в каталоге, и вы сможете
            приглашать участников.
          </p>
        </header>
        <div className={formStyles.formCard} style={{ padding: 24 }}>
          <Link href="/account" className={formStyles.btnPrimary} style={{ display: "inline-flex" }}>
            В личный кабинет
          </Link>{" "}
          <button
            type="button"
            className={formStyles.btnGhost}
            style={{ marginLeft: 12 }}
            onClick={() => setSuccess(false)}
          >
            Отправить ещё одну заявку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={tokens.root}>
      <header className={sub.pageHead}>
        <h1 className={sub.pageTitle}>Добавить сделку</h1>
        <p className={sub.pageLead}>
          Оставьте заявку на товар, который появится в каталоге после рассмотрения администратором.
        </p>
      </header>

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
