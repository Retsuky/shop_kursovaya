"use client";

import axios from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "../../components/header/Header";
import styles from "../../page.module.css";
import pageStyles from "./detail.module.css";
import api from "../../../lib/api";
import { getAuthSession, subscribeToAuthChanges, type AuthSession } from "../../../lib/auth";
import type { Purchase, PurchaseStatus } from "../../../lib/purchasesMeta";
import {
  STATUS_LABELS,
  getNextStatus,
} from "../../../lib/purchasesMeta";

type Participant = {
  user_id: number;
  quantity: number;
  user_name: string;
};

type DetailResponse = {
  purchase: Purchase;
  participants: Participant[];
};

export default function PurchaseDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const idParam = typeof routeParams?.id === "string" ? routeParams.id : "";
  const purchaseId = Number(idParam);

  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState<AuthSession | null>(null);

  const [qty, setQty] = useState("1");
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const sync = () => setSession(getAuthSession());
    sync();
    return subscribeToAuthChanges(sync);
  }, []);

  const loadPurchase = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get<DetailResponse>(`/purchases/${purchaseId}`);
      setData(res.data);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        if (e.response?.status === 404) {
          setError("Закупка не найдена.");
        } else {
          setError(e.response?.data?.message ?? "Не удалось загрузить закупку.");
        }
      } else {
        setError("Ошибка сети.");
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [purchaseId]);

  useEffect(() => {
    if (!Number.isInteger(purchaseId)) {
      setLoading(false);
      setError("Некорректная ссылка.");

      return undefined;
    }

    loadPurchase();

    return undefined;
  }, [purchaseId, loadPurchase]);

  const purchase = data?.purchase ?? null;
  const participants = data?.participants ?? [];

  const isOrganizer =
    session && purchase ? session.user.id === purchase.organizer_id : false;

  const myParticipant = useMemo(
    () =>
      session
        ? participants.find((participant) => participant.user_id === session.user.id)
        : undefined,
    [participants, session]
  );

  const totalSum = useMemo(() => {
    if (!purchase) {
      return 0;
    }

    const price = Number.parseFloat(purchase.unit_price);
    const qtyTotal = purchase.total_quantity ?? 0;

    if (!Number.isFinite(price)) {
      return 0;
    }

    return Math.round(price * qtyTotal * 100) / 100;
  }, [purchase]);

  const nextStatus = purchase
    ? getNextStatus(String(purchase.status))
    : null;

  async function handleAdvanceStatus() {
    if (!nextStatus) {
      return;
    }

    setActionError("");
    setPending(true);

    try {
      await api.patch(`/purchases/${purchaseId}/status`, { status: nextStatus });
      await loadPurchase();
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setActionError(e.response?.data?.message ?? "Не удалось сменить статус.");
      }
    } finally {
      setPending(false);
    }
  }

  async function handleCancel() {
    const ok = window.confirm("Отменить закупку для всех участников?");

    if (!ok) {
      return;
    }

    setActionError("");
    setPending(true);

    try {
      await api.patch(`/purchases/${purchaseId}/status`, { status: "cancelled" });
      await loadPurchase();
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setActionError(e.response?.data?.message ?? "Не удалось отменить.");
      }
    } finally {
      setPending(false);
    }
  }

  async function handleJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      router.push("/");

      return;
    }

    const q = Number(qty);

    if (!Number.isInteger(q) || q < 1) {
      setActionError("Укажите количество — целое число ≥ 1.");

      return;
    }

    setActionError("");
    setPending(true);

    try {
      await api.post(`/purchases/${purchaseId}/join`, { quantity: q });
      await loadPurchase();
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setActionError(e.response?.data?.message ?? "Не удалось присоединиться.");
      }
    } finally {
      setPending(false);
    }
  }

  async function handleLeave() {
    setActionError("");
    setPending(true);

    try {
      await api.delete(`/purchases/${purchaseId}/join`);
      await loadPurchase();
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setActionError(e.response?.data?.message ?? "Не удалось выйти.");
      }
    } finally {
      setPending(false);
    }
  }

  const deadlinePassed = purchase ? new Date(purchase.deadline).getTime() < Date.now() : false;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Header />
        <section className={`${styles.content} ${pageStyles.layout}`}>
          <Link href="/purchases" className={pageStyles.backLink}>
            ← ко всем закупкам
          </Link>

          {loading ? <div className={pageStyles.muted}>Загрузка…</div> : null}

          {!loading && error ? <div className={pageStyles.errorBanner}>{error}</div> : null}

          {!loading && !error && purchase ? (
            <>
              <div className={pageStyles.headerRow}>
                <div>
                  <h1 className={pageStyles.title}>{purchase.title}</h1>
                  <p className={pageStyles.metaLine}>
                    <span>{STATUS_LABELS[purchase.status as PurchaseStatus] ?? purchase.status}</span>
                    {" · "}Организатор <strong>{purchase.organizer_name}</strong>
                  </p>
                </div>
              </div>

              <section className={pageStyles.detailsGrid}>
                <article className={pageStyles.detailsCard}>
                  <h3>Товар и цена</h3>
                  <p className={pageStyles.bold}>{purchase.product_name}</p>
                  {purchase.description ? (
                    <p className={pageStyles.description}>{purchase.description}</p>
                  ) : null}
                  <p>
                    Цена за единицу:{" "}
                    <strong>{purchase.unit_price} ₽</strong>
                  </p>
                  <p>
                    Мин. участников: <strong>{purchase.min_participants}</strong>
                  </p>
                  <p>
                    Сбор заявок до:{" "}
                    <strong>
                      {new Date(purchase.deadline).toLocaleString("ru-RU")}
                    </strong>
                  </p>
                  {deadlinePassed && purchase.status === "collecting" ? (
                    <p className={pageStyles.warning}>Срок сбора истёк — новые заявки недоступны.</p>
                  ) : null}
                  {purchase.city ? <p>Город: {purchase.city}</p> : null}
                  {purchase.pickup_address ? <p>Выдача: {purchase.pickup_address}</p> : null}
                </article>

                <aside className={pageStyles.detailsCard}>
                  <h3>Итоги</h3>
                  <p>
                    Участников: <strong>{purchase.participant_count ?? 0}</strong>
                  </p>
                  <p>
                    Заявлено шт.: <strong>{purchase.total_quantity ?? 0}</strong>
                  </p>
                  <p>
                    Сумма заказов: <strong>{totalSum} ₽</strong>
                  </p>

                  {isOrganizer && purchase.status !== "cancelled" && purchase.status !== "completed" ? (
                    <div className={pageStyles.organizerActions}>
                      {nextStatus ? (
                        <button
                          type="button"
                          className={pageStyles.primaryButton}
                          disabled={pending}
                          onClick={handleAdvanceStatus}
                        >
                          Далее: {STATUS_LABELS[nextStatus]}
                        </button>
                      ) : null}
                      {purchase.status !== "cancelled" ? (
                        <button
                          type="button"
                          className={pageStyles.dangerButton}
                          disabled={pending}
                          onClick={handleCancel}
                        >
                          Отменить закупку
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {!isOrganizer && session && purchase.status === "collecting" && !deadlinePassed ? (
                    <form className={pageStyles.joinForm} onSubmit={handleJoin}>
                      <label>
                        Количество
                        <input
                          type="number"
                          min={1}
                          value={qty}
                          onChange={(e) => setQty(e.target.value)}
                        />
                      </label>
                      <button type="submit" className={pageStyles.primaryButton} disabled={pending}>
                        {myParticipant ? "Обновить заявку" : "Присоединиться"}
                      </button>
                      {myParticipant ? (
                        <button
                          type="button"
                          className={pageStyles.secondaryButton}
                          disabled={pending}
                          onClick={handleLeave}
                        >
                          Выйти из закупки
                        </button>
                      ) : null}
                    </form>
                  ) : null}

                  {!session && purchase.status === "collecting" && !deadlinePassed ? (
                    <p className={pageStyles.muted}>
                      <Link href="/" className={pageStyles.inlineLink}>
                        Войдите
                      </Link>
                      , чтобы присоединиться к закупке.
                    </p>
                  ) : null}
                </aside>
              </section>

              {actionError ? <div className={pageStyles.errorBanner}>{actionError}</div> : null}

              <section className={pageStyles.participantsSection}>
                <h2>Участники</h2>
                {participants.length === 0 ? (
                  <p className={pageStyles.muted}>Пока никто не присоединился.</p>
                ) : (
                  <ul className={pageStyles.participantList}>
                    {participants.map((participant) => (
                      <li key={participant.user_id}>
                        <span>{participant.user_name}</span>
                        <span className={pageStyles.qty}>× {participant.quantity}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}
