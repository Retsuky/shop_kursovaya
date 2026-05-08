"use client";

import axios from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import MarketingFooter from "../../components/landing/MarketingFooter";
import MarketingHeader from "../../components/landing/MarketingHeader";
import tokens from "../../components/landing/landing-tokens.module.css";
import homeLanding from "../../home/home-landing.module.css";
import api from "../../../lib/api";
import { getAuthSession, subscribeToAuthChanges, type AuthSession } from "../../../lib/auth";
import type { Purchase, PurchaseStatus } from "../../../lib/purchasesMeta";
import { getNextStatus } from "../../../lib/purchasesMeta";
import { resolvePurchaseUnitPriceNumeric } from "../../../lib/catalogDisplay";
import PurchaseDetailStitch from "./PurchaseDetailStitch";
import stitchStyles from "./purchase-detail-stitch.module.css";

type Participant = {
  user_id: number;
  quantity: number;
  user_name: string;
  email?: string;
  avatar_url?: string;
  joined_at?: string;
};

type DetailResponse = {
  purchase: Purchase;
  participants: Participant[];
};

export default function PurchaseDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const idParam = typeof routeParams?.id === "string" ? routeParams.id : "";
  const purchaseId = Number(idParam);

  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState<AuthSession | null>(null);

  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const sync = () => setSession(getAuthSession());
    sync();
    return subscribeToAuthChanges(sync);
  }, []);

  const loadPurchase = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get<DetailResponse>(`/purchases/${purchaseId}`);
      setData(res.data);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        if (e.response?.status === 404) {
          setError("Закупка не найдена.");
        } else {
          setError(e.response?.data?.message ?? "Не удалось загрузить закупку.");
        }
      } else {
        setError("Ошибка сети.");
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [purchaseId]);

  useEffect(() => {
    if (!Number.isInteger(purchaseId)) {
      setLoading(false);
      setError("Некорректная ссылка.");
      return undefined;
    }

    loadPurchase();
    return undefined;
  }, [purchaseId, loadPurchase]);

  const purchase = data?.purchase ?? null;
  const participants = data?.participants ?? [];

  const isOrganizer = session && purchase ? session.user.id === purchase.organizer_id : false;

  const myParticipant = useMemo(
    () =>
      session ? participants.find((participant) => participant.user_id === session.user.id) : undefined,
    [participants, session]
  );

  const totalSum = useMemo(() => {
    if (!purchase) {
      return 0;
    }

    const price = resolvePurchaseUnitPriceNumeric(purchase);
    const qtyTotal = purchase.total_quantity ?? 0;

    if (!Number.isFinite(price)) {
      return 0;
    }

    return Math.round(price * qtyTotal * 100) / 100;
  }, [purchase]);

  const nextStatus = purchase ? getNextStatus(String(purchase.status)) : null;

  async function handleAdvanceStatus() {
    if (!nextStatus) {
      return;
    }

    setActionError("");
    setPending(true);

    try {
      await api.patch(`/purchases/${purchaseId}/status`, { status: nextStatus });
      await loadPurchase();
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setActionError(e.response?.data?.message ?? "Не удалось сменить статус.");
      }
    } finally {
      setPending(false);
    }
  }

  async function handleCancel() {
    const ok = window.confirm("Отменить закупку для всех участников?");

    if (!ok) {
      return;
    }

    setActionError("");
    setPending(true);

    try {
      await api.patch(`/purchases/${purchaseId}/status`, { status: "cancelled" });
      await loadPurchase();
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setActionError(e.response?.data?.message ?? "Не удалось отменить.");
      }
    } finally {
      setPending(false);
    }
  }

  async function handleJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      router.push("/");
      return;
    }

    setActionError("");
    setPending(true);

    try {
      await api.post(`/purchases/${purchaseId}/join`, { quantity: 1 });
      await loadPurchase();
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setActionError(e.response?.data?.message ?? "Не удалось присоединиться.");
      }
    } finally {
      setPending(false);
    }
  }

  async function handleLeave() {
    const ok = window.confirm("Отказаться от участия в этой закупке? Количество мест для вас будет снято.");

    if (!ok) {
      return;
    }

    setActionError("");
    setPending(true);

    try {
      await api.delete(`/purchases/${purchaseId}/join`);
      await loadPurchase();
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setActionError(e.response?.data?.message ?? "Не удалось выйти.");
      }
    } finally {
      setPending(false);
    }
  }

  function handleShare() {
    if (!purchase || typeof window === "undefined") {
      return;
    }
    const url = window.location.href;
    if (navigator.share) {
      void navigator.share({ title: purchase.title, text: purchase.product_name, url }).catch(() => {
        void navigator.clipboard.writeText(url);
      });
    } else {
      void navigator.clipboard.writeText(url);
    }
  }

  const deadlinePassed = purchase ? new Date(purchase.deadline).getTime() < Date.now() : false;

  if (loading) {
    return (
      <div className={`${tokens.root} ${homeLanding.landing} ${stitchStyles.pageWrap}`}>
        <MarketingHeader />
        <main className={stitchStyles.main}>
          <p className={stitchStyles.muted}>Загрузка…</p>
        </main>
        <MarketingFooter />
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className={`${tokens.root} ${homeLanding.landing} ${stitchStyles.pageWrap}`}>
        <MarketingHeader />
        <main className={stitchStyles.main}>
          <div className={stitchStyles.errorBanner}>{error || "Не удалось открыть страницу."}</div>
          <p style={{ marginTop: 16 }}>
            <Link href="/catalog" className={stitchStyles.backLink}>
              В каталог
            </Link>
          </p>
        </main>
        <MarketingFooter />
      </div>
    );
  }

  return (
    <PurchaseDetailStitch
      purchase={purchase}
      participants={participants}
      session={session}
      isOrganizer={Boolean(isOrganizer)}
      myParticipant={myParticipant}
      pending={pending}
      actionError={actionError}
      deadlinePassed={deadlinePassed}
      nextStatus={nextStatus}
      totalSum={totalSum}
      onJoin={handleJoin}
      onLeave={handleLeave}
      onAdvanceStatus={handleAdvanceStatus}
      onCancel={handleCancel}
      onShare={handleShare}
    />
  );
}
