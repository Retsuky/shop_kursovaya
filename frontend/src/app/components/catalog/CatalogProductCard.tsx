import Image from "next/image";
import Link from "next/link";
import type { Purchase } from "../../../lib/purchasesMeta";
import {
  catalogProgress,
  discountPercent,
  formatTimeLeft,
  isAlmostFull,
  purchasePricePresentation,
} from "../../../lib/catalogDisplay";
import ParticipantAvatar from "../../../lib/ParticipantAvatar";
import AddToCartButton from "../cart/AddToCartButton";
import tokens from "../landing/landing-tokens.module.css";
import styles from "./catalog-product-card.module.css";

type Props = {
  purchase: Purchase;
};

export default function CatalogProductCard({ purchase }: Props) {
  const pricePres = purchasePricePresentation(purchase);
  const { percent, participantsLabel } = catalogProgress(purchase);
  const disc = discountPercent(purchase);
  const almost = isAlmostFull(purchase);
  const collecting = purchase.status === "collecting";
  const closed =
    purchase.status === "payment" ||
    purchase.status === "supplier_order" ||
    purchase.status === "delivery" ||
    purchase.status === "completed";

  let badgeMain: { text: string; variant: "active" | "almost" | "muted" };
  if (closed) {
    badgeMain = { text: "Выкуплено", variant: "muted" };
  } else if (almost) {
    badgeMain = { text: "Почти собран", variant: "almost" };
  } else {
    badgeMain = { text: "Активно", variant: "active" };
  }

  const barTone = almost ? "tertiary" : "primary";
  const showPulse = almost && collecting;

  const imageUrl = purchase.image_url?.trim() || "";

  const categoryLabel = purchase.category?.trim() || "Без категории";
  const ctaLabel =
    almost && collecting ? "Последнее место! Вступить" : closed ? "Подробнее" : "Вступить в группу";

  const preview = purchase.participant_preview ?? [];
  const avatarSlots = preview.slice(0, 3);
  const participants = purchase.participant_count ?? 0;
  const extra = Math.max(0, participants - avatarSlots.length);

  return (
    <article
      className={`${tokens.root} ${styles.card} ${almost && collecting ? styles.cardHighlight : ""}`}
    >
      <div className={styles.imageWrap}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={purchase.title}
            width={480}
            height={320}
            className={styles.image}
            unoptimized
          />
        ) : (
          <div
            className={`${styles.image} ${styles.imagePlaceholder}`}
            role="img"
            aria-label={purchase.title}
          />
        )}
        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles[`badge_${badgeMain.variant}`]}`}>
            {badgeMain.text}
          </span>
          {disc != null ? (
            <span className={`${styles.badge} ${styles.badgeDiscount}`}>Скидка {disc}%</span>
          ) : null}
        </div>
      </div>

      <div className={styles.body}>
        <h2 className={styles.name}>{purchase.title}</h2>
        <p className={styles.category}>{categoryLabel}</p>

        <div className={styles.metaRow}>
          <div>
            <span className={styles.priceHint}>Цена сейчас</span>
            <div className={styles.priceLine}>
              <span className={styles.price}>{pricePres.mainPrice}</span>
              {pricePres.comparePrice ? (
                <span className={styles.oldPrice}>{pricePres.comparePrice}</span>
              ) : null}
            </div>
            <span className={styles.priceExplain}>{pricePres.caption}</span>
          </div>
          <div className={styles.timeWrap}>
            <span className={styles.time}>
              <span className={`material-symbols-outlined ${styles.timeIcon}`}>schedule</span>
              {formatTimeLeft(purchase.deadline)}
            </span>
          </div>
        </div>

        <div className={styles.progressBlock}>
          <div className={styles.progressLabels}>
            <span className={barTone === "tertiary" ? styles.progressStrongTertiary : styles.progressStrong}>
              {percent}% собрано
            </span>
            <span className={styles.progressMuted}>{participantsLabel}</span>
          </div>
          <div
            className={`${styles.barTrack} ${barTone === "tertiary" ? styles.barTrackTertiary : ""}`}
          >
            <div
              className={`${styles.barFill} ${barTone === "tertiary" ? styles.barFillTertiary : styles.barFillPrimary} ${showPulse ? styles.barPulse : ""}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {participants > 0 ? (
          <div className={styles.avatars}>
            {avatarSlots.map((u) => (
              <ParticipantAvatar key={u.user_id} participant={u} size={32} className={styles.avatar} />
            ))}
            {extra > 0 ? <span className={styles.avatarMore}>+{extra}</span> : null}
          </div>
        ) : null}

        <div className={styles.ctaRow}>
          <Link
            href={`/purchases/${purchase.id}`}
            className={`${styles.cta} ${closed ? styles.ctaMuted : ""}`}
          >
            {ctaLabel}
          </Link>
          <AddToCartButton purchase={purchase} />
        </div>
      </div>
    </article>
  );
}
