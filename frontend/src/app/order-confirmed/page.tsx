import type { Metadata } from "next";
import OrderConfirmedView from "./OrderConfirmedView";

export const metadata: Metadata = {
  title: "Заказ подтверждён | CoBuy",
};

export default function OrderConfirmedPage() {
  return <OrderConfirmedView />;
}
