"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import api from "../../../lib/api";
import {
  getAuthSession,
  saveAuthSession,
  subscribeToAuthChanges,
  type AuthSession,
  type AuthUser,
} from "../../../lib/auth";
import { uploadProductImage } from "../../../lib/uploadProductImage";
import { UserAvatar } from "../../../lib/UserAvatar";
import sub from "../account-subpages.module.css";

export default function AccountSettingsView() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [session, setSession] = useState<AuthSession | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdOk, setPwdOk] = useState("");

  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarOk, setAvatarOk] = useState("");

  const [paymentDetails, setPaymentDetails] = useState("");
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentOk, setPaymentOk] = useState("");

  useEffect(() => {
    const s = getAuthSession();
    if (!s) {
      router.replace("/");
      return;
    }
    setSession(s);
  }, [router]);

  useEffect(() => {
    return subscribeToAuthChanges(() => {
      if (!getAuthSession()) {
        router.replace("/");
        return;
      }
      const next = getAuthSession();
      if (next) {
        setSession(next);
      }
    });
  }, [router]);

  useEffect(() => {
    if (!session) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{ user: AuthUser }>("/auth/me");
        if (cancelled || !data?.user) {
          return;
        }
        saveAuthSession({ token: session.token, user: data.user });
        setSession(getAuthSession());
      } catch {
        /* сохраняем локальную сессию */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.token]);

  useEffect(() => {
    if (session?.user.payment_details != null) {
      setPaymentDetails(session.user.payment_details);
    }
  }, [session?.user.payment_details]);

  async function patchAvatarUrl(url: string): Promise<boolean> {
    setAvatarError("");
    setAvatarOk("");
    setAvatarBusy(true);
    try {
      const { data } = await api.patch<{ user: AuthUser }>("/auth/profile", {
        avatar_url: url,
      });
      const token = session?.token ?? getAuthSession()?.token ?? "";
      if (!token || !data?.user) {
        throw new Error("Сессия устарела. Выйдите и войдите снова.");
      }
      saveAuthSession({ token, user: data.user });
      setSession(getAuthSession());
      setAvatarOk(url ? "Фото профиля обновлено." : "Фото профиля сброшено.");
      return true;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message;
        setAvatarError(typeof msg === "string" ? msg : "Не удалось сохранить фото.");
      } else if (err instanceof Error) {
        setAvatarError(err.message);
      } else {
        setAvatarError("Ошибка сети.");
      }
      return false;
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file || !session) {
      return;
    }
    setAvatarError("");
    setAvatarOk("");
    setAvatarBusy(true);
    try {
      const url = await uploadProductImage(file);
      await patchAvatarUrl(url);
    } catch (err) {
      if (err instanceof Error) {
        setAvatarError(err.message);
      } else {
        setAvatarError("Не удалось загрузить файл.");
      }
      setAvatarBusy(false);
    }
  }

  async function handleRemoveAvatarClick() {
    if (!session?.user.avatar_url?.trim()) {
      return;
    }
    await patchAvatarUrl("");
  }

  async function handlePaymentDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPaymentError("");
    setPaymentOk("");
    setPaymentBusy(true);
    try {
      const { data } = await api.patch<{ user: AuthUser }>("/auth/profile", {
        payment_details: paymentDetails,
      });
      const token = session?.token ?? getAuthSession()?.token ?? "";
      if (!token || !data?.user) {
        throw new Error("Сессия устарела. Выйдите и войдите снова.");
      }
      saveAuthSession({ token, user: data.user });
      setSession(getAuthSession());
      setPaymentOk("Реквизиты сохранены.");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message;
        setPaymentError(typeof msg === "string" ? msg : "Не удалось сохранить реквизиты.");
      } else if (err instanceof Error) {
        setPaymentError(err.message);
      } else {
        setPaymentError("Ошибка сети.");
      }
    } finally {
      setPaymentBusy(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwdError("");
    setPwdOk("");
    if (newPassword !== confirmPassword) {
      setPwdError("Новый пароль и повтор не совпадают.");
      return;
    }
    if (newPassword.trim().length < 8) {
      setPwdError("Новый пароль должен содержать не меньше 8 символов.");
      return;
    }
    setPwdBusy(true);
    try {
      const { data } = await api.patch<{ message?: string }>("/auth/password", {
        currentPassword,
        newPassword: newPassword.trim(),
      });
      setPwdOk(data?.message ?? "Пароль изменён.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message;
        setPwdError(typeof msg === "string" ? msg : "Не удалось сменить пароль.");
      } else {
        setPwdError("Ошибка сети.");
      }
    } finally {
      setPwdBusy(false);
    }
  }

  if (!session) {
    return null;
  }

  return (
    <>
      <div className={sub.pageHead}>
        <h1 className={sub.pageTitle}>Настройки</h1>
        <p className={sub.pageLead}>
          Данные профиля хранятся в вашем аккаунте на сервере. Пароль и фото можно обновить в любой момент.
        </p>
      </div>

      <div className={sub.settingsCard}>
        <div className={sub.settingsSection}>
          <h2 className={sub.settingsSectionTitle}>Профиль</h2>
          <div className={sub.profileGrid}>
            <div className={sub.profileWide}>
              <span className={sub.profileLabel}>Фото профиля</span>
              <div className={sub.avatarUploader}>
                <div className={sub.avatarPreviewLarge}>
                  <UserAvatar user={session.user} size={96} className={sub.avatarLargeImg} />
                </div>
                <div className={sub.avatarUploaderActions}>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className={sub.visuallyHidden}
                    onChange={(ev) => void handleAvatarFileChange(ev)}
                  />
                  <button
                    type="button"
                    className={sub.avatarUploadBtn}
                    disabled={avatarBusy}
                    onClick={() => fileRef.current?.click()}
                  >
                    {avatarBusy ? "Загрузка…" : "Загрузить фото"}
                  </button>
                  {session.user.avatar_url?.trim() ? (
                    <button
                      type="button"
                      className={sub.avatarBtnGhost}
                      disabled={avatarBusy}
                      onClick={() => void handleRemoveAvatarClick()}
                    >
                      Убрать фото
                    </button>
                  ) : null}
                  <p className={sub.avatarHint}>Поддерживаются JPEG, PNG, GIF и WebP до 5 МБ (как у фото товаров).</p>
                  {avatarError ? (
                    <p className={sub.pwdError} role="alert">
                      {avatarError}
                    </p>
                  ) : null}
                  {avatarOk ? (
                    <p className={sub.pwdOk} role="status">
                      {avatarOk}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className={sub.profileReadonlyRow}>
              <span className={sub.profileLabel}>Имя</span>
              <p className={sub.profileValue}>{session.user.name}</p>
            </div>
            <div className={sub.profileReadonlyRow}>
              <span className={sub.profileLabel}>Электронная почта</span>
              <p className={sub.profileValue}>{session.user.email}</p>
            </div>
            <div className={sub.profileReadonlyRow}>
              <span className={sub.profileLabel}>Аккаунт с</span>
              <p className={sub.profileValue}>
                {new Date(session.user.created_at).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        <div className={`${sub.settingsSection} ${sub.passwordSection}`}>
          <h2 className={sub.settingsSectionTitle}>Реквизиты для оплаты</h2>
          <p className={sub.paymentDetailsHint}>
            Если вы организатор сделок, укажите, куда участники должны переводить оплату (банк, карта, СБП,
            получатель). Эти данные увидят покупатели при оформлении заказа по вашим закупкам.
          </p>
          <form className={sub.paymentDetailsForm} onSubmit={(e) => void handlePaymentDetailsSubmit(e)}>
            <label className={sub.pwdField}>
              Реквизиты
              <textarea
                className={sub.paymentDetailsInput}
                value={paymentDetails}
                onChange={(e) => setPaymentDetails(e.target.value)}
                placeholder={
                  "Например:\nСбербанк, карта 4276 …\nПолучатель: Иван Иванов\nСБП: +7 …"
                }
                maxLength={4000}
              />
            </label>
            {paymentError ? (
              <p className={sub.pwdError} role="alert">
                {paymentError}
              </p>
            ) : null}
            {paymentOk ? (
              <p className={sub.pwdOk} role="status">
                {paymentOk}
              </p>
            ) : null}
            <button type="submit" className={sub.pwdSubmit} disabled={paymentBusy}>
              {paymentBusy ? "Сохранение…" : "Сохранить реквизиты"}
            </button>
          </form>
        </div>

        <div className={`${sub.settingsSection} ${sub.passwordSection}`}>
          <h2 className={sub.settingsSectionTitle}>Смена пароля</h2>
          <form className={sub.passwordForm} onSubmit={(e) => void handlePasswordSubmit(e)}>
            <label className={sub.pwdField}>
              Текущий пароль
              <input
                type="password"
                className={sub.pwdInput}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <label className={sub.pwdField}>
              Новый пароль
              <input
                type="password"
                className={sub.pwdInput}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label className={sub.pwdField}>
              Подтверждение
              <input
                type="password"
                className={sub.pwdInput}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <p className={sub.pwdHint}>Не короче 8 символов. После смены вы остаётесь в системе с текущей сессией.</p>
            {pwdError ? (
              <p className={sub.pwdError} role="alert">
                {pwdError}
              </p>
            ) : null}
            {pwdOk ? (
              <p className={sub.pwdOk} role="status">
                {pwdOk}
              </p>
            ) : null}
            <button type="submit" className={sub.pwdSubmit} disabled={pwdBusy}>
              {pwdBusy ? "Сохранение…" : "Сохранить новый пароль"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
