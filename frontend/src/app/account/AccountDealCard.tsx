import Image from "next/image";
import Link from "next/link";
import type { Purchase } from "../../lib/purchasesMeta";
import { STATUS_LABELS } from "../../lib/purchasesMeta";
import { catalogProgress } from "../../lib/catalogDisplay";
import ParticipantAvatar from "../../lib/ParticipantAvatar";
import styles from "./account-deal-card.module.css";

type Role = "organizer" | "participant";

type Props = {
  purchase: Purchase;
  role: Role;
};

export default function AccountDealCard({ purchase, role }: Props) {
  const { percent, participantsLabel } = catalogProgress(purchase);
  const imageUrl = purchase.image_url?.trim() || "";

  const status = purchase.status;
  const collecting = status === "collecting";
  const orderPlaced = status === "closed" || status === "completed";

  let badge: { text: string; variant: "wait" | "order" | "ship" };
  if (orderPlaced) {
    badge = status === "closed" ? { text: "НАБОР ЗАКРЫТ", variant: "ship" } : { text: "ЗАВЕРШЕНА", variant: "order" };
  } else if (collecting) {
    badge = { text: "ОЖИДАНИЕ УЧАСТНИКОВ", variant: "wait" };
  } else {
    badge = { text: (STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status).toUpperCase(), variant: "wait" };
  }

  const deadline = new Date(purchase.deadline);
  const deliveryHint = `Сбор до ${deadline.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`;

  const progressLabel =
    percent >= 100 && collecting ? "Цель достигнута!" : `Достигнуто ${percent}%`;

  const cta: { href: string; label: string; outline?: boolean } =
    role === "organizer" && collecting
      ? { href: `/purchases/${purchase.id}`, label: "Ускорить сбор" }
      : orderPlaced
          ? { href: `/purchases/${purchase.id}`, label: "Открыть", outline: true }
          : { href: `/purchases/${purchase.id}`, label: "Открыть" };

  const previewParticipants = purchase.participant_preview ?? [];
  const avatarSlots = previewParticipants.slice(0, 3);
  const pc = purchase.participant_count ?? 0;
  const avatarExtra = Math.max(0, pc - avatarSlots.length);
  const participantStatusLabelMap: Record<string, string> = {
    assembly: "Сборка",
    delivery: "Доставка",
    handed: "Вручен",
  };
  const participantDeliveryStatus =
    role === "participant"
      ? participantStatusLabelMap[String(purchase.my_participant_status ?? "").trim()] ??
        (status === "completed" ? "Вручен" : "Сборка")
      : null;

  return (
    <article className={styles.card}>
      <div className={styles.imageWrap}>
        {imageUrl ? (
          <Image src={imageUrl} alt="" width={400} height={240} className={styles.image} unoptimized />
        ) : (
          <div className={`${styles.image} ${styles.imagePlaceholder}`} role="presentation" />
        )}
        <div className={styles.badgeWrap}>
          <span className={`${styles.badge} ${styles[`badge_${badge.variant}`]}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {badge.variant === "order"
                ? "check_circle"
                : badge.variant === "ship"
                  ? "local_shipping"
                  : "hourglass_empty"}
            </span>
            {badge.text}
          </span>
        </div>
      </div>
      <div className={styles.body}>
        <h4 className={styles.title}>{purchase.title}</h4>
        <p className={styles.meta}>{deliveryHint}</p>
        <div className={styles.progressBlock}>
          <div className={styles.progressLabels}>
            <span className={styles.progressStrong}>{progressLabel}</span>
            <span className={styles.progressMuted}>{participantsLabel}</span>
          </div>
          <div className={styles.barTrack}>
            <div
              className={`${styles.barFill} ${percent >= 100 ? styles.barPulse : ""}`}
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>
        </div>
        <div className={styles.footer}>
          {orderPlaced ? (
            <span className={styles.shipping}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                local_shipping
              </span>
              {role === "participant" ? participantDeliveryStatus : status === "closed" ? "Заказ в обработке" : "Сделка завершена"}
            </span>
          ) : (
            <div className={styles.avatars}>
              {avatarSlots.map((u) => (
                <ParticipantAvatar key={u.user_id} participant={u} size={24} className={styles.avatar} />
              ))}
              {avatarSlots.length > 0 && avatarExtra > 0 ? (
                <span className={styles.avatarMore}>+{avatarExtra}</span>
              ) : null}
              {avatarSlots.length === 0 && pc > 0 ? (
                <span className={styles.avatarFallback}>{pc} участников</span>
              ) : null}
            </div>
          )}
          <Link
            href={cta.href}
            className={cta.outline ? styles.btnOutline : styles.btnPrimary}
          >
            {cta.label}
          </Link>
        </div>
      </div>
    </article>
  );
}
