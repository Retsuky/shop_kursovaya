"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import authStyles from "./auth/auth.module.css";
import styles from "./page.module.css";
import api from "../lib/api";
import { getAuthSession, saveAuthSession } from "../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (getAuthSession()) {
      router.replace("/account");
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response =
        mode === "login"
          ? await api.post("/auth/login", {
              email,
              password,
            })
          : await api.post("/auth/register", {
              name,
              email,
              password,
            });

      saveAuthSession({
        token: response.data.token,
        user: response.data.user,
      });

      router.push("/account");
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        setError(
          requestError.response?.data?.message ||
            (mode === "login"
              ? "Не удалось выполнить вход."
              : "Не удалось выполнить регистрацию.")
        );
      } else {
        setError("Произошла непредвиденная ошибка.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <main className={styles.authMain}>
        <section className={authStyles.card}>
          <h1 className={authStyles.title}>
            {mode === "login" ? "Авторизация" : "Регистрация"}
          </h1>
          <p className={authStyles.subtitle}>
            {mode === "login"
              ? "Войдите в аккаунт, чтобы продолжить"
              : "Создайте аккаунт, чтобы продолжить"}
          </p>

          <div className={authStyles.modeSwitch}>
            <button
              type="button"
              className={mode === "login" ? authStyles.modeButtonActive : authStyles.modeButton}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Войти
            </button>
            <button
              type="button"
              className={mode === "register" ? authStyles.modeButtonActive : authStyles.modeButton}
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              Регистрация
            </button>
          </div>

          <form className={authStyles.form} onSubmit={handleSubmit}>
            {mode === "register" ? (
              <label className={authStyles.field}>
                <span>Имя</span>
                <input
                  type="text"
                  placeholder="Ваше имя"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
            ) : null}

            <label className={authStyles.field}>
              <span>Email</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className={authStyles.field}>
              <span>Пароль</span>
              <input
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error ? <p className={authStyles.error}>{error}</p> : null}

            <button type="submit" className={authStyles.submit} disabled={isSubmitting}>
              {isSubmitting
                ? mode === "login"
                  ? "Входим..."
                  : "Регистрируем..."
                : mode === "login"
                  ? "Войти"
                  : "Зарегистрироваться"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
