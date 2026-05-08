"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MarketingFooter from "./components/landing/MarketingFooter";
import MarketingHeader from "./components/landing/MarketingHeader";
import homeLanding from "./home/home-landing.module.css";
import authStyles from "./auth/auth.module.css";
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
    const s = getAuthSession();
    if (s) {
      router.replace(s.user.is_admin === true ? "/admin" : "/account");
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

      const user = response.data.user as { is_admin?: boolean };

      saveAuthSession({
        token: response.data.token,
        user: response.data.user,
      });

      router.push(user?.is_admin === true ? "/admin" : "/account");
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
    <div className={homeLanding.landing}>
      <MarketingHeader />
      <main className={authStyles.shell}>
        <div className={authStyles.layout}>
          <section className={authStyles.card}>
            <p className={authStyles.badge}>CoBuy</p>
            <h1 className={authStyles.title}>
              {mode === "login" ? "Вход в аккаунт" : "Регистрация"}
            </h1>
            <p className={authStyles.subtitle}>
              {mode === "login"
                ? "Войдите, чтобы участвовать в совместных закупках и отслеживать свои сделки."
                : "Создайте аккаунт и присоединяйтесь к коллективным покупкам."}

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
                    placeholder="Как к вам обращаться"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    autoComplete="name"
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
                  autoComplete="email"
                />
              </label>

              <label className={authStyles.field}>
                <span>Пароль</span>
                <input
                  type="password"
                  placeholder="Минимум надёжный пароль"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
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
                    : "Создать аккаунт"}
              </button>
            </form>

            <p className={authStyles.footerNote}>
              <Link href="/home">← На главную</Link>
              {" · "}
              <Link href="/catalog">Каталог</Link>
            </p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
