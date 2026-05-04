'use client';

import { sdk } from "@farcaster/miniapp-sdk";

export type FootyShareContextUser = {
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
};

export type FootyShareContext = {
  entry: "cast_share" | "direct" | "unknown";
  sourceCastHash?: string;
  sourceCastText?: string;
  sourceAuthor: FootyShareContextUser;
  mentions: FootyShareContextUser[];
  clientAdded: boolean;
  isMiniApp: boolean;
};

type MiniAppContext = {
  client?: {
    added?: boolean;
  };
  location?: {
    type?: string;
    cast?: {
      hash?: string;
      text?: string;
      author?: FootyShareContextUser;
      mentions?: FootyShareContextUser[];
    };
  };
  user?: {
    fid?: number;
  };
};

const EMPTY_SHARE_CONTEXT: FootyShareContext = {
  entry: "unknown",
  sourceAuthor: {},
  mentions: [],
  clientAdded: false,
  isMiniApp: false,
};

export async function getFootyShareContext(): Promise<FootyShareContext> {
  try {
    await sdk.actions.ready();
    const context = ((await sdk.context) ?? null) as MiniAppContext | null;

    if (!context) {
      return EMPTY_SHARE_CONTEXT;
    }

    const cast = context.location?.cast;
    const isCastShare = context.location?.type === "cast_share";

    return {
      entry: isCastShare ? "cast_share" : context.user?.fid ? "direct" : "unknown",
      sourceCastHash: cast?.hash,
      sourceCastText: cast?.text,
      sourceAuthor: cast?.author ?? {},
      mentions: Array.isArray(cast?.mentions) ? cast.mentions : [],
      clientAdded: Boolean(context.client?.added),
      isMiniApp: Boolean(context.user?.fid || context.client),
    };
  } catch {
    return EMPTY_SHARE_CONTEXT;
  }
}
