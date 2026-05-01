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
import { formatRub } from "../../lib/catalogDisplay";
import type { Purchase, PurchaseStatus } from "../../lib/purchasesMeta";
import { STATUS_LABELS } from "../../lib/purchasesMeta";
import AdminProductCard from "./AdminProductCard";
import styles from "./admin.module.css";

type AdminUserRow = {
  id: number;
  name: string;
  email: string;
  created_at: string;
  is_admin: boolean;
};

type ParticipantRow = {
  user_id: number;
  user_name: string;
  user_email: string;
  quantity: number;
};

type AdminPurchaseDetail = {
  purchase: Purchase;
  organizer: { id: number; name: string };
  participants: ParticipantRow[];
};

export default function AdminPanel() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [tab, setTab] = useState<"deals" | "users">("deals");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [participantsModalId, setParticipantsModalId] = useState<number | null>(null);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsDetail, setParticipantsDetail] = useState<AdminPurchaseDetail | null>(null);
  const [participantsError, setParticipantsError] = useState("");

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

  const loadPurchases = useCallback(async () => {
    const { data } = await api.get<Purchase[]>("/admin/purchases");
    setPurchases(data);
  }, []);

  const loadUsers = useCallback(async () => {
    const { data } = await api.get<AdminUserRow[]>("/admin/users");
    setUsers(data);
  }, []);

  const refresh = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      await Promise.all([loadPurchases(), loadUsers()]);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setError(e.response?.data?.message ?? "Не удалось загрузить данные.");
      } else {
        setError("Ошибка сети.");
      }
    } finally {
      setLoading(false);
    }
  }, [loadPurchases, loadUsers]);

  useEffect(() => {
    if (!allowed) {
      return;
    }
    void refresh();
  }, [allowed, refresh]);

  async function changeStatus(id: number, status: PurchaseStatus) {
    setError("");
    try {
      await api.patch<Purchase>(`/admin/purchases/${id}`, { status });
      await loadPurchases();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Не удалось сменить статус.");
      }
    }
  }

  async function removePurchase(id: number) {
    if (!window.confirm("Удалить товар из каталога и все заявки участников?")) {
      return;
    }
    setError("");
    try {
      await api.delete(`/admin/purchases/${id}`);
      await loadPurchases();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Не удалось удалить.");
      }
    }
  }

  async function openParticipantsModal(purchaseId: number) {
    setParticipantsModalId(purchaseId);
    setParticipantsDetail(null);
    setParticipantsError("");
    setParticipantsLoading(true);
    try {
      const { data } = await api.get<AdminPurchaseDetail>(`/admin/purchases/${purchaseId}`);
      setParticipantsDetail(data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setParticipantsError(err.response?.data?.message ?? "Не удалось загрузить участников.");
      } else {
        setParticipantsError("Ошибка загрузки.");
      }
    } finally {
      setParticipantsLoading(false);
    }
  }

  function closeParticipantsModal() {
    setParticipantsModalId(null);
    setParticipantsDetail(null);
    setParticipantsError("");
    setParticipantsLoading(false);
  }

  useEffect(() => {
    if (participantsModalId == null) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeParticipantsModal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [participantsModalId]);

  async function removeUser(id: number) {
    if (!window.confirm("Удалить пользователя и связанные данные (каскадом)?")) {
      return;
    }
    setError("");
    try {
      await api.delete(`/admin/users/${id}`);
      await loadUsers();
      await loadPurchases();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Не удалось удалить пользователя.");
      }
    }
  }

  if (!allowed) {
    return null;
  }

  return (
    <div className={`${tokens.root} ${homeLanding.landing}`}>
      <MarketingHeader />
      <div className={styles.page}>
        <header className={styles.head}>
          <p className={styles.badge}>Администрирование</p>
          <h1 className={styles.title}>Панель администратора</h1>
          <p className={styles.subtitle}>
            Товары на витрине показаны карточками как в каталоге. Добавление — отдельная страница. Редактирование — по
            кнопке на карточке. Отклики участников — в модальном окне.
          </p>
        </header>

        {error ? <div className={styles.alert}>{error}</div> : null}

        <div className={styles.tabs} role="tablist" aria-label="Разделы админки">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "deals"}
            className={tab === "deals" ? styles.tabActive : styles.tab}
            onClick={() => setTab("deals")}
          >
            Каталог (товары)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "users"}
            className={tab === "users" ? styles.tabActive : styles.tab}
            onClick={() => setTab("users")}
          >
            Пользователи
          </button>
        </div>

        {tab === "deals" ? (
          <>
            <div className={styles.toolbar}>
              <h2 className={styles.sectionTitle}>Товары в каталоге</h2>
              <div className={styles.toolbarActions}>
                <Link href="/catalog" className={styles.btnGhost}>
                  Витрина (открытые)
                </Link>
                <Link href="/catalog?deal=all" className={styles.btnGhost}>
                  Витрина (все сделки)
                </Link>
                <Link href="/admin/new" className={styles.btnPrimary}>
                  + Добавить товар
                </Link>
              </div>
            </div>
            <p className={styles.muted} style={{ marginTop: -12, marginBottom: 20 }}>
              На главной витрине по умолчанию только «Сбор заявок» и срок в будущем. Статусы вроде «Оплата» или
              «Завершена» смотрите в каталоге с фильтром «Все» или «Выкуплено».
            </p>

            {loading ? (
              <p className={styles.muted}>Загрузка…</p>
            ) : purchases.length === 0 ? (
              <p className={styles.muted}>
                Пока нет позиций.{" "}
                <Link href="/admin/new">Добавьте первый товар</Link>.
              </p>
            ) : (
              <div className={styles.cardGrid}>
                {purchases.map((p) => (
                  <AdminProductCard
                    key={p.id}
                    purchase={p}
                    onStatusChange={(id, status) => void changeStatus(id, status)}
                    onDelete={(id) => void removePurchase(id)}
                    onShowParticipants={(id) => void openParticipantsModal(id)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className={styles.tableWrap}>
            {loading ? (
              <p className={styles.muted} style={{ padding: 20 }}>
                Загрузка…
              </p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Имя</th>
                    <th>Email</th>
                    <th>Роль</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className={styles.mono}>{u.id}</td>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.is_admin ? <span className={styles.adminPill}>Админ</span> : "—"}</td>
                      <td>
                        <button type="button" className={styles.btnDanger} onClick={() => void removeUser(u.id)}>
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {participantsModalId != null ? (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-participants-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeParticipantsModal();
            }
          }}
        >
          <div className={styles.modalPanel}>
            <div className={styles.modalHead}>
              <div>
                <h2 id="admin-participants-title" className={styles.modalTitle}>
                  Откликнувшиеся на покупку
                </h2>
                {participantsDetail ? (
                  <p className={styles.modalMeta}>
                    {participantsDetail.purchase.title} · {formatRub(participantsDetail.purchase.unit_price)} за шт. ·{" "}
                    {STATUS_LABELS[participantsDetail.purchase.status as PurchaseStatus] ||
                      String(participantsDetail.purchase.status)}
                  </p>
                ) : (
                  <p className={styles.modalMeta}>Загрузка…</p>
                )}
              </div>
              <button type="button" className={styles.modalClose} onClick={closeParticipantsModal} aria-label="Закрыть">
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {participantsLoading ? (
                <p className={styles.muted}>Загружаем список…</p>
              ) : participantsError ? (
                <p className={styles.alert}>{participantsError}</p>
              ) : participantsDetail ? (
                <>
                  <p className={styles.organizerNote}>
                    <strong>Организатор</strong> (ведёт сделку, в списке откликнувшихся не отображается):{" "}
                    {participantsDetail.organizer.name} · id {participantsDetail.organizer.id}
                  </p>
                  {participantsDetail.participants.length === 0 ? (
                    <p className={styles.muted}>
                      Пока никто не присоединился к этой закупке — ни одного участника в группе.
                    </p>
                  ) : (
                    <>
                      <table className={styles.participantTable}>
                        <thead>
                          <tr>
                            <th>Участник</th>
                            <th>Email</th>
                            <th>User id</th>
                            <th>Кол-во</th>
                          </tr>
                        </thead>
                        <tbody>
                          {participantsDetail.participants.map((row) => (
                            <tr key={row.user_id}>
                              <td>{row.user_name}</td>
                              <td>{row.user_email}</td>
                              <td className={styles.mono}>{row.user_id}</td>
                              <td className={styles.mono}>{row.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className={styles.participantSummary}>
                        Итого: {participantsDetail.participants.length}{" "}
                        {participantsDetail.participants.length === 1
                          ? "участник"
                          : participantsDetail.participants.length < 5
                            ? "участника"
                            : "участников"}
                        , {participantsDetail.participants.reduce((s, r) => s + r.quantity, 0)} ед. товара по заявкам.
                      </p>
                    </>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <MarketingFooter />
    </div>
  );
}
