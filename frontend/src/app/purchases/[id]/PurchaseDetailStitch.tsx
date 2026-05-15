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
  isGroupMinimumMet,
  purchasePricePresentation,
} from "../../../lib/catalogDisplay";
import ParticipantAvatar from "../../../lib/ParticipantAvatar";
import { resolveUploadUrl } from "../../../lib/resolveUploadUrl";
import PurchaseReviews from "./PurchaseDiscussion";
import type { Purchase, PurchaseStatus } from "../../../lib/purchasesMeta";
import { STATUS_LABELS } from "../../../lib/purchasesMeta";
import styles from "./purchase-detail-stitch.module.css";

export type StitchParticipant = {
  user_id: number;
  quantity: number;
  user_name: string;
  email?: string;
  avatar_url?: string;
  joined_at?: string;
};

export type PurchaseDetailStitchProps = {
  purchase: Purchase;
  participants: StitchParticipant[];
  session: AuthSession | null;
  isOrganizer: boolean;
  myParticipant: StitchParticipant | undefined;
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

export default function PurchaseDetailStitch({
  purchase,
  participants,
  session,
  isOrganizer,
  myParticipant,
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
  const [ratingAvg, setRatingAvg] = useState<number>(Number(purchase.rating_avg ?? 0));
  const [ratingCount, setRatingCount] = useState<number>(Number(purchase.rating_count ?? 0));

  const imageUrl = resolveUploadUrl(purchase.image_url);
  const pricePres = purchasePricePresentation(purchase);
  const { percent, participantsLabel } = catalogProgress(purchase);
  const disc = discountPercent(purchase);
  const almost = isAlmostFull(purchase);
  const c = purchase.participant_count ?? 0;
  const m = Math.max(1, purchase.min_participants ?? 1);
  const needPeople = Math.max(0, m - c);
  const collecting = purchase.status === "collecting";
  const closed = purchase.status === "closed";
  const canNewJoin = !isOrganizer && collecting && !deadlinePassed;
  const canManageOwnParticipation = !isOrganizer && (collecting || closed) && !deadlinePassed;
  const recentForAvatars = [...participants]
    .filter((p) => p.joined_at)
    .sort((a, b) => new Date(b.joined_at!).getTime() - new Date(a.joined_at!).getTime())
    .slice(0, 3)
    .reverse();
  const avatarParticipants = recentForAvatars.length > 0 ? recentForAvatars : participants.slice(0, 3);
  const extraAv = Math.max(0, c - avatarParticipants.length);

  const categoryLabel = purchase.category?.trim() || "Групповая сделка";
  const showGroupPriceSpec =
    purchase.status !== "cancelled" &&
    (purchase.status !== "collecting" || isGroupMinimumMet(purchase));
  const avgRounded = Math.round(ratingAvg * 10) / 10;
  const filledStars = Math.max(0, Math.min(5, Math.round(ratingAvg)));

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
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={purchase.title}
                  fill
                  className={styles.heroImg}
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  unoptimized
                />
              ) : (
                <div className={styles.heroImgPlaceholder} role="img" aria-label={purchase.title} />
              )}
            </div>
          </div>

          <div className={styles.side}>
            <div>
              <span className={styles.badgeTop}>{categoryLabel}</span>
              <h1 className={styles.title}>{purchase.title}</h1>
              <div className={styles.starsRow}>
                <div className={styles.stars}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={i < filledStars ? styles.starFilled : styles.starEmpty}>
                      {i < filledStars ? "★" : "☆"}
                    </span>
                  ))}
                </div>
                <span className={styles.reviewsHint}>
                  {ratingCount > 0 ? `отзывов: ${ratingCount}` : "Пока нет отзывов"}
                </span>
              </div>
              <p className={styles.lead}>
                {purchase.description?.trim()
                  ? purchase.description
                  : `${purchase.product_name}. Выгодная групповая цена при наборе минимума участников — присоединяйтесь к сделке.`}
              </p>
            </div>

            <div className={styles.priceBox}>
              <div className={styles.priceRow}>
                <span className={styles.priceMain}>{pricePres.mainPrice}</span>
                {pricePres.comparePrice ? (
                  <span className={styles.priceOld}>{pricePres.comparePrice}</span>
                ) : null}
                {disc != null ? <span className={styles.discBadge}>СКИДКА {disc}%</span> : null}
              </div>
              <p className={styles.priceSub}>{pricePres.caption}</p>
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
                      <ParticipantAvatar
                        key={p.user_id}
                        participant={{
                          user_name: p.user_name,
                          email: p.email,
                          avatar_url: p.avatar_url,
                        }}
                        size={34}
                        className={styles.avatar}
                      />
                    ))}
                    {extraAv > 0 ? <span className={styles.avatarMore}>+{extraAv}</span> : null}
                  </div>
                  <span className={styles.avatarCaption}>Недавно присоединились к закупке</span>
                </div>
              ) : null}
            </div>

            <div className={styles.actions}>
              {myParticipant ? (
                <div className={styles.joinedBanner}>
                  <span className={`material-symbols-outlined ${styles.joinedIcon}`}>task_alt</span>
                  Вы откликнулись на заявку
                </div>
              ) : null}

              {isOrganizer && purchase.status !== "cancelled" && purchase.status !== "completed" ? (
                <div className={styles.organizerMeta}>
                  <p className={styles.metaStatus}>
                    Вы организатор · {STATUS_LABELS[purchase.status as PurchaseStatus] ?? purchase.status}
                  </p>
                  <p className={styles.organizerTotals}>
                    В заявках: <strong>{purchase.total_quantity ?? 0}</strong> шт. · Сумма:{" "}
                    <strong>{totalSum.toLocaleString("ru-RU")} ₽</strong>
                  </p>
                </div>
              ) : null}

              {deadlinePassed && collecting ? <p className={styles.warning}>Срок сбора истёк — новые заявки недоступны.</p> : null}

              {canNewJoin && session && !myParticipant ? (
                <form onSubmit={onJoin}>
                  <div className={styles.actions}>
                    <button type="submit" className={styles.btnCoral} disabled={pending}>
                      Присоединиться к сделке
                    </button>
                  </div>
                </form>
              ) : null}

              {canManageOwnParticipation && session && myParticipant ? (
                <button type="button" className={styles.btnGhost} disabled={pending} onClick={onLeave}>
                  Отказаться от участия
                </button>
              ) : null}

              {canNewJoin && !session ? (
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

              {(!collecting && !closed) || deadlinePassed ? (
                <Link href="/catalog" className={styles.btnCoral}>
                  Смотреть другие сделки
                </Link>
              ) : null}

              <button type="button" className={styles.btnOutline} onClick={onShare}>
                <span className={`material-symbols-outlined ${styles.icon}`}>share</span>
                Пригласить друзей
              </button>

              {isOrganizer && purchase.status !== "cancelled" && purchase.status !== "completed" ? (
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
              ) : null}

              {(collecting || closed) && !deadlinePassed && !isOrganizer ? (
                <div className={styles.cartSlot}>
                  <AddToCartButton purchase={purchase} alreadyJoined={Boolean(myParticipant)} />
                </div>
              ) : null}
            </div>

            <div className={styles.organizerFacts}>
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
                    {showGroupPriceSpec ? (
                      <>
                    <div className={styles.specLabel}>Групповая цена</div>
                    <div className={styles.specValue}>{formatRub(purchase.unit_price)}</div>
                      </>
                    ) : null}
                    <div className={styles.specLabel}>Розница</div>
                    <div className={styles.specValue}>
                      {purchase.retail_price?.toString().trim()
                        ? formatRub(purchase.retail_price)
                        : "—"}
                    </div>
                    <div className={styles.specLabel}>Цена для участников сейчас</div>
                    <div className={styles.specValue}>{pricePres.mainPrice}</div>
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
                    <h3 className={styles.discussTitle}>Отзывы</h3>
                    <PurchaseReviews
                      purchaseId={purchase.id}
                      session={session}
                      readOnly={purchase.status === "cancelled"}
                      onSummaryChange={(s) => {
                        setRatingAvg(s.avg);
                        setRatingCount(s.total);
                      }}
                    />
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
                          <div className={styles.participantRow}>
                            <ParticipantAvatar
                              participant={{
                                user_name: p.user_name,
                                email: p.email,
                                avatar_url: p.avatar_url,
                              }}
                              size={28}
                              className={styles.participantAvatarImg}
                            />
                            <span className={styles.participantName}>{p.user_name}</span>
                          </div>
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
                    <span>Отправитель ручается за качество товара</span>
                  </div>
                </li>
                <li className={styles.whyItem}>
                  <span className={`material-symbols-outlined ${styles.whyIcon}`}>group_work</span>
                  <div>
                    <strong>Сила в количестве</strong>
                    <span>Чем больше участников, тем выгоднее цена для каждого</span>
                  </div>
                </li>
                <li className={styles.whyItem}>
                  <span className={`material-symbols-outlined ${styles.whyIcon}`}>local_shipping</span>
                  <div>
                    <strong>Безопасность</strong>
                    <span>Отправитель не получит деньги до доставки товара</span>
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
