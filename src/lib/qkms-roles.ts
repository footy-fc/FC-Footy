import type { ExternalRole } from "~/lib/qkms-types";

export function roleToSlot(role: ExternalRole): "1" | "2" {
  return role === "M" ? "1" : "2";
}

export function slotToRole(value: string): ExternalRole | null {
  if (value === "1" || value.toUpperCase() === "M") {
    return "M";
  }

  if (value === "2" || value.toUpperCase() === "P") {
    return "P";
  }

  return null;
}
