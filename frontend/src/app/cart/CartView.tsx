"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import MarketingFooter from "../components/landing/MarketingFooter";
import MarketingHeader from "../components/landing/MarketingHeader";
import homeLanding from "../home/home-landing.module.css";
import {
  clearCart,
  getCart,
  removeCartLine,
  subscribeToCartChanges,
  updateCartLineQuantity,
  type CartLine,
} from "../../lib/cart";
import { formatRub } from "../../lib/catalogDisplay";
import styles from "./cart.module.css";

export default function CartView() {
  const router = useRouter();
  const [lines, setLines] = useState<CartLine[]>([]);

  const sync = useCallback(() => {
    setLines(getCart());
  }, []);

  useEffect(() => {
    sync();
    return subscribeToCartChanges(sync);
  }, [sync]);

  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
  const subtotal = lines.reduce((s, l) => {
    const unit = Number(String(l.unitPrice).replace(",", "."));
    return s + (Number.isFinite(unit) ? unit * l.quantity : 0);
  }, 0);

  const handleCheckout = () => {
    if (lines.length === 0) {
      return;
    }
    router.push("/checkout");
  };

  return (
    <div className={homeLanding.landing}>
      <MarketingHeader />
      <div className={styles.page}>
        <header className={styles.head}>
          <h1 className={styles.title}>Корзина</h1>
          <p className={styles.subtitle}>
            Отложенные групповые сделки. Количество — заявленные места; оформление — на странице каждой закупки.
          </p>
        </header>

        {lines.length === 0 ? (
          <div className={styles.empty}>
            <div className={`material-symbols-outlined ${styles.emptyIcon}`}>shopping_cart</div>
            <p className={styles.emptyTitle}>Корзина пуста</p>
            <p>
              Добавляйте сделки из{" "}
              <Link href="/catalog">каталога</Link> кнопкой «В корзину».
            </p>
          </div>
        ) : (
          <div className={styles.layout}>
            <div className={styles.list}>
              {lines.map((line) => {
                const unit = Number(String(line.unitPrice).replace(",", "."));
                const lineSum = Number.isFinite(unit) ? unit * line.quantity : 0;
                return (
                  <article key={line.purchaseId} className={styles.line}>
                    <div className={styles.thumb}>
                      <Image
                        src={line.imageUrl}
                        alt=""
                        width={100}
                        height={100}
                        unoptimized
                      />
                    </div>
                    <div className={styles.lineBody}>
                      <h2 className={styles.lineTitle}>
                        <Link href={`/purchases/${line.purchaseId}`}>{line.title}</Link>
                      </h2>
                      <p className={styles.lineMeta}>{line.productName}</p>
                      <p className={styles.price}>{formatRub(line.unitPrice)} за шт.</p>
                      <div className={styles.qtyRow}>
                        <button
                          type="button"
                          className={styles.qtyBtn}
                          aria-label="Меньше"
                          onClick={() =>
                            updateCartLineQuantity(line.purchaseId, line.quantity - 1)
                          }
                        >
                          −
                        </button>
                        <span className={styles.qtyValue}>{line.quantity}</span>
                        <button
                          type="button"
                          className={styles.qtyBtn}
                          aria-label="Больше"
                          onClick={() =>
                            updateCartLineQuantity(line.purchaseId, line.quantity + 1)
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className={styles.lineActions}>
                      <span className={styles.lineSum}>{formatRub(lineSum)}</span>
                      <button
                        type="button"
                        className={styles.remove}
                        onClick={() => removeCartLine(line.purchaseId)}
                      >
                        Удалить
                      </button>
                    </div>
                  </article>
                );
              })}
              <button type="button" className={styles.clearBtn} onClick={() => clearCart()}>
                Очистить корзину
              </button>
            </div>

            <aside className={styles.sidebar}>
              <div className={styles.summary}>
                <h2 className={styles.summaryTitle}>Итого</h2>
                <div className={styles.summaryRow}>
                  <span>Позиций</span>
                  <span>{lines.length}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Единиц товара</span>
                  <span>{totalQty}</span>
                </div>
                <div className={styles.summaryTotal}>
                  <span>Сумма</span>
                  <span className={styles.totalValue}>{formatRub(subtotal)}</span>
                </div>
                <button type="button" className={styles.checkout} onClick={handleCheckout}>
                  Перейти к оформлению
                </button>
                <Link href="/catalog" className={styles.checkoutSecondary}>
                  Продолжить покупки
                </Link>
                <p className={styles.hint}>
                  Участие подтверждается на странице сделки: укажите количество и присоединитесь к группе.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
      <MarketingFooter />
    </div>
  );
}
