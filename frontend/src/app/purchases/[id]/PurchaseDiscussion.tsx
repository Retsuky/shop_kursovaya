"use client";

import axios from "axios";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../../lib/api";
import type { AuthSession } from "../../../lib/auth";
import ParticipantAvatar from "../../../lib/ParticipantAvatar";
import d from "./purchase-discussion.module.css";

export type DiscussionMessage = {
  id: number;
  purchase_id: number;
  user_id: number;
  user_name: string;
  email?: string;
  avatar_url: string;
  body: string;
  created_at: string;
};

type Props = {
  purchaseId: number;
  session: AuthSession | null;
  readOnly: boolean;
};

function formatMsgTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return "";
    }
    return d.toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function PurchaseDiscussion({ purchaseId, session, readOnly }: Props) {
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get<{ messages: DiscussionMessage[] }>(`/purchases/${purchaseId}/discussion`);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setError(e.response?.data?.message ?? "Не удалось загрузить обсуждение.");
      } else {
        setError("Ошибка сети.");
      }
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [purchaseId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const el = threadRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session || readOnly) {
      return;
    }
    const text = draft.trim();
    if (!text) {
      return;
    }
    setPosting(true);
    setError("");
    try {
      const { data } = await api.post<{ message: DiscussionMessage }>(`/purchases/${purchaseId}/discussion`, {
        body: text,
      });
      if (data?.message) {
        setMessages((prev) => [...prev, data.message]);
      }
      setDraft("");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Не удалось отправить.");
      } else {
        setError("Ошибка сети.");
      }
    } finally {
      setPosting(false);
    }
  }

  const canWrite = Boolean(session) && !readOnly;

  return (
    <>
      {error ? <p className={d.error}>{error}</p> : null}

      <div ref={threadRef} className={d.thread}>
        {loading ? (
          <p className={d.empty}>Загрузка…</p>
        ) : messages.length === 0 ? (
          <p className={d.empty}>Пока нет сообщений — задайте вопрос организатору или напишите участникам.</p>
        ) : (
          messages.map((m) => (
            <article key={m.id} className={d.item}>
              <div className={d.itemHead}>
                <ParticipantAvatar
                  participant={{ user_name: m.user_name, email: m.email, avatar_url: m.avatar_url }}
                  size={32}
                />
                <span className={d.author}>{m.user_name}</span>
                <time className={d.time} dateTime={m.created_at}>
                  {formatMsgTime(m.created_at)}
                </time>
              </div>
              <p className={d.text}>{m.body}</p>
            </article>
          ))
        )}
      </div>

      {readOnly ? (
        <p className={d.hint}>Закупка отменена — новые сообщения недоступны.</p>
      ) : canWrite ? (
        <form className={d.form} onSubmit={(ev) => void handleSubmit(ev)}>
          <label className={d.hint} htmlFor="discuss-body">
            Ваше сообщение (видно всем на странице закупки)
          </label>
          <textarea
            id="discuss-body"
            className={d.textarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={4000}
            placeholder="Например: можно ли забрать в другом районе?"
            disabled={posting}
          />
          <div className={d.row}>
            <button type="submit" className={d.submit} disabled={posting || !draft.trim()}>
              {posting ? "Отправка…" : "Отправить"}
            </button>
            <span className={d.hint}>{draft.length}/4000</span>
          </div>
        </form>
      ) : (
        <p className={d.hint}>
          Чтобы писать в обсуждении,{" "}
          <Link href="/" className={d.loginLink}>
            войдите в аккаунт
          </Link>
          .
        </p>
      )}
    </>
  );
}
