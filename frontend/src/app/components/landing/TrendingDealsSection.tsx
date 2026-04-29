import Link from "next/link";
import tokens from "./landing-tokens.module.css";
import TrendingDealCard from "./TrendingDealCard";
import styles from "./trending-deals-section.module.css";

const deals = [
  {
    title: "Aero-Max Performance Runners",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBinnOgENAwDx3Cjp4dVQm-QPyT4K0FmppHETJ1UnhzbQsh62rTK2YvmP_W003pxfxsduHErVaUoTQJDB0OQI-TN0IaGqKWAwigtEK0CAWzyhAZcmaZLKT4GKKO9jN_HVFJRkLvJDXEF0a4FvCwVcaSQIDXiotXhGcn1k40KUYuV1SpsP7OQc7Dcue_o7XY-bZziQ2HKMJeTsOlzM7e7HExDDB6RH8HNaEV-NwTL0SYEZpkEOJf_r5ztszeFh_qZxDqjTfmC_IgDK0",
    imageAlt: "Красные беговые кроссовки",
    price: "$45.00",
    oldPrice: "$89.00",
    discountLabel: "Скидка 50%",
    progressLabel: "75% набрано",
    progressPercent: 75,
    progressTone: "primary" as const,
    avatarCount: 3,
    extraParticipantsLabel: "+142 других",
    badge: { text: "Группа активна", variant: "active" as const },
    cta: { label: "Присоединиться к сделке", href: "/catalog", variant: "coral" as const },
  },
  {
    title: "Lumina Series Smart Watch",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC26lO61wxCc5Jz8IImp_m6QsJV7zooqvBcjoDmsJ1_P9lruNdGuRvGfhVzajqNztUS4S5tCDd6lv8GH1D0ZGiN9b54cvgtK66uDYz8aNcveCjhpGN2gKvwrbeB-AU1LGp7T7mtpskSkkXzzfDKw3WFdh_BIvFco5XZvNiAfhyoUt5YmYx_l2z4bS5c69iqNqjihxbYNdonIsW7AYwThuzZ4BYyfG9fuHEq33TsMJWkH2gkP3wuDWoQDAvLgNH9RnFGJQOWu7Gtpvg",
    imageAlt: "Минималистичные часы",
    price: "$120.00",
    oldPrice: "$249.00",
    discountLabel: "Скидка 52%",
    progressLabel: "100% набрано",
    progressPercent: 100,
    progressTone: "tertiary" as const,
    pulse: true,
    avatarCount: 2,
    footerHint: "Цель достигнута!",
    badge: { text: "Цель достигнута", variant: "goal" as const },
    cta: { label: "Забронировать место", href: "/catalog", variant: "teal" as const },
  },
  {
    title: "Sonic-X Noise Cancelling Headset",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCQmKd9WNLdbbfn1zTaBCGM_LWnpkBixBy1BmxqZRUpgeAVZFKVvGKcIMp5QHUloH1dJU6kXS_XGd8YqDemyP_vA4hM7J-GZDkY9KWb4PB6fdRarl_PnTpFCWI3oWqj-JDWd2yNC_4mbCnPrNT0S5omfmaz85Qoibih5iDX8KcKISTSLQCyuWdS3xyoD2aRQXxvSGtx-dcatS-hz1d_qD_b_atPjpavaocnqjVmuEieFEqZXZL5LaH1TYb_NhASiUV4eUqVI77QypE",
    imageAlt: "Беспроводные наушники",
    price: "$199.00",
    oldPrice: "$350.00",
    discountLabel: "Скидка 43%",
    progressLabel: "40% набрано",
    progressPercent: 40,
    progressTone: "primary" as const,
    footerHint: "Нужно еще 60 человек",
    badge: { text: "Группа активна", variant: "activeAlt" as const },
    cta: { label: "Присоединиться к сделке", href: "/catalog", variant: "coral" as const },
  },
];

export default function TrendingDealsSection() {
  return (
    <section id="trending" className={`${tokens.root} ${styles.section}`}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <div>
            <h2 className={styles.heading}>Трендовые групповые сделки</h2>
            <p className={styles.subtitle}>Популярные товары, близкие к целевому участию</p>
          </div>
          <Link href="/catalog" className={styles.viewAll}>
            Смотреть все
            <span className={`material-symbols-outlined ${styles.arrow}`}>arrow_forward</span>
          </Link>
        </div>

        <div className={styles.grid}>
          {deals.map((deal) => (
            <TrendingDealCard key={deal.title} {...deal} />
          ))}
        </div>
      </div>
    </section>
  );
}
