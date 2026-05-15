import type { Metadata } from "next";
import AccountAddDealView from "./AccountAddDealView";

export const metadata: Metadata = {
  title: "Добавить сделку | CoBuy",
};

export default function AccountAddDealPage() {
  return <AccountAddDealView />;
}
