"use client";

import { useState } from "react";
import type { Purchase } from "../../../lib/purchasesMeta";
import { addPurchaseToCart, canReserveInCart } from "../../../lib/cart";
import styles from "./add-to-cart-button.module.css";

type Props = {
  purchase: Purchase;
};

export default function AddToCartButton({ purchase }: Props) {
  const [hint, setHint] = useState<string | null>(null);
  const allowed = canReserveInCart(purchase);

  const handleClick = () => {
    if (!allowed) {
      return;
    }
    addPurchaseToCart(purchase, 1);
    setHint("В корзине");
    window.setTimeout(() => setHint(null), 2000);
  };

  if (!allowed) {
    return (
      <button type="button" className={styles.btn} disabled>
        Недоступно для корзины
      </button>
    );
  }

  return (
    <button type="button" className={styles.btn} onClick={handleClick}>
      {hint ?? "В корзину"}
    </button>
  );
}
