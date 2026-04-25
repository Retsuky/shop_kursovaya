import styles from "./auth.module.css";

export default function Auth() {
  return (
    <section className={styles.card}>
      <h1 className={styles.title}>Авторизация</h1>
      <p className={styles.subtitle}>Войдите в аккаунт, чтобы продолжить</p>

      <form className={styles.form}>
        <label className={styles.field}>
          <span>Email</span>
          <input type="email" placeholder="you@example.com" required />
        </label>

        <label className={styles.field}>
          <span>Пароль</span>
          <input type="password" placeholder="Введите пароль" required />
        </label>

        <button type="submit" className={styles.submit}>
          Войти
        </button>
      </form>
    </section>
  );
}
