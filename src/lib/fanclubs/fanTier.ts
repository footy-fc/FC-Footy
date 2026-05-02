export type FanTier = {
  label: string;
  tone: "pending" | "starter" | "active";
};

export function resolveFanTier(canWrite: boolean, followCount: number): FanTier {
  if (!canWrite) {
    return {
      label: "Approve Footy App",
      tone: "pending",
    };
  }

  if (followCount <= 0) {
    return {
      label: "Academy",
      tone: "starter",
    };
  }

  if (followCount === 1) {
    return {
      label: "Supporter",
      tone: "starter",
    };
  }

  return {
    label: "True Fan",
    tone: "active",
  };
}
