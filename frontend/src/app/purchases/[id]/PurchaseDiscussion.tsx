"use client";

import axios from "axios";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../../lib/api";
import type { AuthSession } from "../../../lib/auth";
import ParticipantAvatar from "../../../lib/ParticipantAvatar";
import d from "./purchase-discussion.module.css";

export type PurchaseReview = {
  id: number;
  purchase_id: number;
  user_id: number;
  user_name: string;
  email?: string;
  avatar_url: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
};

type Props = {
  purchaseId: number;
  session: AuthSession | null;
  readOnly: boolean;
  onSummaryChange?: (summary: { avg: number; total: number }) => void;
};

function formatTime(iso: string): string {
  try {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) {
      return "";
    }
    return dt.toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function starsFromRating(rating: number): ("star" | "star_outline")[] {
  return Array.from({ length: 5 }, (_, i) => (i < rating ? "star" : "star_outline"));
}

function starsText(rating: number): string {
  const clamped = Math.max(1, Math.min(5, Math.floor(rating)));
  return `${"★".repeat(clamped)}${"☆".repeat(5 - clamped)}`;
}

export default function PurchaseReviews({ purchaseId, session, readOnly, onSummaryChange }: Props) {
  const [reviews, setReviews] = useState<PurchaseReview[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [rating, setRating] = useState(5);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get<{
        summary?: { avg_rating?: number; total?: number };
        reviews?: PurchaseReview[];
      }>(`/purchases/${purchaseId}/reviews`);
      const avg = Number(data.summary?.avg_rating ?? 0);
      const total = Number(data.summary?.total ?? 0);
      setAvgRating(Number.isFinite(avg) ? avg : 0);
      setTotalReviews(Number.isFinite(total) ? total : 0);
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      onSummaryChange?.({ avg: Number.isFinite(avg) ? avg : 0, total: Number.isFinite(total) ? total : 0 });
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setError(e.response?.data?.message ?? "Не удалось загрузить отзывы.");
      } else {
        setError("Ошибка сети.");
      }
      setReviews([]);
      setAvgRating(0);
      setTotalReviews(0);
      onSummaryChange?.({ avg: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  }, [purchaseId, onSummaryChange]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session || readOnly) {
      return;
    }
    setPosting(true);
    setError("");
    try {
      const { data } = await api.post<{
        review?: PurchaseReview;
        summary?: { avg_rating?: number; total?: number };
      }>(`/purchases/${purchaseId}/reviews`, {
        rating,
        comment: draft.trim(),
      });
      if (data?.review) {
        setReviews((prev) => {
          const others = prev.filter((r) => r.user_id !== data.review!.user_id);
          return [data.review!, ...others];
        });
      }
      const avg = Number(data.summary?.avg_rating ?? avgRating);
      const total = Number(data.summary?.total ?? totalReviews);
      if (Number.isFinite(avg)) {
        setAvgRating(avg);
      }
      if (Number.isFinite(total)) {
        setTotalReviews(total);
      }
      onSummaryChange?.({
        avg: Number.isFinite(avg) ? avg : avgRating,
        total: Number.isFinite(total) ? total : totalReviews,
      });
      setDraft("");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Не удалось сохранить отзыв.");
      } else {
        setError("Ошибка сети.");
      }
    } finally {
      setPosting(false);
    }
  }

  const canWrite = Boolean(session) && !readOnly;
  const hasOwnReview = Boolean(
    session && reviews.some((r) => r.user_id === session.user.id)
  );
  const ratingStars = useMemo(() => starsFromRating(Math.max(1, Math.min(5, Math.floor(rating)))), [rating]);

  return (
    <>
      {error ? <p className={d.error}>{error}</p> : null}

      {readOnly ? (
        <p className={d.hint}>Закупка отменена — новые отзывы недоступны.</p>
      ) : canWrite ? (
        <form className={d.form} onSubmit={(ev) => void handleSubmit(ev)}>
          <label className={d.hint}>
            Ваша оценка
          </label>
          <div className={d.ratingInput}>
            {ratingStars.map((icon, i) => {
              const value = i + 1;
              return (
                <button
                  key={value}
                  type="button"
                  className={d.starBtn}
                  onClick={() => setRating(value)}
                  aria-label={`Оценка ${value}`}
                >
                  <span className={d.starInput}>{icon === "star" ? "★" : "☆"}</span>
                </button>
              );
            })}
          </div>
          <label className={d.hint} htmlFor="review-body">
            Комментарий (необязательно)
          </label>
          <textarea
            id="review-body"
            className={d.textarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            placeholder="Например: быстрая выдача и хорошая коммуникация."
            disabled={posting}
          />
          <div className={d.row}>
            <button type="submit" className={d.submit} disabled={posting}>
              {posting ? "Сохранение…" : hasOwnReview ? "Заменить отзыв" : "Оставить отзыв"}
            </button>
            <span className={d.hint}>{draft.length}/2000</span>
          </div>
        </form>
      ) : (
        <p className={d.hint}>
          Чтобы оставлять отзывы,{" "}
          <Link href="/" className={d.loginLink}>
            войдите в аккаунт
          </Link>
          .
        </p>
      )}

      <div className={d.thread}>
        {loading ? (
          <p className={d.empty}>Загрузка…</p>
        ) : reviews.length === 0 ? (
          <p className={d.empty}>Пока нет отзывов — станьте первым, кто оценит эту закупку.</p>
        ) : (
          reviews.map((r) => (
            <article key={r.id} className={d.item}>
              <div className={d.itemHead}>
                <ParticipantAvatar
                  participant={{ user_name: r.user_name, email: r.email, avatar_url: r.avatar_url }}
                  size={32}
                />
                <span className={d.author}>{r.user_name}</span>
                <span className={d.inlineRating}>{starsText(r.rating)}</span>
                <time className={d.time} dateTime={r.updated_at || r.created_at}>
                  {formatTime(r.updated_at || r.created_at)}
                </time>
              </div>
              <p className={d.text}>{r.comment || "Без комментария"}</p>
            </article>
          ))
        )}
      </div>
    </>
  );
}
