"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import MarketingFooter from "../components/landing/MarketingFooter";
import MarketingHeader from "../components/landing/MarketingHeader";
import tokens from "../components/landing/landing-tokens.module.css";
import homeLanding from "../home/home-landing.module.css";
import {
  getCart,
  subscribeToCartChanges,
  updateCartLineQuantity,
  type CartLine,
} from "../../lib/cart";
import { formatRub } from "../../lib/catalogDisplay";
import styles from "./checkout.module.css";

const MAP_URL =
  "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&q=80";

const AVATAR_SEEDS = ["checkout-a", "checkout-b", "checkout-c", "checkout-d"];

function lineSubtotal(line: CartLine): number {
  const unit = Number(String(line.unitPrice).replace(",", "."));
  return Number.isFinite(unit) ? unit * line.quantity : 0;
}

export default function CheckoutView() {
  const router = useRouter();
  const [lines, setLines] = useState<CartLine[]>([]);
  /** false до первого чтения корзины из localStorage (иначе редирект срабатывает на пустом начальном state). */
  const [cartReady, setCartReady] = useState(false);
  const [delivery, setDelivery] = useState<"pickup" | "courier">("pickup");
  const [payment, setPayment] = useState<"card" | "sbp">("card");

  const sync = useCallback(() => {
    setLines(getCart());
  }, []);

  useEffect(() => {
    setLines(getCart());
    setCartReady(true);
    return subscribeToCartChanges(sync);
  }, [sync]);

  useEffect(() => {
    if (!cartReady) {
      return;
    }
    if (lines.length === 0) {
      router.replace("/cart");
    }
  }, [cartReady, lines.length, router]);

  const subtotal = lines.reduce((s, l) => s + lineSubtotal(l), 0);
  const deliveryNote =
    delivery === "pickup"
      ? "0 ₽"
      : "По тарифу курьера";
  const deliveryAmount = delivery === "pickup" ? 0 : 0;
  const total = subtotal + deliveryAmount;
  const socialCount = Math.max(3, lines.length * 4 + 8);

  const handlePlaceOrder = () => {
    if (lines.length === 0) {
      return;
    }
    router.push(`/purchases/${lines[0].purchaseId}`);
  };

  if (!cartReady || lines.length === 0) {
    return (
      <div className={`${homeLanding.landing} ${tokens.root}`}>
        <MarketingHeader />
        <div className={styles.page}>
          <p className={styles.hint}>{cartReady ? "Перенаправляем в корзину…" : "Загрузка…"}</p>
        </div>
        <MarketingFooter />
      </div>
    );
  }

  return (
    <div className={`${homeLanding.landing} ${tokens.root}`}>
      <MarketingHeader />
      <div className={styles.page}>
        <div className={styles.backRow}>
          <Link href="/cart" className={styles.backLink}>
            <span className="material-symbols-outlined" aria-hidden>
              arrow_back
            </span>
            Корзина
          </Link>
        </div>

        <div className={styles.grid}>
          <div className={styles.leftCol}>
            <header>
              <h1 className={styles.title}>Оформление заказа</h1>
              <p className={styles.hint}>
                Проверьте состав и способ получения. Участие в группе подтверждается на странице
                каждой сделки.
              </p>
            </header>

            <section className={styles.section} aria-labelledby="checkout-items">
              <h2 id="checkout-items" className={styles.sectionHead}>
                <span className={`material-symbols-outlined ${styles.icon}`}>shopping_bag</span>
                Детали заказа
              </h2>
              {lines.map((line) => {
                const sum = lineSubtotal(line);
                return (
                  <div key={line.purchaseId} className={styles.line}>
                    <div className={styles.thumb}>
                      <Image
                        src={line.imageUrl}
                        alt=""
                        width={128}
                        height={128}
                        unoptimized
                      />
                    </div>
                    <div className={styles.lineBody}>
                      <div className={styles.lineTop}>
                        <div>
                          <h3 className={styles.lineTitle}>
                            <Link href={`/purchases/${line.purchaseId}`}>{line.title}</Link>
                          </h3>
                          <p className={styles.meta}>{line.productName}</p>
                        </div>
                        <div className={styles.priceCol}>
                          <p className={styles.priceMain}>{formatRub(sum)}</p>
                        </div>
                      </div>
                      <div className={styles.qtyRow}>
                        <div className={styles.qtyCtl}>
                          <button
                            type="button"
                            className={styles.qtyBtn}
                            aria-label="Меньше"
                            onClick={() =>
                              updateCartLineQuantity(line.purchaseId, line.quantity - 1)
                            }
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                              remove
                            </span>
                          </button>
                          <span className={styles.qtyVal}>{line.quantity}</span>
                          <button
                            type="button"
                            className={`${styles.qtyBtn} ${styles.qtyBtnAdd}`}
                            aria-label="Больше"
                            onClick={() =>
                              updateCartLineQuantity(line.purchaseId, line.quantity + 1)
                            }
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                              add
                            </span>
                          </button>
                        </div>
                        <span className={styles.badgeGroup}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                            groups
                          </span>
                          Групповая цена
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className={styles.section} aria-labelledby="checkout-delivery">
              <h2 id="checkout-delivery" className={styles.sectionHead}>
                <span className={`material-symbols-outlined ${styles.icon}`}>local_shipping</span>
                Способ доставки
              </h2>
              <div className={styles.deliveryGrid}>
                <label
                  className={
                    delivery === "pickup" ? styles.deliveryCardActive : styles.deliveryCard
                  }
                >
                  <input
                    type="radio"
                    name="delivery"
                    checked={delivery === "pickup"}
                    onChange={() => setDelivery("pickup")}
                  />
                  <div className={styles.deliveryTop}>
                    <div>
                      <p className={styles.deliveryTitle}>Пункт выдачи</p>
                      <p className={styles.deliverySub}>Точный адрес сообщит организатор сделки.</p>
                    </div>
                    <span className="material-symbols-outlined" aria-hidden>
                      store
                    </span>
                  </div>
                </label>
                <label
                  className={
                    delivery === "courier" ? styles.deliveryCardActive : styles.deliveryCard
                  }
                >
                  <input
                    type="radio"
                    name="delivery"
                    checked={delivery === "courier"}
                    onChange={() => setDelivery("courier")}
                  />
                  <div className={styles.deliveryTop}>
                    <div>
                      <p className={styles.deliveryTitle}>Курьер</p>
                      <p className={styles.deliverySub}>Согласуйте с организатором после набора группы.</p>
                    </div>
                    <span className="material-symbols-outlined" aria-hidden>
                      delivery_dining
                    </span>
                  </div>
                </label>
              </div>
              <div className={styles.mapWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={MAP_URL} alt="" />
              </div>
            </section>

            <section className={styles.section} aria-labelledby="checkout-pay">
              <h2 id="checkout-pay" className={styles.sectionHead}>
                <span className={`material-symbols-outlined ${styles.icon}`}>payments</span>
                Способ оплаты
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label className={styles.payOption}>
                  <input
                    type="radio"
                    name="payment"
                    checked={payment === "card"}
                    onChange={() => setPayment("card")}
                  />
                  <span className="material-symbols-outlined" aria-hidden>
                    credit_card
                  </span>
                  <div className={styles.payBody}>
                    <p className={styles.payTitle}>Банковская карта</p>
                    <p className={styles.paySub}>Visa, Mastercard, МИР</p>
                  </div>
                </label>
                <label className={styles.payOption}>
                  <input
                    type="radio"
                    name="payment"
                    checked={payment === "sbp"}
                    onChange={() => setPayment("sbp")}
                  />
                  <span className="material-symbols-outlined" aria-hidden>
                    smartphone
                  </span>
                  <div className={styles.payBody}>
                    <p className={styles.payTitle}>Система быстрых платежей</p>
                    <p className={styles.paySub}>Оплата через приложение банка</p>
                  </div>
                  <span className={styles.payTag}>СБП</span>
                </label>
              </div>
            </section>
          </div>

          <aside className={styles.aside}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryDecor} aria-hidden />
              <h2 className={styles.summaryTitle}>Итого</h2>
              <div className={styles.summaryRows}>
                <div className={styles.summaryRow}>
                  <span>Товары ({lines.reduce((n, l) => n + l.quantity, 0)} шт.)</span>
                  <span>{formatRub(subtotal)}</span>
                </div>
                <div className={styles.summaryRowHighlight}>
                  <span>Групповая цена</span>
                  <span>учтена</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Доставка</span>
                  <span>{deliveryNote}</span>
                </div>
              </div>
              <div className={styles.totalBlock}>
                <span className={styles.totalLabel}>К оплате</span>
                <span className={styles.totalValue}>{formatRub(total)}</span>
              </div>
              <div className={styles.savingsBanner}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  savings
                </span>
                Вы оформляете участие по групповой цене
              </div>
              <button type="button" className={styles.submitBtn} onClick={handlePlaceOrder}>
                Оформить заказ
              </button>
              <p className={styles.legal}>
                Нажимая кнопку, вы переходите к сделке для подтверждения участия. Условия — публичная
                оферта организатора.
              </p>
            </div>

            <div className={styles.socialProof}>
              <div className={styles.avatarStack} aria-hidden>
                {AVATAR_SEEDS.map((seed) => (
                  <Image
                    key={seed}
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`}
                    alt=""
                    width={32}
                    height={32}
                    unoptimized
                  />
                ))}
                <span className={styles.avatarMore}>+{socialCount}</span>
              </div>
              <p className={styles.socialText}>
                Ещё участники в похожих группах — присоединяйтесь, чтобы быстрее закрыть минимум.
              </p>
            </div>

            {lines.length > 1 ? (
              <p className={styles.hint}>
                В корзине несколько сделок: после первой страницы откройте остальные из корзины и
                подтвердите участие там же.
              </p>
            ) : null}
          </aside>
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}
