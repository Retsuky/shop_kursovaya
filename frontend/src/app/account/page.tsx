import type { Metadata } from "next";
import AccountProfileContent from "./AccountProfileContent";

export const metadata: Metadata = {
  title: "Личный кабинет | CoBuy",
};

export default function AccountPage() {
  return <AccountProfileContent />;
}
