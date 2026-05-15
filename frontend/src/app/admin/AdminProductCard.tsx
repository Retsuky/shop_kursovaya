"use client";

import Image from "next/image";
import Link from "next/link";
import type { Purchase, PurchaseStatus } from "../../lib/purchasesMeta";
import {
  catalogProgress,
  discountPercent,
  formatRub,
  formatTimeLeft,
  isAlmostFull,
} from "../../lib/catalogDisplay";
import ParticipantAvatar from "../../lib/ParticipantAvatar";
import { resolveUploadUrl } from "../../lib/resolveUploadUrl";
import { STATUS_LABELS, STATUS_ORDER } from "../../lib/purchasesMeta";
import tokens from "../components/landing/landing-tokens.module.css";
import cardStyles from "../components/catalog/catalog-product-card.module.css";
import extra from "./admin-product-card.module.css";

const ALL_STATUSES: PurchaseStatus[] = [...STATUS_ORDER];

function catalogOpenHint(purchase: Purchase): string | null {
  if (purchase.status === "cancelled") {
    return "Отменённые сделки в каталог не попадают.";
  }
  const deadlineOk = new Date(purchase.deadline).getTime() > Date.now();
  if (purchase.status === "collecting" && deadlineOk) {
    return null;
  }
  if (purchase.status === "collecting" && !deadlineOk) {
    return "Срок сбора уже прошёл — в разделе «Открытые» карточка не показывается. Продлите дату в редактировании или в каталоге включите «Все».";
  }
  return "В «Открытых» на витрине только статус «Сбор заявок». Сейчас выбран другой этап — карточка видна в каталоге при фильтре «Все» или «Выкуплено».";
}

type Props = {
  purchase: Purchase;
  onStatusChange: (id: number, status: PurchaseStatus) => void;
  onDelete: (id: number) => void;
  onShowParticipants: (id: number) => void;
};

export default function AdminProductCard({
  purchase,
  onStatusChange,
  onDelete,
  onShowParticipants,
}: Props) {
  const { percent, participantsLabel } = catalogProgress(purchase);
  const disc = discountPercent(purchase);
  const almost = isAlmostFull(purchase);
  const collecting = purchase.status === "collecting";
  const closed = purchase.status === "closed" || purchase.status === "completed";

  let badgeMain: { text: string; variant: "active" | "almost" | "muted" };
  if (closed) {
    badgeMain = { text: purchase.status === "closed" ? "Набор закрыт" : "Выкуплено", variant: "muted" };
  } else if (almost) {
    badgeMain = { text: "Почти собран", variant: "almost" };
  } else {
    badgeMain = { text: "Активно", variant: "active" };
  }

  const barTone = almost ? "tertiary" : "primary";
  const showPulse = almost && collecting;

  const imageUrl = resolveUploadUrl(purchase.image_url);

  const categoryLabel = purchase.category?.trim() || "Без категории";
  const preview = purchase.participant_preview ?? [];
  const avatarSlots = preview.slice(0, 3);
  const participants = purchase.participant_count ?? 0;
  const extraAv = Math.max(0, participants - avatarSlots.length);
  const hint = catalogOpenHint(purchase);

  return (
    <article
      className={`${tokens.root} ${cardStyles.card} ${almost && collecting ? cardStyles.cardHighlight : ""}`}
    >
      <div className={cardStyles.imageWrap}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={purchase.title}
            width={480}
            height={320}
            className={cardStyles.image}
            unoptimized
          />
        ) : (
          <div
            className={`${cardStyles.image} ${cardStyles.imagePlaceholder}`}
            role="img"
            aria-label={purchase.title}
          />
        )}
        <div className={cardStyles.badges}>
          <span className={`${cardStyles.badge} ${cardStyles[`badge_${badgeMain.variant}`]}`}>
            {badgeMain.text}
          </span>
          {disc != null ? (
            <span className={`${cardStyles.badge} ${cardStyles.badgeDiscount}`}>Скидка {disc}%</span>
          ) : null}
        </div>
      </div>

      <div className={cardStyles.body}>
        <p className={extra.adminId}>ID {purchase.id} · {purchase.organizer_name ?? "Организатор"}</p>
        <h2 className={cardStyles.name}>{purchase.title}</h2>
        <p className={cardStyles.category}>{categoryLabel}</p>

        <div className={cardStyles.metaRow}>
          <div>
            <span className={cardStyles.priceHint}>Цена CoBuy</span>
            <div className={cardStyles.priceLine}>
              <span className={cardStyles.price}>{formatRub(purchase.unit_price)}</span>
              {purchase.retail_price ? (
                <span className={cardStyles.oldPrice}>{formatRub(purchase.retail_price)}</span>
              ) : null}
            </div>
          </div>
          <div className={cardStyles.timeWrap}>
            <span className={cardStyles.time}>
              <span className={`material-symbols-outlined ${cardStyles.timeIcon}`}>schedule</span>
              {formatTimeLeft(purchase.deadline)}
            </span>
          </div>
        </div>

        <div className={cardStyles.progressBlock}>
          <div className={cardStyles.progressLabels}>
            <span className={barTone === "tertiary" ? cardStyles.progressStrongTertiary : cardStyles.progressStrong}>
              {percent}% собрано
            </span>
            <span className={cardStyles.progressMuted}>{participantsLabel}</span>
          </div>
          <div
            className={`${cardStyles.barTrack} ${barTone === "tertiary" ? cardStyles.barTrackTertiary : ""}`}
          >
            <div
              className={`${cardStyles.barFill} ${barTone === "tertiary" ? cardStyles.barFillTertiary : cardStyles.barFillPrimary} ${showPulse ? cardStyles.barPulse : ""}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {participants > 0 ? (
          <div className={cardStyles.avatars}>
            {avatarSlots.map((u) => (
              <ParticipantAvatar key={u.user_id} participant={u} size={32} className={cardStyles.avatar} />
            ))}
            {extraAv > 0 ? <span className={cardStyles.avatarMore}>+{extraAv}</span> : null}
          </div>
        ) : null}

        <div className={`${cardStyles.ctaRow} ${extra.adminCta}`}>
          <label className={cardStyles.priceHint} htmlFor={`admin-status-${purchase.id}`}>
            Статус заказа
          </label>
          <select
            id={`admin-status-${purchase.id}`}
            className={extra.statusSelect}
            value={purchase.status}
            onChange={(e) => onStatusChange(purchase.id, e.target.value as PurchaseStatus)}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {hint ? (
            <p className={extra.catalogHint}>
              {hint}{" "}
              <Link href="/catalog?deal=all">Открыть каталог «Все»</Link>.
            </p>
          ) : null}
          <Link href={`/purchases/${purchase.id}`} className={`${cardStyles.cta} ${cardStyles.ctaMuted}`}>
            Как на сайте
          </Link>
          <Link href={`/admin/${purchase.id}/edit`} className={cardStyles.cta}>
            Редактировать
          </Link>
          <button
            type="button"
            className={extra.btnSecondary}
            onClick={() => onShowParticipants(purchase.id)}
          >
            Кто откликнулся ({purchase.participant_count ?? 0})
          </button>
          <button type="button" className={extra.btnDangerOutline} onClick={() => onDelete(purchase.id)}>
            Удалить из каталога
          </button>
        </div>
      </div>
    </article>
  );
}
