import tokens from "./landing-tokens.module.css";
import styles from "./marketing-footer.module.css";

export default function MarketingFooter() {
  return (
    <footer className={`${tokens.root} ${styles.footer}`}>
      <div className={styles.inner}>
        <div className={styles.brandBlock}>
          <div className={styles.brand}>CoBuy</div>
          <p className={styles.copy}>
            © {new Date().getFullYear()} CoBuy. Расширяем возможности сообществ через коллективную ценность, Автор Эм В.А. ИКБО-11-23.
          </p>
        </div>
      </div>
    </footer>
  );
}
