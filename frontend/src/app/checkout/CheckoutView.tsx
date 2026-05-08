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
  isCartLineGroupMinimumMet,
  subscribeToCartChanges,
  updateCartLineQuantity,
  type CartLine,
} from "../../lib/cart";
import { formatRub } from "../../lib/catalogDisplay";
import styles from "./checkout.module.css";

const COURIER_DRAFT_KEY = "shop_checkout_courier_v1";

type CourierDraft = {
  address: string;
  comment: string;
};

function loadCourierDraft(): CourierDraft {
  if (typeof window === "undefined") {
    return { address: "", comment: "" };
  }
  try {
    const raw = sessionStorage.getItem(COURIER_DRAFT_KEY);
    if (!raw) {
      return { address: "", comment: "" };
    }
    const j = JSON.parse(raw) as unknown;
    if (j == null || typeof j !== "object") {
      return { address: "", comment: "" };
    }
    const address = typeof (j as CourierDraft).address === "string" ? (j as CourierDraft).address : "";
    const comment = typeof (j as CourierDraft).comment === "string" ? (j as CourierDraft).comment : "";
    return { address, comment };
  } catch {
    return { address: "", comment: "" };
  }
}

function saveCourierDraft(draft: CourierDraft) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(COURIER_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

function formatDealDeadline(iso?: string): string | null {
  if (!iso?.trim()) {
    return null;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const [courierAddress, setCourierAddress] = useState("");
  const [courierComment, setCourierComment] = useState("");
  const [courierAddressError, setCourierAddressError] = useState("");
  const [courierDraftReady, setCourierDraftReady] = useState(false);

  const sync = useCallback(() => {
    setLines(getCart());
  }, []);

  useEffect(() => {
    setLines(getCart());
    setCartReady(true);
    const draft = loadCourierDraft();
    setCourierAddress(draft.address);
    setCourierComment(draft.comment);
    setCourierDraftReady(true);
    return subscribeToCartChanges(sync);
  }, [sync]);

  useEffect(() => {
    if (!courierDraftReady) {
      return;
    }
    saveCourierDraft({ address: courierAddress, comment: courierComment });
  }, [courierDraftReady, courierAddress, courierComment]);

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
  const allCartLinesGroupPrice = lines.length > 0 && lines.every(isCartLineGroupMinimumMet);

  const handlePlaceOrder = () => {
    if (lines.length === 0) {
      return;
    }
    if (delivery === "courier" && !courierAddress.trim()) {
      setCourierAddressError("Укажите адрес доставки курьером.");
      return;
    }
    setCourierAddressError("");
    router.push("/order-confirmed");
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
                Проверьте состав и способ получения. По кнопке «Оформить заказ» откроется подтверждение заказа.
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
                      {line.imageUrl.trim() ? (
                        <Image
                          src={line.imageUrl}
                          alt=""
                          width={128}
                          height={128}
                          unoptimized
                        />
                      ) : (
                        <div className={styles.thumbPlaceholder} aria-hidden />
                      )}
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
                        {isCartLineGroupMinimumMet(line) ? (
                        <span className={styles.badgeGroup}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                            groups
                          </span>
                          Групповая цена
                        </span>
                        ) : null}
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
                    onChange={() => {
                      setDelivery("pickup");
                      setCourierAddressError("");
                    }}
                  />
                  <div className={styles.deliveryTop}>
                    <div>
                      <p className={styles.deliveryTitle}>Пункт выдачи</p>
                      <p className={styles.deliverySub}>
                        Адрес и время выдачи задаёт организатор; данные по сделке — ниже.
                      </p>
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
                      <p className={styles.deliverySub}>
                        Адрес доставки указываете вы. Стоимость и интервал — с организатором.
                      </p>
                    </div>
                    <span className="material-symbols-outlined" aria-hidden>
                      delivery_dining
                    </span>
                  </div>
                </label>
              </div>
                  
                {delivery === "pickup" ? (
                  <>
                
                    <ul className={`${styles.deliveryDealList}`}>
                      {lines.map((line) => {
                        const deadlineLabel = formatDealDeadline(line.deadline);
                        return (
                          <li key={line.purchaseId} className={styles.deliveryDealCard}>
                            <p className={styles.deliveryDealTitle}>
                              <Link href={`/purchases/${line.purchaseId}`}>{line.title}</Link>
                            </p>
                            <p className={styles.deliveryDealMeta}>{line.productName}</p>
                            <dl className={styles.deliveryFacts}>
                              {deadlineLabel ? (
                                <>
                                  <dt>Сбор заявок до</dt>
                                  <dd>{deadlineLabel}</dd>
                                </>
                              ) : null}
                              <dt>Пункт выдачи</dt>
                              <dd>
                                {line.pickupAddress ? (
                                  <>
                                    {[line.city, line.pickupAddress].filter(Boolean).join(" · ") ||
                                      line.pickupAddress}
                                  </>
                                ) : line.city ? (
                                  <>
                                    Организатор указал город: {line.city}. Точный адрес пункта выдачи смотрите на
                                    странице сделки или уточните у организатора.
                                  </>
                                ) : (
                                  <>
                                    Организатор сообщит адрес пункта выдачи на странице сделки или после присоединения
                                    к группе.
                                  </>
                                )}
                              </dd>
                            </dl>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : (
                  <>
                  
                    <div className={styles.courierFields}>
                      <label className={styles.courierLabel} htmlFor="checkout-courier-address">
                        Адрес доставки
                        <textarea
                          id="checkout-courier-address"
                          className={`${styles.courierTextarea} ${courierAddressError ? styles.courierInputInvalid : ""}`}
                          rows={3}
                          placeholder="Город, улица, дом, квартира"
                          value={courierAddress}
                          onChange={(e) => {
                            setCourierAddress(e.target.value);
                            if (courierAddressError) {
                              setCourierAddressError("");
                            }
                          }}
                          required={delivery === "courier"}
                          aria-invalid={Boolean(courierAddressError)}
                          aria-describedby={courierAddressError ? "courier-addr-error" : undefined}
                        />
                      </label>
                      {courierAddressError ? (
                        <p id="courier-addr-error" className={styles.courierFieldError} role="alert">
                          {courierAddressError}
                        </p>
                      ) : null}
                      <label className={styles.courierLabel} htmlFor="checkout-courier-comment">
                        Комментарий <span className={styles.courierOptional}>(необязательно)</span>
                        <input
                          id="checkout-courier-comment"
                          type="text"
                          className={styles.courierInput}
                          placeholder="Подъезд, домофон, ориентир"
                          value={courierComment}
                          onChange={(e) => setCourierComment(e.target.value)}
                        />
                      </label>
                    </div>
                    <p className={styles.courierListIntro}>Ваши позиции:</p>
                    <ul className={styles.deliveryDealList}>
                      {lines.map((line) => {
                        const deadlineLabel = formatDealDeadline(line.deadline);
                        return (
                          <li key={line.purchaseId} className={styles.deliveryDealCard}>
                            <p className={styles.deliveryDealTitle}>
                              <Link href={`/purchases/${line.purchaseId}`}>{line.title}</Link>
                            </p>
                            {deadlineLabel ? (
                              <p className={styles.deliveryDealMeta}>Сбор заявок до {deadlineLabel}</p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
          
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
                {allCartLinesGroupPrice ? (
                <div className={styles.summaryRowHighlight}>
                  <span>Групповая цена</span>
                  <span>учтена</span>
                </div>
                ) : null}
                <div className={styles.summaryRow}>
                  <span>Доставка</span>
                  <span>{deliveryNote}</span>
                </div>
              </div>
              <div className={styles.totalBlock}>
                <span className={styles.totalLabel}>К оплате</span>
                <span className={styles.totalValue}>{formatRub(total)}</span>
              </div>
              {allCartLinesGroupPrice ? (
              <div className={styles.savingsBanner}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  savings
                </span>
                Вы оформляете участие по групповой цене
              </div>
              ) : null}
              <button type="button" className={styles.submitBtn} onClick={handlePlaceOrder}>
                Оформить заказ
              </button>
              <p className={styles.legal}>
                Нажимая кнопку, вы подтверждаете оформление заказа и переходите к экрану с подтверждением.
              </p>
            </div>

            {lines.length > 1 ? (
              <p className={styles.hint}>
                В корзине несколько сделок — они включаются в одно подтверждение; после него корзина очистится.
              </p>
            ) : null}
          </aside>
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}
