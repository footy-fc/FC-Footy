import { BASE_URL } from "~/lib/config";

type InviteShareUrlInput = {
  profileFid: number;
  castHash?: string;
  inviteUsername?: string;
};

export function buildInviteShareUrl({ profileFid, castHash, inviteUsername }: InviteShareUrlInput) {
  const origin =
    BASE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "https://fc-footy.vercel.app");
  const url = new URL("/", origin);
  url.searchParams.set("tab", "fanClubs");
  url.searchParams.set("profileFid", String(profileFid));
  url.searchParams.set("shareContext", "invite");

  if (castHash) {
    url.searchParams.set("castHash", castHash);
  }

  if (inviteUsername) {
    url.searchParams.set("inviteUsername", inviteUsername);
  }

  return url.toString();
}
