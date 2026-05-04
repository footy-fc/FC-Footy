export type SocialFeedAuthor = {
  fid: number;
  username?: string;
  display_name?: string;
  pfp_url?: string;
};

export type SocialFeedEmbed = {
  url?: string;
};

export type SocialFeedCast = {
  hash: string;
  text?: string;
  timestamp?: string;
  author?: SocialFeedAuthor;
  embeds?: SocialFeedEmbed[];
  parent_hash?: string | null;
  parent_url?: string | null;
  replies?: {
    count?: number;
  };
  reactions?: {
    likes_count?: number;
    recasts_count?: number;
  };
};
