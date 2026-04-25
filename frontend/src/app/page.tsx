"use client";

import { useRouter } from "next/navigation";
import authStyles from "./auth/auth.module.css";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push("/home");
  };

  return (
    <div className={styles.authPage}>
      <main className={styles.authMain}>
        <section className={authStyles.card}>
          <h1 className={authStyles.title}>Авторизация</h1>
          <p className={authStyles.subtitle}>Войдите в аккаунт, чтобы продолжить</p>

          <form className={authStyles.form} onSubmit={handleSubmit}>
            <label className={authStyles.field}>
              <span>Email</span>
              <input type="email" placeholder="you@example.com" required />
            </label>

            <label className={authStyles.field}>
              <span>Пароль</span>
              <input type="password" placeholder="Введите пароль" required />
            </label>

            <button type="submit" className={authStyles.submit}>
              Войти
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
