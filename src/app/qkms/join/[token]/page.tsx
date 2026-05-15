import { QkmsJoinPage } from "~/components/qkms/QkmsUI";

export default async function QkmsJoinRoute({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <QkmsJoinPage token={token} />;
}
