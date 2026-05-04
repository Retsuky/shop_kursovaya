import type { Metadata } from "next";
import AccountInviteView from "./AccountInviteView";

export const metadata: Metadata = {
  title: "Пригласить друга | CoBuy",
};

export default function AccountInvitePage() {
  return <AccountInviteView />;
}
