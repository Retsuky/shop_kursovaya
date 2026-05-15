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
import { getAuthSession, saveAuthSession, subscribeToAuthChanges } from "../../lib/auth";
import type { AuthUser } from "../../lib/auth";
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
  avatar_url?: string | null;
};

type ParticipantOrderStatus = "processing" | "assembly" | "delivery" | "handed";

type ParticipantRow = {
  user_id: number;
  user_name: string;
  user_email: string;
  avatar_url?: string | null;
  quantity: number;
  participant_status: ParticipantOrderStatus | string;
  delivery_method: "pickup" | "courier" | string;
  payment_method: "card" | "sbp" | string;
  delivery_address: string;
  delivery_comment: string;
  paid_at: string;
};

type AdminPurchaseDetail = {
  purchase: Purchase;
  organizer: { id: number; name: string };
  participants: ParticipantRow[];
};

export default function AdminPanel() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [tab, setTab] = useState<"deals" | "submissions" | "users">("deals");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [submissions, setSubmissions] = useState<Purchase[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [participantsModalId, setParticipantsModalId] = useState<number | null>(null);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsDetail, setParticipantsDetail] = useState<AdminPurchaseDetail | null>(null);
  const [participantsError, setParticipantsError] = useState("");
  const [participantsTab, setParticipantsTab] = useState<"joined" | "processing">("joined");

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

  const loadSubmissions = useCallback(async () => {
    const { data } = await api.get<Purchase[]>("/admin/submissions");
    setSubmissions(data);
  }, []);

  const refresh = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      await Promise.all([loadPurchases(), loadSubmissions(), loadUsers()]);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setError(e.response?.data?.message ?? "Не удалось загрузить данные.");
      } else {
        setError("Ошибка сети.");
      }
    } finally {
      setLoading(false);
    }
  }, [loadPurchases, loadSubmissions, loadUsers]);

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
    setParticipantsTab("joined");
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

  async function updateParticipantStatus(
    purchaseId: number,
    userId: number,
    participantStatus: ParticipantOrderStatus
  ) {
    try {
      await api.patch(`/admin/purchases/${purchaseId}/participants/${userId}`, {
        participant_status: participantStatus,
      });
      setParticipantsDetail((prev) => {
        if (!prev || prev.purchase.id !== purchaseId) {
          return prev;
        }
        return {
          ...prev,
          participants: prev.participants.map((row) =>
            row.user_id === userId ? { ...row, participant_status: participantStatus } : row
          ),
        };
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setParticipantsError(err.response?.data?.message ?? "Не удалось изменить статус заказа.");
      } else {
        setParticipantsError("Ошибка при изменении статуса заказа.");
      }
    }
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

  async function patchUserAdmin(userId: number, isAdmin: boolean) {
    setError("");
    try {
      const { data } = await api.patch<AdminUserRow>(`/admin/users/${userId}`, { is_admin: isAdmin });
      setUsers((prev) => prev.map((row) => (row.id === userId ? { ...row, ...data } : row)));
      const session = getAuthSession();
      if (session?.user.id === userId) {
        const me = await api.get<{ user: AuthUser }>("/auth/me");
        saveAuthSession({ token: session.token, user: me.data.user });
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Не удалось изменить роль.");
      } else {
        setError("Ошибка сети.");
      }
    }
  }

  if (!allowed) {
    return null;
  }

  const processingRows = participantsDetail?.participants ?? [];

  function formatDateTime(iso?: string) {
    if (!iso) {
      return "—";
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return "—";
    }
    return d.toLocaleString("ru-RU");
  }

  function deliveryLabel(method: string) {
    return method === "courier" ? "Курьер" : "Самовывоз";
  }

  function paymentLabel(method: string) {
    return method === "sbp" ? "СБП" : "Карта";
  }

  return (
    <div className={`${tokens.root} ${homeLanding.landing}`}>
      <MarketingHeader />
      <div className={styles.page}>
        <header className={styles.head}>
          <p className={styles.badge}>Администрирование</p>
          <h1 className={styles.title}>Панель администратора</h1>
          <p className={styles.subtitle}>
            Админ панель для управления пользователями и закупками
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
            aria-selected={tab === "submissions"}
            className={tab === "submissions" ? styles.tabActive : styles.tab}
            onClick={() => setTab("submissions")}
          >
            Заявки на сделки
            {submissions.length > 0 ? (
              <span className={styles.badgeCount}>{submissions.length}</span>
            ) : null}
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
        ) : tab === "submissions" ? (
          <>
            <div className={styles.toolbar}>
              <h2 className={styles.sectionTitle}>Заявки пользователей</h2>
              <p className={styles.muted} style={{ margin: 0, maxWidth: 520 }}>
                После одобрения сделка появится в каталоге со статусом «Сбор заявок».
              </p>
            </div>
            {loading ? (
              <p className={styles.muted}>Загрузка…</p>
            ) : submissions.length === 0 ? (
              <p className={styles.muted}>Нет заявок на рассмотрении.</p>
            ) : (
              <div className={styles.cardGrid}>
                {submissions.map((p) => (
                  <article key={p.id} className={styles.submissionCard}>
                    <div className={styles.submissionCardHead}>
                      <h3 className={styles.submissionTitle}>{p.title}</h3>
                      <span className={styles.adminPill}>На рассмотрении</span>
                    </div>
                    <p className={styles.muted}>
                      {p.organizer_name ?? "—"} · {formatRub(p.unit_price)} · мин. {p.min_participants} уч.
                    </p>
                    <p className={styles.muted}>{p.product_name}</p>
                    <Link href={`/admin/${p.id}/edit`} className={styles.btnPrimary}>
                      Редактировать и решить
                    </Link>
                  </article>
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
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const avatar = typeof u.avatar_url === "string" ? u.avatar_url.trim() : "";
                    const adminCount = users.filter((x) => x.is_admin).length;
                    const cannotRevokeLastAdmin = u.is_admin && adminCount <= 1;
                    return (
                    <tr key={u.id}>
                      <td className={styles.mono}>{u.id}</td>
                      <td>
                        <div className={styles.userNameCell}>
                          {avatar ? (
                            <span className={styles.userAvatarSlot}>
                              <img src={avatar} alt="" className={styles.userAvatarImg} width={32} height={32} />
                            </span>
                          ) : null}
                          <span>{u.name}</span>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>{u.is_admin ? <span className={styles.adminPill}>Админ</span> : "—"}</td>
                      <td>
                        <div className={styles.userActions}>
                          {u.is_admin ? (
                            <button
                              type="button"
                              className={styles.btnGhost}
                              disabled={cannotRevokeLastAdmin}
                              title={
                                cannotRevokeLastAdmin
                                  ? "Должен остаться хотя бы один администратор"
                                  : "Снять права администратора"
                              }
                              onClick={() => void patchUserAdmin(u.id, false)}
                            >
                              Снять админа
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={styles.btnGhost}
                              onClick={() => void patchUserAdmin(u.id, true)}
                            >
                              Сделать админом
                            </button>
                          )}
                          <button type="button" className={styles.btnDanger} onClick={() => void removeUser(u.id)}>
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                  })}
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
                  <div className={styles.modalTabs}>
                    <button
                      type="button"
                      className={participantsTab === "joined" ? styles.tabActive : styles.tab}
                      onClick={() => setParticipantsTab("joined")}
                    >
                      Откликнувшиеся
                    </button>
                    <button
                      type="button"
                      className={participantsTab === "processing" ? styles.tabActive : styles.tab}
                      onClick={() => setParticipantsTab("processing")}
                    >
                      Ожидают обработки
                    </button>
                  </div>

                  {participantsTab === "joined" ? (
                    participantsDetail.participants.length === 0 ? (
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
                                <td>
                                  <div className={styles.participantUserCell}>
                                    {row.avatar_url ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={row.avatar_url} alt="" className={styles.participantAvatarImg} />
                                    ) : (
                                      <span className={styles.participantAvatarFallback} aria-hidden>
                                        {row.user_name?.trim()?.charAt(0)?.toUpperCase() || "?"}
                                      </span>
                                    )}
                                    <span>{row.user_name}</span>
                                  </div>
                                </td>
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
                    )
                  ) : processingRows.length === 0 ? (
                    <p className={styles.muted}>Нет заказов, ожидающих обработки.</p>
                  ) : (
                    <table className={styles.participantTable}>
                      <thead>
                        <tr>
                          <th>Пользователь</th>
                          <th>Статус заказа</th>
                          <th>Доставка</th>
                          <th>Адрес</th>
                          <th>Комментарий</th>
                          <th>Оплата</th>
                          <th>Дата оплаты</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processingRows.map((row) => (
                          <tr key={`processing-${row.user_id}`}>
                            <td>
                              <div className={styles.participantUserCell}>
                                {row.avatar_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={row.avatar_url} alt="" className={styles.participantAvatarImg} />
                                ) : (
                                  <span className={styles.participantAvatarFallback} aria-hidden>
                                    {row.user_name?.trim()?.charAt(0)?.toUpperCase() || "?"}
                                  </span>
                                )}
                                <span>{row.user_name}</span>
                              </div>
                            </td>
                            <td>
                              <select
                                className={styles.statusSelect}
                                value={row.participant_status}
                                onChange={(e) =>
                                  void updateParticipantStatus(
                                    participantsModalId!,
                                    row.user_id,
                                    e.target.value as ParticipantOrderStatus
                                  )
                                }
                              >
                                <option value="processing">Обработка</option>
                                <option value="assembly">Сборка</option>
                                <option value="delivery">Доставка</option>
                                <option value="handed">Вручен</option>
                              </select>
                            </td>
                            <td>{deliveryLabel(row.delivery_method)}</td>
                            <td>{row.delivery_method === "courier" ? row.delivery_address || "—" : "Не требуется"}</td>
                            <td>{row.delivery_comment || "—"}</td>
                            <td>{paymentLabel(row.payment_method)}</td>
                            <td>{formatDateTime(row.paid_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
