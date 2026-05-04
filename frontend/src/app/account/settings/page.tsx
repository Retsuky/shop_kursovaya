import type { Metadata } from "next";
import AccountSettingsView from "./AccountSettingsView";

export const metadata: Metadata = {
  title: "Настройки | CoBuy",
};

export default function AccountSettingsPage() {
  return <AccountSettingsView />;
}
