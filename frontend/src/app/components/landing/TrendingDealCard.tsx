import Image from "next/image";
import Link from "next/link";
import tokens from "./landing-tokens.module.css";
import styles from "./trending-deal-card.module.css";

export type DealBadgeVariant = "active" | "goal" | "activeAlt";

export type TrendingDealCardProps = {
  title: string;
  imageUrl: string;
  imageAlt: string;
  price: string;
  oldPrice: string;
  discountLabel: string;
  progressLabel: string;
  progressPercent: number;
  progressTone: "primary" | "tertiary";
  pulse?: boolean;
  footerHint?: string;
  avatarCount?: number;
  extraParticipantsLabel?: string;
  badge: { text: string; variant: DealBadgeVariant };
  cta: { label: string; href: string; variant: "coral" | "teal" };
};

export default function TrendingDealCard(props: TrendingDealCardProps) {
  const {
    title,
    imageUrl,
    imageAlt,
    price,
    oldPrice,
    discountLabel,
    progressLabel,
    progressPercent,
    progressTone,
    pulse,
    footerHint,
    avatarCount = 0,
    extraParticipantsLabel,
    badge,
    cta,
  } = props;

  const badgeClass =
    badge.variant === "goal"
      ? styles.badgeGoal
      : badge.variant === "activeAlt"
        ? styles.badgeActive
        : styles.badgeActive;

  const barClass =
    progressTone === "tertiary" ? `${styles.barTrack} ${styles.barTrackTertiary}` : styles.barTrack;

  const fillClass = [
    styles.barFill,
    progressTone === "tertiary" ? styles.barFillTertiary : styles.barFillPrimary,
    pulse ? styles.barPulse : "",
  ]
    .filter(Boolean)
    .join(" ");

  const btnClass = cta.variant === "coral" ? styles.btnCoral : styles.btnTeal;

  return (
    <article className={`${tokens.root} ${styles.card}`}>
      <div className={styles.imageWrap}>
        <Image
          src={imageUrl}
          alt={imageAlt}
          width={400}
          height={320}
          className={styles.image}
          unoptimized
        />
        <div className={styles.badgeWrap}>
          <span className={`${styles.badge} ${badgeClass}`}>{badge.text}</span>
        </div>
      </div>

      <h3 className={styles.title}>{title}</h3>

      <div className={styles.priceRow}>
        <span className={styles.price}>{price}</span>
        <span className={styles.oldPrice}>{oldPrice}</span>
        <span className={styles.discount}>{discountLabel}</span>
      </div>

      <div className={styles.progressBlock}>
        <div className={styles.progressMeta}>
          <span className={styles.muted}>Участие</span>
          <span
            className={
              progressTone === "tertiary" ? `${styles.progressStrong} ${styles.progressTertiary}` : styles.progressStrong
            }
          >
            {progressLabel}
          </span>
        </div>
        <div className={barClass}>
          <div className={fillClass} style={{ width: `${progressPercent}%` }} />
        </div>

        <div className={styles.footerRow}>
          {avatarCount > 0 ? (
            <div className={styles.avatars}>
              {Array.from({ length: avatarCount }).map((_, i) => (
                <span key={i} className={`${styles.avatarDot} ${styles[`dot_${i % 3}`]}`} />
              ))}
            </div>
          ) : null}
          {extraParticipantsLabel ? (
            <span className={styles.footerHint}>{extraParticipantsLabel}</span>
          ) : null}
          {footerHint ? <span className={styles.footerHint}>{footerHint}</span> : null}
        </div>
      </div>

      <Link href={cta.href} className={`${styles.cta} ${btnClass}`}>
        {cta.label}
      </Link>
    </article>
  );
}
