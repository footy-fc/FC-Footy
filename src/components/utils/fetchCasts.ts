import { getTeamPreferences } from "~/lib/kv";
const DEFAULT_CHANNEL_HASH = process.env.NEXT_PUBLIC_DEFAULT_CHANNEL_HASH || "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0";
import axios from "axios";

export interface CastType {
  timestamp: number;
  hash: string;
  text: string;
  author: {
    fid: string;
    username: string;
    pfp_url: string;
  };
  direct_replies?: CastType[];
  teamBadgeUrl?: string | null;
  // Add any additional fields as needed
}

export const fetchCastByHash = async (roomHash: string = DEFAULT_CHANNEL_HASH): Promise<CastType[]> => {
  try {
    const [parentCastRes, repliesRes] = await Promise.all([
      axios.get(`https://hub.merv.fun/v1/cast`, {
        params: {
          fid: 4163,
          hash: roomHash,
        },
      }),
      axios.get(`https://hub.merv.fun/v1/castsByParent`, {
        params: {
          fid: 4163,
          hash: roomHash,
          pageSize: 10,
          reverse: true,
        },
      }),
    ]);

    const root = parentCastRes.data.cast;
    const replies = repliesRes.data?.messages ?? [];
    const casts = [root, ...replies];

    const enriched = await Promise.all(
      casts.map(async (cast: CastType): Promise<CastType> => {
        const teamIds = await getTeamPreferences(cast.author.fid.toString());
        const teamBadgeUrl =
          teamIds?.[0] && teamIds[0].includes("-")
            ? `https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/${teamIds[0].replace("-", "/")}.png`
            : null;

        return {
          ...cast,
          teamBadgeUrl,
        };
      })
    );

    return enriched;
  } catch (err) {
    console.error("Failed to fetch conversation by hash:", err);
    return [];
  }
};