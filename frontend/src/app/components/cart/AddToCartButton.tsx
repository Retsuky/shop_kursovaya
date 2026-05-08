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
  alreadyJoined?: boolean;
};

export default function AddToCartButton({ purchase, alreadyJoined }: Props) {
  const [inCart, setInCart] = useState(false);
  const allowed = canReserveInCart(purchase);
  const joined = alreadyJoined ?? (purchase.my_quantity != null && purchase.my_quantity > 0);

  useEffect(() => {
    const sync = () => {
      const exists = getCart().some((line) => line.purchaseId === purchase.id);
      setInCart(exists);
    };
    sync();
    return subscribeToCartChanges(sync);
  }, [purchase.id]);

  const handleClick = () => {
    if (!allowed && !inCart) {
      return;
    }
    if (inCart) {
      removeCartLine(purchase.id);
      return;
    }
    if (!joined) {
      return;
    }
    addPurchaseToCart(purchase, 1);
  };

  if (!allowed && !inCart) {
    return (
      <button type="button" className={styles.btn} disabled>
        Недоступно для корзины
      </button>
    );
  }

  if (!joined && !inCart) {
    return (
      <button type="button" className={styles.btn} disabled>
        Сначала вступите в группу
      </button>
    );
  }

  return (
    <button type="button" className={styles.btn} onClick={handleClick}>
      {inCart ? "Удалить из корзины" : "В корзину"}
    </button>
  );
}
