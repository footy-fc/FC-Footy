import { QkmsSessionPage } from "~/components/qkms/QkmsUI";

export default async function QkmsSessionRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QkmsSessionPage sessionId={id} />;
}
