"use client";

import { useEffect, useState } from "react";
import type { Purchase } from "../../../lib/purchasesMeta";
import {
  addPurchaseToCart,
  canReserveInCart,
  getCart,
  removeCartLine,
  subscribeToCartChanges,
} from "../../../lib/cart";
import styles from "./add-to-cart-button.module.css";

type Props = {
  purchase: Purchase;
};

export default function AddToCartButton({ purchase }: Props) {
  const [inCart, setInCart] = useState(false);
  const allowed = canReserveInCart(purchase);

  useEffect(() => {
    const sync = () => {
      const exists = getCart().some((line) => line.purchaseId === purchase.id);
      setInCart(exists);
    };
    sync();
    return subscribeToCartChanges(sync);
  }, [purchase.id]);

  const handleClick = () => {
    if (!allowed) {
      return;
    }
    if (inCart) {
      removeCartLine(purchase.id);
      return;
    }
    addPurchaseToCart(purchase, 1);
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
      {inCart ? "Удалить из корзины" : "В корзину"}
    </button>
  );
}
