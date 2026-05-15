import type { ExternalRole } from "~/lib/qkms-types";

export function buildRegistrationMessage(
  role: ExternalRole,
  inviteToken: string,
) {
  return [
    "QKMS sidecar registration",
    `Role: ${role}`,
    `Invite token: ${inviteToken}`,
    "Action: register wallet for MPC sidecar participation",
  ].join("\n");
}
