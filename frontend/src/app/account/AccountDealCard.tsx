import Image from "next/image";
import Link from "next/link";
import type { Purchase } from "../../lib/purchasesMeta";
import { STATUS_LABELS } from "../../lib/purchasesMeta";
import { catalogProgress } from "../../lib/catalogDisplay";
import styles from "./account-deal-card.module.css";

type Role = "organizer" | "participant";

type Props = {
  purchase: Purchase;
  role: Role;
};

export default function AccountDealCard({ purchase, role }: Props) {
  const { percent, participantsLabel } = catalogProgress(purchase);
  const img =
    purchase.image_url?.trim() ||
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBIuCheOH4xTuJl8R75_fmKr8inRmRmDcbUEcKX2psgQqXLshrcwRwXIWua53yJoexl6Y5Kn3F4w_Rec6-tgOp04fpFausi1KKxidDsFSmKNvI-lVFu-8eHS-hq_cE4IV1NkKPx8Vxb4_eOXGgB8TNqd--7RbEhw75cL4PSdhhaVIp8LvSDynAyN0WKQR4AwwQCpgMUz_FWzD2ZNag4Q9ODWakanAgl2r-ua-HvcxxTB-8CcrewxyPPN_krBgzEcFMKL9tzqiLSL_Q";

  const status = purchase.status;
  const collecting = status === "collecting";
  const orderPlaced =
    status === "payment" || status === "supplier_order" || status === "delivery";

  let badge: { text: string; variant: "wait" | "order" | "ship" };
  if (orderPlaced) {
    badge =
      status === "delivery"
        ? { text: "ДОСТАВКА", variant: "ship" }
        : { text: "ЗАКАЗ ОФОРМЛЕН", variant: "order" };
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
      : orderPlaced && status === "delivery"
        ? { href: `/purchases/${purchase.id}`, label: "Отследить", outline: true }
        : orderPlaced
          ? { href: `/purchases/${purchase.id}`, label: "Отследить заказ", outline: true }
          : { href: `/purchases/${purchase.id}`, label: "Открыть" };

  return (
    <article className={styles.card}>
      <div className={styles.imageWrap}>
        <Image src={img} alt="" width={400} height={240} className={styles.image} unoptimized />
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
              {status === "delivery" ? "В пути к точке выдачи" : "Обработка заказа"}
            </span>
          ) : (
            <div className={styles.avatars}>
              {[0, 1].map((i) => (
                <Image
                  key={i}
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=deal-${purchase.id}-${i}`}
                  alt=""
                  width={24}
                  height={24}
                  className={styles.avatar}
                  unoptimized
                />
              ))}
              {(purchase.participant_count ?? 0) > 2 ? (
                <span className={styles.avatarMore}>+{(purchase.participant_count ?? 0) - 2}</span>
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
