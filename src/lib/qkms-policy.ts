import type { ActionType, Role } from "~/lib/qkms-types";

export const REQUIRED_APPROVALS: Record<ActionType, Role[]> = {
  security: ["C", "M"],
  admin: ["C", "P"],
};

export function getRequiredParticipants(actionType: ActionType): Role[] {
  return REQUIRED_APPROVALS[actionType];
}

export function isAllowedParticipantSet(participants: Role[]): boolean {
  const sorted = [...new Set(participants)].sort().join(",");
  return Object.values(REQUIRED_APPROVALS)
    .map((pair) => [...pair].sort().join(","))
    .includes(sorted);
}

export function validatePolicyParticipants(participants: Role[]): string | null {
  if (!participants.includes("C")) {
    return "C must participate in every signing flow.";
  }

  if (!isAllowedParticipantSet(participants)) {
    return "Participant set violates the QKMS policy overlay.";
  }

  return null;
}
