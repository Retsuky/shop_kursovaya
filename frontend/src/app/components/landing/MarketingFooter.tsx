import tokens from "./landing-tokens.module.css";
import styles from "./marketing-footer.module.css";

const links = [
  { href: "#", label: "Поддержка" },
  { href: "#", label: "Конфиденциальность" },
  { href: "#", label: "Доставка и возврат" },
  { href: "#", label: "Стать партнером" },
  { href: "#", label: "Условия" },
];

export default function MarketingFooter() {
  return (
    <footer className={`${tokens.root} ${styles.footer}`}>
      <div className={styles.inner}>
        <div className={styles.brandBlock}>
          <div className={styles.brand}>CoBuy</div>
          <p className={styles.copy}>
            © {new Date().getFullYear()} CoBuy. Расширяем возможности сообществ через коллективную ценность.
          </p>
        </div>
        <nav className={styles.nav} aria-label="Нижнее меню">
          {links.map((l) => (
            <a key={l.label} href={l.href} className={styles.navLink}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className={styles.social}>
          <a href="#" className={styles.socialBtn} aria-label="Поделиться">
            <span className={`material-symbols-outlined ${styles.socialIcon}`}>share</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
