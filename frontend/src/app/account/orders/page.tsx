import type { Metadata } from "next";
import AccountOrdersView from "./AccountOrdersView";

export const metadata: Metadata = {
  title: "Мои заказы | CoBuy",
};

export default function AccountOrdersPage() {
  return <AccountOrdersView />;
}
