"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import AddToCartButton from "../../components/cart/AddToCartButton";
import MarketingFooter from "../../components/landing/MarketingFooter";
import MarketingHeader from "../../components/landing/MarketingHeader";
import tokens from "../../components/landing/landing-tokens.module.css";
import homeLanding from "../../home/home-landing.module.css";
import type { AuthSession } from "../../../lib/auth";
import {
  catalogProgress,
  discountPercent,
  formatRub,
  formatTimeLeft,
  isAlmostFull,
} from "../../../lib/catalogDisplay";
import type { Purchase, PurchaseStatus } from "../../../lib/purchasesMeta";
import { STATUS_LABELS } from "../../../lib/purchasesMeta";
import styles from "./purchase-detail-stitch.module.css";

export type StitchParticipant = {
  user_id: number;
  quantity: number;
  user_name: string;
};

export type PurchaseDetailStitchProps = {
  purchase: Purchase;
  participants: StitchParticipant[];
  session: AuthSession | null;
  isOrganizer: boolean;
  myParticipant: StitchParticipant | undefined;
  qty: string;
  setQty: (v: string) => void;
  pending: boolean;
  actionError: string;
  deadlinePassed: boolean;
  nextStatus: PurchaseStatus | null;
  totalSum: number;
  onJoin: (e: React.FormEvent<HTMLFormElement>) => void;
  onLeave: () => void;
  onAdvanceStatus: () => void;
  onCancel: () => void;
  onShare: () => void;
};

const FALLBACK_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBinnOgENAwDx3Cjp4dVQm-QPyT4K0FmppHETJ1UnhzbQsh62rTK2YvmP_W003pxfxsduHErVaUoTQJDB0OQI-TN0IaGqKWAwigtEK0CAWzyhAZcmaZLKT4GKKO9jN_HVFJRkLvJDXEF0a4FvCwVcaSQIDXiotXhGcn1k40KUYuV1SpsP7OQc7Dcue_o7XY-bZziQ2HKMJeTsOlzM7e7HExDDB6RH8HNaEV-NwTL0SYEZpkEOJf_r5ztszeFh_qZxDqjTfmC_IgDK0";

export default function PurchaseDetailStitch({
  purchase,
  participants,
  session,
  isOrganizer,
  myParticipant,
  qty,
  setQty,
  pending,
  actionError,
  deadlinePassed,
  nextStatus,
  totalSum,
  onJoin,
  onLeave,
  onAdvanceStatus,
  onCancel,
  onShare,
}: PurchaseDetailStitchProps) {
  const [tab, setTab] = useState<"about" | "participants">("about");

  const img = purchase.image_url?.trim() || FALLBACK_IMG;
  const { percent, participantsLabel } = catalogProgress(purchase);
  const disc = discountPercent(purchase);
  const almost = isAlmostFull(purchase);
  const c = purchase.participant_count ?? 0;
  const m = Math.max(1, purchase.min_participants ?? 1);
  const needPeople = Math.max(0, m - c);
  const collecting = purchase.status === "collecting";
  const showJoinUi = !isOrganizer && collecting && !deadlinePassed;
  const avatarParticipants = participants.slice(0, 3);
  const extraAv = Math.max(0, c - 3);

  const categoryLabel = purchase.category?.trim() || "Групповая сделка";

  return (
    <div className={`${tokens.root} ${homeLanding.landing} ${styles.pageWrap}`}>
      <MarketingHeader />
      <main className={styles.main}>
        <Link href="/catalog" className={styles.backLink}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            arrow_back
          </span>
          В каталог
        </Link>

        {actionError ? <div className={styles.errorBanner}>{actionError}</div> : null}

        <div className={styles.grid}>
          <div className={styles.gallery}>
            <div className={styles.heroImgWrap}>
              <Image src={img} alt={purchase.title} fill className={styles.heroImg} sizes="(max-width: 1024px) 100vw, 58vw" unoptimized />
            </div>
          </div>

          <div className={styles.side}>
            <div>
              <span className={styles.badgeTop}>{categoryLabel}</span>
              <h1 className={styles.title}>{purchase.title}</h1>
              <div className={styles.starsRow}>
                <div className={styles.stars}>
                  {["star", "star", "star", "star", "star_half"].map((icon, i) => (
                    <span key={i} className={`material-symbols-outlined ${styles.star}`}>
                      {icon}
                    </span>
                  ))}
                </div>
                <span className={styles.reviewsHint}>Рейтинг сообщества CoBuy</span>
              </div>
              <p className={styles.lead}>
                {purchase.description?.trim()
                  ? purchase.description
                  : `${purchase.product_name}. Выгодная групповая цена при наборе минимума участников — присоединяйтесь к сделке.`}
              </p>
            </div>

            <div className={styles.priceBox}>
              <div className={styles.priceRow}>
                <span className={styles.priceMain}>{formatRub(purchase.unit_price)}</span>
                {purchase.retail_price ? (
                  <span className={styles.priceOld}>{formatRub(purchase.retail_price)}</span>
                ) : null}
                {disc != null ? <span className={styles.discBadge}>СКИДКА {disc}%</span> : null}
              </div>
              <p className={styles.priceSub}>Групповая цена при {m} участниках</p>
            </div>

            <div className={styles.progressSection}>
              <div className={styles.progressHead}>
                <div>
                  <p className={styles.progressCount}>
                    {c} {c === 1 ? "участник" : c < 5 ? "участника" : "участников"}
                  </p>
                  <p className={styles.progressHint}>
                    {needPeople > 0
                      ? `До минимума ещё ${needPeople} ${needPeople === 1 ? "участник" : needPeople < 5 ? "участника" : "участников"}`
                      : "Минимум участников набран"}
                  </p>
                </div>
                <div className={styles.timeBlock}>
                  <span className={`material-symbols-outlined ${styles.timeIcon}`}>schedule</span>
                  {formatTimeLeft(purchase.deadline)}
                </div>
              </div>
              <div className={styles.barTrack}>
                <div
                  className={`${styles.barFill} ${almost && collecting ? styles.barPulse : ""}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              {c > 0 ? (
                <div className={styles.avatarRow}>
                  <div className={styles.avatarStack}>
                    {avatarParticipants.map((p) => (
                      <Image
                        key={p.user_id}
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.user_name)}`}
                        alt=""
                        width={34}
                        height={34}
                        className={styles.avatar}
                        unoptimized
                      />
                    ))}
                    {extraAv > 0 ? <span className={styles.avatarMore}>+{extraAv}</span> : null}
                  </div>
                  <span className={styles.avatarCaption}>Недавно присоединились к закупке</span>
                </div>
              ) : null}
            </div>

            <div className={styles.actions}>
              {isOrganizer && purchase.status !== "cancelled" && purchase.status !== "completed" ? (
                <div className={styles.organizerPanel}>
                  <p className={styles.metaStatus}>
                    Вы организатор · {STATUS_LABELS[purchase.status as PurchaseStatus] ?? purchase.status}
                  </p>
                  <p>
                    В заявках: <strong>{purchase.total_quantity ?? 0}</strong> шт. · Сумма:{" "}
                    <strong>{totalSum.toLocaleString("ru-RU")} ₽</strong>
                  </p>
                  <div className={styles.orgActions}>
                    {nextStatus ? (
                      <button type="button" className={styles.btnTeal} disabled={pending} onClick={onAdvanceStatus}>
                        Далее: {STATUS_LABELS[nextStatus]}
                      </button>
                    ) : null}
                    {purchase.status !== "cancelled" ? (
                      <button type="button" className={styles.btnDanger} disabled={pending} onClick={onCancel}>
                        Отменить закупку
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {deadlinePassed && collecting ? <p className={styles.warning}>Срок сбора истёк — новые заявки недоступны.</p> : null}

              {showJoinUi && session ? (
                <form onSubmit={onJoin}>
                  <div className={styles.qtyRow}>
                    <label htmlFor="join-qty">Количество</label>
                    <input
                      id="join-qty"
                      className={styles.qtyInput}
                      type="number"
                      min={1}
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                    />
                  </div>
                  <div className={styles.actions} style={{ marginTop: 12 }}>
                    <button type="submit" className={styles.btnCoral} disabled={pending}>
                      {myParticipant ? "Обновить заявку" : "Присоединиться к сделке"}
                    </button>
                    {myParticipant ? (
                      <button type="button" className={styles.btnGhost} disabled={pending} onClick={onLeave}>
                        Выйти из закупки
                      </button>
                    ) : null}
                  </div>
                </form>
              ) : null}

              {showJoinUi && !session ? (
                <>
                  <Link href="/" className={styles.btnCoral}>
                    Войти, чтобы присоединиться
                  </Link>
                  <p className={styles.loginHint}>
                    Нет аккаунта?{" "}
                    <Link href="/">Зарегистрируйтесь</Link> — это займёт минуту.
                  </p>
                </>
              ) : null}

              {!collecting || deadlinePassed ? (
                <Link href="/catalog" className={styles.btnCoral}>
                  Смотреть другие сделки
                </Link>
              ) : null}

              <button type="button" className={styles.btnOutline} onClick={onShare}>
                <span className={`material-symbols-outlined ${styles.icon}`}>share</span>
                Пригласить друзей
              </button>

              {collecting && !deadlinePassed ? (
                <div className={styles.cartSlot}>
                  <AddToCartButton purchase={purchase} />
                </div>
              ) : null}
            </div>

            <div className={styles.organizerPanel}>
              <p>
                <strong>Организатор:</strong> {purchase.organizer_name ?? "—"}
              </p>
              {purchase.city ? (
                <p>
                  <strong>Город:</strong> {purchase.city}
                </p>
              ) : null}
              {purchase.pickup_address ? (
                <p>
                  <strong>Выдача:</strong> {purchase.pickup_address}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <section className={styles.lower}>
          <div className={styles.tabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "about"}
              className={tab === "about" ? styles.tabActive : styles.tab}
              onClick={() => setTab("about")}
            >
              О товаре
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "participants"}
              className={tab === "participants" ? styles.tabActive : styles.tab}
              onClick={() => setTab("participants")}
            >
              Участники ({participants.length})
            </button>
          </div>

          <div className={styles.lowerGrid}>
            <div>
              {tab === "about" ? (
                <>
                  <h3 className={styles.specTitle}>Характеристики и условия</h3>
                  <div className={styles.specGrid}>
                    <div className={styles.specLabel}>Товар</div>
                    <div className={styles.specValue}>{purchase.product_name}</div>
                    <div className={styles.specLabel}>Категория</div>
                    <div className={styles.specValue}>{categoryLabel}</div>
                    <div className={styles.specLabel}>Цена за единицу</div>
                    <div className={styles.specValue}>{formatRub(purchase.unit_price)}</div>
                    <div className={styles.specLabel}>Мин. участников</div>
                    <div className={styles.specValue}>{m}</div>
                    <div className={styles.specLabel}>Сбор заявок до</div>
                    <div className={styles.specValue}>{new Date(purchase.deadline).toLocaleString("ru-RU")}</div>
                    <div className={styles.specLabel}>Статус</div>
                    <div className={styles.specValue}>
                      {STATUS_LABELS[purchase.status as PurchaseStatus] ?? purchase.status}
                    </div>
                    <div className={styles.specLabel}>Собрано заявок</div>
                    <div className={styles.specValue}>{participantsLabel}</div>
                  </div>
                  <div className={styles.discussCard}>
                    <h3 className={styles.discussTitle}>Обсуждение</h3>
                    <p className={styles.discussMuted}>
                      Вопросы к организатору и обсуждение товара появятся здесь в следующих версиях. Пока свяжитесь с
                      организатором через контакты в карточке закупки.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h3 className={styles.specTitle}>Участники сделки</h3>
                  {participants.length === 0 ? (
                    <p className={styles.muted}>Пока никто не присоединился.</p>
                  ) : (
                    <ul className={styles.participantList}>
                      {participants.map((p) => (
                        <li key={p.user_id}>
                          <span>{p.user_name}</span>
                          <span className={styles.qty}>× {p.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            <aside className={styles.whyCard}>
              <h4 className={styles.whyTitle}>Почему CoBuy?</h4>
              <ul className={styles.whyList}>
                <li className={styles.whyItem}>
                  <span className={`material-symbols-outlined ${styles.whyIcon}`}>verified</span>
                  <div>
                    <strong>Проверенное качество</strong>
                    <span>Групповые закупки напрямую у поставщиков и проверенных организаторов.</span>
                  </div>
                </li>
                <li className={styles.whyItem}>
                  <span className={`material-symbols-outlined ${styles.whyIcon}`}>group_work</span>
                  <div>
                    <strong>Сила в количестве</strong>
                    <span>Чем больше участников, тем выгоднее цена для каждого.</span>
                  </div>
                </li>
                <li className={styles.whyItem}>
                  <span className={`material-symbols-outlined ${styles.whyIcon}`}>local_shipping</span>
                  <div>
                    <strong>Совместная выдача</strong>
                    <span>Один пункт выдачи для всей группы — удобно и экологичнее.</span>
                  </div>
                </li>
              </ul>
            </aside>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
