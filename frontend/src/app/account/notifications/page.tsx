import type { Metadata } from "next";
import AccountNotificationsView from "./AccountNotificationsView";

export const metadata: Metadata = {
  title: "Уведомления | CoBuy",
};

export default function AccountNotificationsPage() {
  return <AccountNotificationsView />;
}
