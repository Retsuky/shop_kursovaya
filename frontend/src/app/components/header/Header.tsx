import styles from "./header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.logo}>СП</span>
        <div>
          <p className={styles.title}>Совместные покупки</p>
          <p className={styles.subtitle}>Покупайте выгоднее вместе</p>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.login}>
          Вход
        </button>
        <button type="button" className={styles.logout}>
          Выход
        </button>
      </div>
    </header>
  );
}
