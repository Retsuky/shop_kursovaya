"use client";

import Link from "next/link";
import { useEffect } from "react";
import MarketingFooter from "../components/landing/MarketingFooter";
import MarketingHeader from "../components/landing/MarketingHeader";
import tokens from "../components/landing/landing-tokens.module.css";
import homeLanding from "../home/home-landing.module.css";
import { clearCart } from "../../lib/cart";
import styles from "./order-confirmed.module.css";

/** Тот же ключ, что в CheckoutView — черновик адреса курьера */
const COURIER_DRAFT_KEY = "shop_checkout_courier_v1";

export default function OrderConfirmedView() {
  useEffect(() => {
    clearCart();
    try {
      sessionStorage.removeItem(COURIER_DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className={`${homeLanding.landing} ${tokens.root}`}>
      <MarketingHeader />
      <main className={styles.main}>
        <div className={styles.card}>
          <div className={`material-symbols-outlined ${styles.icon}`} aria-hidden>
            check_circle
          </div>
          <h1 className={styles.title}>Ваш заказ подтверждён</h1>
          <p className={styles.lead}>Спасибо за ваш заказ. Хороших покупок в CoBuy.</p>
          <p className={styles.note}>Корзина очищена — при желании добавьте новые позиции в каталоге.</p>
          <div className={styles.actions}>
            <Link href="/catalog" className={styles.btnPrimary}>
              В каталог
            </Link>
            <Link href="/home" className={styles.btnGhost}>
              На главную
            </Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
