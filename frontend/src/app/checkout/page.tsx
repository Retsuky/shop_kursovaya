import type { Metadata } from "next";
import CheckoutView from "./CheckoutView";

export const metadata: Metadata = {
  title: "Оформление заказа | CoBuy",
};

export default function CheckoutPage() {
  return <CheckoutView />;
}
