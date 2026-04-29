import Link from "next/link";
import tokens from "./landing-tokens.module.css";
import styles from "./category-section.module.css";

const categories = [
  { icon: "devices", label: "Электроника", slug: "Электроника" },
  { icon: "home", label: "Дом", slug: "Дом и уют" },
  { icon: "apparel", label: "Мода", slug: "Мода" },
  { icon: "kitchen", label: "Продукты", slug: "Дом и кухня" },
  { icon: "fitness_center", label: "Фитнес", slug: "Фитнес" },
  { icon: "more_horiz", label: "Смотреть все", slug: null },
];

export default function CategorySection() {
  return (
    <section className={`${tokens.root} ${styles.section}`}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>Покупки по категориям</h2>
        <div className={styles.grid}>
          {categories.map((cat) => (
            <Link
              key={cat.label}
              href={cat.slug ? `/catalog?categories=${encodeURIComponent(cat.slug)}` : "/catalog"}
              className={styles.item}
            >
              <div className={styles.iconCircle}>
                <span className={`material-symbols-outlined ${styles.icon}`}>{cat.icon}</span>
              </div>
              <span className={styles.label}>{cat.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
