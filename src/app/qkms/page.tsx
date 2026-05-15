import type { Metadata } from "next";

import { QkmsHomePage } from "~/components/qkms/QkmsUI";

export const metadata: Metadata = {
  title: "QKMS Registration App",
  description: "Barebones MPC sidecar onboarding for QKMS participants.",
};

export default function QkmsPage() {
  return <QkmsHomePage />;
}
