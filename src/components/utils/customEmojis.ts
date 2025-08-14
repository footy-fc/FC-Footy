export interface EmojiPack {
  name: string;
  label: string;
  logo: string;
  emojis: {
    code: string; // e.g. "footy::goal"
    url: string;
  }[];
  teamId?: string; // optional full ID like "eng.1-ars"
}

export const emojiPacks: EmojiPack[] = [
  {
    name: "footy",
    label: "Footy",
    logo: "/defifa_spinner.gif",
    emojis: [
      { code: "footy::goal", url: "/assets/banny_goal.png" },
      { code: "footy::wow", url: "/assets/banny_wow.png" },
      { code: "footy::popcorn", url: "/assets/banny_popcorn.png" },
      { code: "footy::lfg", url: "/assets/banny_lfg.png" },
      { code: "footy::redcard", url: "/assets/banny_redcard.png" },
      { code: "footy::scores", url: "/assets/banny_scores.gif" },
    ],
  },
];

// Optional helper if you still need flat lookup by code
export const customEmojis = Object.fromEntries(
  emojiPacks.flatMap(pack => pack.emojis.map(e => [e.code, e.url]))
);