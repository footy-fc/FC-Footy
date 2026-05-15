import { notFound } from "next/navigation";

import { QkmsRegistrationPage } from "~/components/qkms/QkmsUI";
import { slotToRole } from "~/lib/qkms-roles";
import type { ExternalRole } from "~/lib/qkms-types";

export default async function RegisterRolePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  const normalizedRole = slotToRole(role);

  if (!normalizedRole) {
    notFound();
  }

  return <QkmsRegistrationPage role={normalizedRole as ExternalRole} />;
}
