import React, { useEffect, useState, useRef } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
// Privy not used in miniapp casting flow
// Neynar signer/auth removed for read-only chat mode; keep emoji UI
import ForYouWhosPlaying from "./ForYouWhosPlaying";
import { useScoresTokenGate } from "~/hooks/useScoresTokenGate";
//import { useRouter } from "next/navigation";
import ScoresInfo from "./ScoresInfo";
import BuyScoresModal from "./BuyScoresModal";

import { emojiPacks as baseEmojiPacks, EmojiPack } from "~/components/utils/customEmojis";
import { getTeamPreferences } from "~/lib/kv";
//import { teamsByLeague, getTeamFullName } from "./utils/fetchTeamLogos";
import { useFetchCastsParentUrl } from "./utils/useFetchCastsParentUrls";
import { fetchFanUserData } from "./utils/fetchFCProfile";
//import { CommentaryPipeline } from '~/services/CommentaryPipeline';
//import { useCommentator } from '~/hooks/useCommentator';
import { MatchEvent } from '~/types/commentatorTypes';

// Interfaces for AI commentary context
interface MatchData {
  events: MatchEvent[];
  score: string;
  status: string;
}

interface FPLPick {
  player?: {
    web_name?: string;
    name?: string;
    team?: {
      short_name?: string;
    };
  };
  position?: number;
  is_captain?: boolean;
  is_vice_captain?: boolean;
}

interface FPLUserData {
  username: string;
  picks: FPLPick[];
  captain?: string;
  viceCaptain?: string;
}

interface FPLContext {
  managers: FPLUserData[];
  relevantPicks: Array<FPLPick & { username: string }>;
  managerSummary: {
    totalManagers: number;
    totalRelevantPicks: number;
    captains: string[];
  };
}
 


interface CastType {
  timestamp: number;
  author: {
    pfp_url: string;
    username: string;
    fid: string; // or number, if that's more appropriate
  };
  teamBadgeUrl?: string | null;
  text: string;
  // add any additional fields as needed, like hash, direct_replies, etc.
}

type EmojiItem =
  | { type: 'message'; content: string }
  | { packLabel: string; code: string; url: string };

// Helper function to parse text and replace emoji codes with images
const renderMessageWithEmojis = (message: string, packs: EmojiPack[] = baseEmojiPacks) => {
  const emojiRegex = /([a-zA-Z0-9]+::[a-zA-Z0-9_]+)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  while ((match = emojiRegex.exec(message)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(message.substring(lastIndex, match.index));
    }
    const emojiCode = match[1];
    const foundEmoji = packs.flatMap(pack => pack.emojis).find(emoji => emoji.code === emojiCode);
    if (foundEmoji) {
      nodes.push(
        <img
          key={match.index}
          src={foundEmoji.url}
          alt={emojiCode}
          className="inline w-4 h-4"
        />
      );
    } else {
      nodes.push(emojiCode);
    }
    lastIndex = emojiRegex.lastIndex;
  }
  if (lastIndex < message.length) {
    nodes.push(message.substring(lastIndex));
  }
  return nodes;
};

function shortenLongWords(text: string, maxLength = 30): string {
    return text
      .split(" ")
      .map((word) =>
        word.length > maxLength
          ? `${word.slice(0, 3)}...${word.slice(-3)}`
          : word
      )
      .join(" ");
  }

// Deprecated: logo should come from admin DB (team.logoUrl)

const ChatInput = ({
  message,
  setMessage,
  onSubmit,
  showEmojiPanel,
  setShowEmojiPanel,
  selectedPack,
  setSelectedPack,
  searchTerm,
  setSearchTerm,
  showPackDropdown,
  setShowPackDropdown,
  addEmoji,
  isPosting,
  emojiPacks,
}: {
  message: string;
  setMessage: (msg: string) => void;
  onSubmit: () => void;
  showEmojiPanel: boolean;
  setShowEmojiPanel: React.Dispatch<React.SetStateAction<boolean>>;
  selectedPack: string;
  setSelectedPack: (pack: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showPackDropdown: boolean;
  setShowPackDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  addEmoji: (emojiCode: string) => void;
  isPosting: boolean;
  emojiPacks: EmojiPack[];
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const teamPacks = React.useMemo(() => emojiPacks.filter(p => p.name !== 'footy'), [emojiPacks]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [message]);

  return (
    <div className="relative">
      <button
        onClick={() => setShowEmojiPanel((prev) => !prev)}
        className="group absolute bottom-2 left-4 flex items-center gap-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm transition-all duration-200 ease-out hover:scale-105 hover:shadow-md"
        title="Kick off with a footy emoji"
      >
        <span role="img" aria-label="footy emoji" className="transition-transform duration-200 ease-out group-hover:rotate-6">⚽</span>
        <span className="hidden sm:inline">Kick off</span>
      </button>
      {showEmojiPanel && (
        <div className="absolute bottom-full left-0 p-2 bg-gray-700 rounded space-y-2 z-20 w-full max-h-[240px] overflow-y-auto shadow-lg">
          <button
            onClick={() => setShowEmojiPanel(false)}
            className="absolute top-1 right-1 text-white text-sm px-2 py-0.5 rounded hover:bg-gray-600 transition"
            title="Close emoji picker"
            >
            ✕
        </button>
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
            {teamPacks.length > 0 && (
            <div className="relative inline-block text-left">
              <button
                className="flex items-center gap-2 px-2 py-1 text-sm text-white bg-gray-800 rounded"
                onClick={() => setShowPackDropdown((prev) => !prev)}
              >
                <img
                src={
                      (teamPacks.find((p) => p.name === selectedPack) || teamPacks[0]).logo
                }
                  alt="Team"
                className="w-6 h-6"
                />
                  {(teamPacks.find((p) => p.name === selectedPack) || teamPacks[0]).label}
              </button>
              {showPackDropdown && (
                <ul className="absolute z-20 top-full mt-2 w-48 bg-gray-800 border border-lightPurple rounded shadow-lg max-h-60 overflow-y-auto">
                    {teamPacks.map((pack) => (
                    <li
                      key={pack.name}
                      onClick={() => {
                        setSelectedPack(pack.name);
                        setShowPackDropdown(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-gray-700 cursor-pointer"
                    >
                      <img src={pack.logo} alt="" className="w-4 h-4" />
                      {pack.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            )}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search emojis..."
              className="text-sm px-2 py-1 rounded bg-gray-800 border border-limeGreenOpacity text-white w-full"
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {(() => {
              const selectedTeamPacks = emojiPacks.filter(pack => pack.name !== 'footy' && pack.name === selectedPack);
              const basePacks = [emojiPacks.find(p => p.name === 'footy')].filter(Boolean) as EmojiPack[];
              const emojis = [...basePacks, ...selectedTeamPacks].flatMap((pack) =>
                pack.emojis.map((emoji) => ({
                  ...emoji,
                  packLabel: pack.label,
                }))
              );

              const filteredEmojis = searchTerm
                ? emojis.filter((emoji) =>
                    emoji.code.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                : emojis;

              if (filteredEmojis.length === 0) {
                return [{
                  type: 'message',
                  content: "No emojis found. Try searching again!"
                }] as EmojiItem[];
              }

              return filteredEmojis;
            })().map((item, idx) => {
                if ('type' in item && item.type === 'message') {
                  return (
                    <span key={idx} className="text-white text-sm italic">{item.content}</span>
                  );
                } else {
                  return (
                    <img
                      key={`${(item as { packLabel: string; code: string; url: string }).packLabel}::${(item as { code: string }).code}`}
                      src={(item as { url: string }).url}
                      alt={(item as { code: string }).code}
                      title={(item as { packLabel: string }).packLabel}
                      className="w-6 h-6 cursor-pointer"
                      onClick={() => addEmoji((item as { code: string }).code)}
                    />
                  );
                }
              })}
          </div>
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={message}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        onChange={(e) => {
          const newValue = e.target.value;
          if (newValue.length <= 390) {
            setMessage(newValue);
          }
        }}
        maxLength={390}
        placeholder="Chat Disabled. Soon ish. Maybe. Type your message anyway..."
        className="w-full px-4 py-2 rounded-md border border-limeGreenOpacity bg-gray-800 text-white outline-none resize-none overflow-hidden pb-12"
      />
      <button
        onClick={onSubmit}
        disabled={isPosting}
        className={`absolute bottom-2 right-4 h-10 px-4 rounded-md font-bold flex items-center justify-center ${isPosting ? 'bg-gray-400 cursor-not-allowed' : 'bg-deepPink text-black'}`}
        title="Send message"
      >
        <img
          src={
            (emojiPacks.find((p) => p.name === selectedPack && p.name !== 'footy') || emojiPacks.find(p => p.name !== 'footy') || emojiPacks[0]).logo
          }
          alt="Send"
          className="w-6 h-6"
        />
      </button>
    </div>
  );
};
//const DEFAULT_CHANNEL_HASH: `0x${string}` = (process.env.NEXT_PUBLIC_DEFAULT_CHANNEL_HASH || "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0") as `0x${string}`;

interface ContentLiveChatProps {
  teamId?: string;
  parentCastHash?: string; // use parent cast hash instead of URL
  parentUrl?: string; // alternatively, use parent URL
  hubUrl?: string;
  eventId?: string; // to extract home/away teams for emoji packs
}

const ContentLiveChat = ({ teamId, parentCastHash, parentUrl, hubUrl, eventId }: ContentLiveChatProps) => {
  console.log('teamId:', teamId);
  //const leagueKey = teamId ? teamId.split("-")[0] : "";
  //const abbr = teamId ? teamId.split("-")[1] : "";
  //const teamName = t
  // eamId ? getTeamFullName(abbr, leagueKey) : undefined;
  //const roomHash = teamId
  //  ? (teamsByLeague[leagueKey]?.find((t) => t.abbr === abbr)?.roomHash ?? DEFAULT_CHANNEL_HASH)
  //  : DEFAULT_CHANNEL_HASH;
  // const [casts, setCasts] = useState<CastType[]>([]);  
  const [message, setMessage] = useState("");
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [availableEmojiPacks, setAvailableEmojiPacks] = useState<EmojiPack[]>(baseEmojiPacks);
  const [selectedPack, setSelectedPack] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState("");
  const [showPackDropdown, setShowPackDropdown] = useState(false);
  const [backgroundLogo, setBackgroundLogo] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [isGeneratingAICommentary, setIsGeneratingAICommentary] = useState(false);
  const [aiCommentary, setAiCommentary] = useState<string>("");
  const [selectedCommentator, setSelectedCommentator] = useState<string>("peter-drury");
  const [currentCommentator, setCurrentCommentator] = useState<{
    id: string;
    name: string;
    displayName: string;
    style: string;
  } | null>(null);
  
  // Token gating for AI commentary
  const { hasScores, isLoading: tokenLoading, isConnected, balance } = useScoresTokenGate();
  //const router = useRouter();
  const [showScoresInfo, setShowScoresInfo] = useState(false);
  const [showBuyScoresModal, setShowBuyScoresModal] = useState(false);



  const handlePurchaseSuccess = () => {
    // Force a page refresh to ensure token balance updates
    // This ensures the AI affordances appear immediately
    window.location.reload();
  };

  // Get the minimum required scores from environment variable
  const MIN_REQUIRED_SCORES = parseInt(process.env.NEXT_PUBLIC_MIN_REQUIRED_SCORES || '12000000', 10);
  //console.log("ContentLiveChat received roomHash:", roomHash);
  // const [setChannel] = useState(`match:${roomHash}`);
  //console.log("Initial channel state:", `match:${roomHash}`);
  const parentFid = 4163; // per instruction
  const effectiveHubUrl = hubUrl || "https://hub.merv.fun";
  const { casts: footyChat } = useFetchCastsParentUrl(
    parentCastHash ? null : (parentUrl ?? null),
    effectiveHubUrl,
    10,
    parentCastHash ? { fid: parentFid, hash: parentCastHash as `0x${string}` as unknown as string } : undefined
  );
  const [enrichedChat, setEnrichedChat] = useState<CastType[]>([]);

  // const neynarUser = null; // no auth in read-only mode
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [frameFid, setFrameFid] = useState<number | null>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  //const [footerHeight, setFooterHeight] = useState<number>(0);
  //const [headerHeight, setHeaderHeight] = useState<number>(0);
  const [viewportHeight, setViewportHeight] = useState<number>(0);
  const teamLogoCacheRef = useRef<{ [abbr: string]: string | null }>({});
  const fidBadgeCacheRef = useRef<{ [key: string]: string | null }>({});
  const fidPrefsCacheRef = useRef<{ [fid: string]: string[] | null }>({});
  
  // Read-only mode: no signer
  //const [neynarSignerUuid] = useState<string | null>(null);
  // SIWN-only flow: we only care about signer_uuid from SIWN cookie
  // In-view navigation using ForYouWhosPlaying (no SDK back logic)
  
  // SIWN start helper
  // SIWN handled by NeynarAuthButton; no manual redirect

  // No status polling in SIWN-only flow

  // Load any stored Neynar signer UUID (legacy cookie support)
  useEffect(() => {
    (async () => {
      try {
        await sdk.actions.ready();
        const ctx = await sdk.context;
        if (ctx?.user?.fid) setFrameFid(ctx.user.fid as number);
        // No-op: read-only
      } catch {}
    })();
  }, []);

  // Removed legacy beginNeynarAuthorization flow

  // Background polling while awaiting approval
  // No background polling in SIWN-only flow

  // Manual signer entry removed from UI; helper retained is no longer used

  // Read-only: signer actions disabled

  useEffect(() => {
    const enrichWithUserData = async () => {
      const parts = (eventId || '').split('_');
      const homeAbbr = parts.length >= 4 ? parts[2]?.toLowerCase() : '';
      const awayAbbr = parts.length >= 4 ? parts[3]?.toLowerCase() : '';
      const playingSet = new Set([homeAbbr, awayAbbr].filter(Boolean));

      const getLogoForAbbr = async (abbr: string): Promise<string | null> => {
        const key = abbr.toLowerCase();
        if (teamLogoCacheRef.current.hasOwnProperty(key)) {
          return teamLogoCacheRef.current[key];
        }
        try {
          const resp = await fetch(`/api/teams/abbreviation/${key}`);
          if (!resp.ok) {
            teamLogoCacheRef.current[key] = null;
            return null;
          }
          const data = await resp.json();
          const url = data?.team?.logoUrl || null;
          teamLogoCacheRef.current[key] = url;
          return url;
        } catch {
          teamLogoCacheRef.current[key] = null;
          return null;
        }
      };

      const enriched = await Promise.all(
        footyChat.map(async (cast): Promise<CastType> => {
          const fan = await fetchFanUserData(cast.data?.fid || 0);
          const fid = cast.data?.fid?.toString() ?? "0";
          const prefs = (async () => {
            if (fidPrefsCacheRef.current.hasOwnProperty(fid)) return fidPrefsCacheRef.current[fid];
            const p = await getTeamPreferences(fid);
            fidPrefsCacheRef.current[fid] = p || [];
            return p;
          })();

          let teamBadgeUrl: string | null = null;
          const cacheKey = `${eventId || 'none'}:${fid}`;
          if (fidBadgeCacheRef.current.hasOwnProperty(cacheKey)) {
            teamBadgeUrl = fidBadgeCacheRef.current[cacheKey];
          } else {
            const prefList = await prefs;
            if (eventId && Array.isArray(prefList) && prefList.length > 0 && playingSet.size > 0) {
              for (const teamId of prefList) {
                const ab = teamId?.split('-')?.[1]?.toLowerCase();
                if (ab && playingSet.has(ab)) {
                  teamBadgeUrl = await getLogoForAbbr(ab);
                  break;
                }
              }
            }
            fidBadgeCacheRef.current[cacheKey] = teamBadgeUrl;
          }

          const username =
            Array.isArray(fan?.USER_DATA_TYPE_USERNAME)
              ? fan.USER_DATA_TYPE_USERNAME[0]
              : fan?.USER_DATA_TYPE_USERNAME ?? fid;

          const pfp_url =
            Array.isArray(fan?.USER_DATA_TYPE_PFP)
              ? fan.USER_DATA_TYPE_PFP[0]
              : fan?.USER_DATA_TYPE_PFP ?? "/default-pfp.png";

          return {
            author: {
              fid: fid,
              username,
              pfp_url,
            },
            text: cast.data?.castAddBody?.text ?? "",
            timestamp: cast.data?.timestamp ?? 0,
            teamBadgeUrl,
          };
        })
      );
      setEnrichedChat(enriched);
    };
    if (footyChat.length > 0) enrichWithUserData();
  }, [footyChat, eventId]);
  
  // useEffect(() => {
  //  setChannel(`match:${roomHash}`);
  // }, [roomHash]);
  // const [setParentCastUrl] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

/*   useEffect(() => {
    if (channel.startsWith("hash:")) {
      const hash = channel.split("hash:")[1];
      setParentCastUrl(`https://warpcast.com/~/cast/${hash}`);
    } else {
      setParentCastUrl(null);
    }
  }, [channel]); */

 
  useEffect(() => {
    const fetchEmojiPacksForMatchOrUser = async () => {
      // If we have eventId, prefer loading both teams from it
      const packs: EmojiPack[] = [baseEmojiPacks[0]]; // include base footy (always available)
      let selected = '';

      const fetchTeamPackByAbbr = async (abbr: string): Promise<EmojiPack> => {
        try {
          const safe = abbr.toLowerCase().split(':')[0];
          const resp = await fetch(`/api/teams/abbreviation/${safe}`);
          if (resp.ok) {
            const data = await resp.json();
            const team = data?.team;
            const meta = team?.metadata || {};
            const raw = meta.emojis as string | undefined;
            let emojis: Array<{ code: string; url: string }> = [];
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                  emojis = parsed.filter(
                    (e: unknown): e is { code: string; url: string } =>
                      !!e &&
                      typeof e === 'object' &&
                      typeof (e as Record<string, unknown>).code === 'string' &&
                      typeof (e as Record<string, unknown>).url === 'string'
                  );
                }
              } catch {}
            }
            return {
              name: safe,
              label: team?.shortName || team?.name || abbr.toUpperCase(),
              logo: team?.logoUrl || '',
              teamId: team?.id,
              emojis
            } as EmojiPack;
          }
          // Fallback pack (no emojis but visible in picker)
          return {
            name: safe,
            label: abbr.toUpperCase(),
            logo: '',
            emojis: []
          } as EmojiPack;
        } catch {
          // Network error fallback
          const safe = abbr.toLowerCase().split(':')[0];
          return {
            name: safe,
            label: abbr.toUpperCase(),
            logo: '',
            emojis: []
          } as EmojiPack;
        }
      };

      if (eventId) {
        const parts = eventId.split('_');
        if (parts.length >= 4) {
          const homeAbbr = parts[2]?.toLowerCase();
          const awayAbbr = parts[3]?.toLowerCase();
          const [homePack, awayPack] = await Promise.all([
            homeAbbr ? fetchTeamPackByAbbr(homeAbbr) : Promise.resolve(null as unknown as EmojiPack),
            awayAbbr ? fetchTeamPackByAbbr(awayAbbr) : Promise.resolve(null as unknown as EmojiPack)
          ]);
          if (homeAbbr) packs.push(homePack);
          if (awayAbbr) packs.push(awayPack);
          if (homeAbbr) selected = homePack.name; else if (awayAbbr) selected = awayPack.name; else selected = '';
        }
      } else if (frameFid) {
        // Fallback to user's first preferred team
        const prefs = await getTeamPreferences(frameFid.toString());
        const tId = prefs?.[0];
          if (tId) {
            const abbr = tId.split('-')[1];
            const teamPack = await fetchTeamPackByAbbr(abbr);
            if (teamPack) {
              packs.push(teamPack);
              selected = teamPack.name;
              try {
                const resp = await fetch(`/api/teams/abbreviation/${abbr}`);
                if (resp.ok) {
                  const data = await resp.json();
                  setBackgroundLogo(data?.team?.logoUrl || null);
                } else {
                  setBackgroundLogo(null);
                }
              } catch {
                setBackgroundLogo(null);
              }
            }
          }
      }

      setAvailableEmojiPacks(packs);
      setSelectedPack(selected);
    };

    fetchEmojiPacksForMatchOrUser();
  }, [eventId, frameFid]);

  // Measure header/footer to compute cast viewport height (with live resize)
  useEffect(() => {
    const measureAll = () => {
      const fh = footerRef.current?.getBoundingClientRect().height || 0;
      const hh = headerRef.current?.getBoundingClientRect().height || 0;
      if (typeof window !== 'undefined') {
        const buffer = 16; // small visual buffer so content doesn't touch footer
        setViewportHeight(Math.max(0, window.innerHeight - fh - hh - buffer));
      }
    };
    measureAll();
    const roFooter = footerRef.current ? new ResizeObserver(measureAll) : null;
    const roHeader = headerRef.current ? new ResizeObserver(measureAll) : null;
    if (footerRef.current && roFooter) roFooter.observe(footerRef.current);
    if (headerRef.current && roHeader) roHeader.observe(headerRef.current);
    window.addEventListener('resize', measureAll);
    return () => {
      window.removeEventListener('resize', measureAll);
      if (footerRef.current && roFooter) roFooter.disconnect();
      if (headerRef.current && roHeader) roHeader.disconnect();
    };
  }, []);

  useEffect(() => {
    // Wait briefly to ensure the DOM is updated with new casts
    const timer = setTimeout(() => {
      if (chatContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
        if (isAtBottom) {
          chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [footyChat]);

  const postMessage = async () => {
    console.log('[Chat] postMessage start');
    if (isPosting || !message.trim()) return;
    setIsPosting(true);

    try {
      await sdk.actions.ready();
      
      // Prepare the cast text with default footy::popcorn emoji
      const castText = message.trim() + ' footy::popcorn';
      
      // Prepare the parent configuration
      let parentConfig = undefined;
      if (parentCastHash) {
        parentConfig = { type: 'cast' as const, hash: parentCastHash };
      }
      
      // Compose the cast using the SDK
      const composeOptions = {
        text: castText,
        parent: parentConfig,
        channelKey: "football",
      };
      
      console.log('[Chat] Composing cast with options:', composeOptions);
      const cast = await sdk.actions.composeCast(composeOptions);
      
      console.log('[Chat] Cast composed successfully:', cast);
      
      // Clear the message and close emoji panel
      setMessage("");
      setShowEmojiPanel(false);
      
    } catch (error) {
      console.error("[Chat] Error sending cast:", error);
      // You might want to show an error message to the user here
    } finally {
      console.log('[Chat] postMessage done');
      setIsPosting(false);
    }
  };

  // Append an emoji code to the current message
  const addEmoji = (emojiCode: string) => {
    setMessage((prev) => {
      const needsSpace = prev.length > 0 && !/\s$/.test(prev);
      const spacer = needsSpace ? " " : "";
      const newMessage = prev + spacer + emojiCode + " ";
      return newMessage.length <= 390 ? newMessage : prev;
    });
  };

  // Generate AI commentary with chat history
  const generateAICommentary = async () => {
    if (isGeneratingAICommentary || enrichedChat.length === 0) return;
    
    setIsGeneratingAICommentary(true);
    setAiCommentary("");
    
    try {
      // Extract recent chat messages (last 10 messages)
      const recentMessages = enrichedChat.slice(-10).map(cast => ({
        username: cast.author.username,
        text: cast.text,
        timestamp: cast.timestamp
      }));

      // Create a summary of the chat activity
      const chatSummary = recentMessages.map(msg => 
        `@${msg.username}: "${msg.text}"`
      ).join('\n');

      // Create match context from eventId
      const parts = (eventId || '').split('_');
      const homeTeam = parts.length >= 4 ? parts[2] : 'Home Team';
      const awayTeam = parts.length >= 4 ? parts[3] : 'Away Team';
      const league = parts.length >= 2 ? parts[0] + ' ' + parts[1] : 'League';

      // Gather match events from the current match data
      let matchEvents: MatchEvent[] = [];
      let currentScore = '';
      let matchStatus = '';
      
      try {
        // Get real match data from the current page context
        const matchDataResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/match-data?eventId=${eventId}`);
        if (matchDataResponse.ok) {
          const matchData: MatchData = await matchDataResponse.json();
          matchEvents = matchData.events || [];
          currentScore = matchData.score || '';
          matchStatus = matchData.status || '';
        }
      } catch (error) {
        console.log('[AI Commentary] No match data available, using basic context:', error);
        currentScore = '0-0';
        matchStatus = 'Live';
      }

      // Gather FPL context for users in the chat
      let fplContext: FPLContext = {
        managers: [],
        relevantPicks: [],
        managerSummary: {
          totalManagers: 0,
          totalRelevantPicks: 0,
          captains: []
        }
      };
      try {
        // Only try to get FPL data for users who might have numeric FIDs
        // Skip usernames that are clearly not numeric FIDs (like ENS names)
        const usersWithPotentialFids = recentMessages
          .filter(msg => {
            const username = msg.username;
            // Skip if username is clearly not a numeric FID
            if (!username || username === 'anonymous' || username.includes('.') || username.includes('@')) {
              return false;
            }
            // Only include if it looks like it could be a numeric FID
            return /^\d+$/.test(username);
          })
          .slice(0, 3); // Limit to 3 users
        
        console.log('[AI Commentary] Users with potential FIDs:', usersWithPotentialFids.map(u => u.username));
        
        if (usersWithPotentialFids.length > 0) {
          const fplPromises = usersWithPotentialFids.map(async (user) => {
            try {
              console.log(`[AI Commentary] Fetching FPL data for FID: ${user.username}`);
              const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/manager-picks?fid=${user.username}&gameweek=1`);
              
              if (response.ok) {
                const picksData = await response.json();
                console.log(`[AI Commentary] Successfully fetched FPL data for FID ${user.username}:`, picksData.picks?.length || 0, 'picks');
                return {
                  username: user.username,
                  picks: picksData.picks || [],
                  captain: picksData.picks?.find((p: { is_captain: boolean }) => p.is_captain)?.player?.web_name,
                  viceCaptain: picksData.picks?.find((p: { is_vice_captain: boolean }) => p.is_vice_captain)?.player?.web_name
                };
              } else {
                console.log(`[AI Commentary] Failed to fetch FPL data for FID ${user.username}:`, response.status, response.statusText);
                return null;
              }
            } catch (error) {
              console.log(`[AI Commentary] Error fetching FPL data for FID ${user.username}:`, error);
              return null;
            }
          });

          const fplResults = await Promise.all(fplPromises);
          const validFplResults = fplResults.filter(result => result !== null);

          console.log('[AI Commentary] Valid FPL results:', validFplResults.length);

          if (validFplResults.length > 0) {
            const currentMatchTeams = [homeTeam.toLowerCase(), awayTeam.toLowerCase()];
            const relevantPicks = validFplResults.flatMap(user => 
              user.picks.filter((pick: { player?: { team?: { short_name?: string } } }) => {
                const playerTeam = pick.player?.team?.short_name?.toLowerCase() || '';
                return currentMatchTeams.includes(playerTeam);
              }).map((pick: { player?: { web_name?: string; name?: string; team?: { short_name?: string } }; position?: number; is_captain?: boolean; is_vice_captain?: boolean }) => ({
                ...pick,
                username: user.username
              }))
            );



            fplContext = {
              managers: validFplResults.map(user => ({
                username: user.username,
                picks: user.picks,
                captain: user.captain,
                viceCaptain: user.viceCaptain
              })),
              relevantPicks: relevantPicks.slice(0, 5),
              managerSummary: {
                totalManagers: validFplResults.length,
                totalRelevantPicks: relevantPicks.length,
                captains: validFplResults.map(u => u.captain).filter(Boolean) as string[]
              }
            };
            
            console.log('[AI Commentary] Built enhanced FPL context:', fplContext);
          } else {
            console.log('[AI Commentary] No valid FPL data found, skipping FPL context');
          }
        } else {
          console.log('[AI Commentary] No users with valid FIDs found, skipping FPL context');
        }
      } catch (error) {
        console.log('[AI Commentary] Error gathering FPL context:', error);
      }

      // Use the flexible commentary pipeline
      const commentaryRequest = {
        commentatorId: selectedCommentator,
        context: {
          eventId: eventId || 'chat-commentary',
          homeTeam,
          awayTeam,
          competition: league,
          eventType: 'chat_commentary' as const,
          // Optional context inputs
          matchEvents,
          currentScore,
          matchStatus,
          chatHistory: chatSummary,
          userCount: enrichedChat.length,
          activeUsers: [...new Set(recentMessages.map(msg => msg.username))],
          fplContext
        }
      };

      console.log('[AI Commentary] Using flexible pipeline with context:', {
        hasMatchEvents: !!matchEvents.length,
        hasChatHistory: !!chatSummary,
        hasFplContext: !!Object.keys(fplContext).length
      });

      // Log the full request payload for debugging
      console.log('[AI Commentary] Full request payload:', JSON.stringify(commentaryRequest, null, 2));

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/commentator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commentaryRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        console.error('[AI Commentary] API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`API Error: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      
      // Log the full response for debugging
      console.log('[AI Commentary] Full API response:', JSON.stringify(data, null, 2));
      
      setAiCommentary(data.commentary);
      setCurrentCommentator(data.commentator);
      
      console.log('[AI Commentary] Generated:', data.commentary);
      
    } catch (error) {
      console.error('[AI Commentary] Error:', error);
      console.error('[AI Commentary] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setAiCommentary("The drama of the chat unfolds as fans share their passion for the beautiful game!");
    } finally {
      setIsGeneratingAICommentary(false);
    }
  };

  // Compose cast with AI commentary
  const composeAICommentaryCast = async () => {
    if (!aiCommentary || isPosting) return;
    
    setIsPosting(true);
    
    try {
      await sdk.actions.ready();
      
      // Prepare the cast text with AI commentary
      const castText = `🎤 ${aiCommentary} footy::popcorn`;
      
      // Prepare the parent configuration
      let parentConfig = undefined;
      if (parentCastHash) {
        parentConfig = { type: 'cast' as const, hash: parentCastHash };
      }
      
      // Compose the cast using the SDK
      const composeOptions = {
        text: castText,
        parent: parentConfig,
        channelKey: "football",
      };
      
      console.log('[AI Commentary] Composing cast with options:', composeOptions);
      const cast = await sdk.actions.composeCast(composeOptions);
      
      console.log('[AI Commentary] Cast composed successfully:', cast);
      
      // Clear the AI commentary
      setAiCommentary("");
      
    } catch (error) {
      console.error("[AI Commentary] Error sending cast:", error);
    } finally {
      setIsPosting(false);
    }
  };

  // console.log("background logo:", backgroundLogo   );
  return (
    <div className="h-full relative pt-0 pb-0 px-0 rounded-lg flex flex-col bg-darkPurple/80 overflow-visible">      {backgroundLogo && (
        <div
          className="absolute top-4 left-0 right-0 bottom-0 z-0 bg-no-repeat bg-contain bg-center opacity-20 pointer-events-none"
          style={{
              backgroundImage: `url(${backgroundLogo})`,
              backgroundSize: "50%",
            }}
        />
      )}
      
      {/* Pinned header: navigation and match context */}
      <div ref={headerRef} className="sticky top-0 z-20 bg-darkPurple/90 backdrop-blur border-b border-limeGreenOpacity/50">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between gap-3 mb-2 text-md">
            <button
              onClick={async () => {
                console.log('[ContentLiveChat] Back button clicked');
                console.log('[ContentLiveChat] Current window history length:', window.history.length);
                
                try {
                  // Try window.history.back() first
                  window.history.back();
                  
                  // If that doesn't work, try using the Farcaster SDK
                  setTimeout(async () => {
                    console.log('[ContentLiveChat] Trying Farcaster SDK navigation');
                    try {
                      await sdk.actions.ready();
                      // Try to navigate back using SDK if available
                      console.log('[ContentLiveChat] SDK ready, attempting navigation');
                    } catch (error) {
                      console.log('[ContentLiveChat] SDK navigation failed:', error);
                    }
                  }, 100);
                  
                } catch (error) {
                  console.error('[ContentLiveChat] Back navigation error:', error);
                }
              }}
              className="text-white transition-colors"
            >
              &larr; Back
            </button>
            
            {/* AI Commentary Controls - Token Gated */}
            {tokenLoading ? (
              <div className="text-xs text-gray-400">Checking tokens...</div>
            ) : hasScores ? (
              <div className="flex items-center gap-2">
                {/* Commentator Selector */}
                <select
                  value={selectedCommentator}
                  onChange={(e) => setSelectedCommentator(e.target.value)}
                  className="px-2 py-1 rounded text-xs bg-darkPurple border border-limeGreenOpacity/30 text-white"
                  title="Choose commentator style"
                >
                  <option value="peter-drury">🎭 Peter Drury</option>
                  <option value="ray-hudson">🔥 Ray Hudson</option>
                </select>
                
                <button
                  onClick={generateAICommentary}
                  disabled={isGeneratingAICommentary || enrichedChat.length === 0}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    isGeneratingAICommentary || enrichedChat.length === 0
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-deepPink hover:bg-fontRed text-white'
                  }`}
                  title="Generate AI commentary based on chat history"
                >
                  {isGeneratingAICommentary ? '🎤 Generating...' : '🎤 AI Commentary'}
                </button>
                
                {aiCommentary && (
                  <button
                    onClick={composeAICommentaryCast}
                    disabled={isPosting}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      isPosting
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-500 text-white'
                    }`}
                    title="Compose cast with AI commentary"
                  >
                    {isPosting ? '📤 Posting...' : '📤 Cast'}
                  </button>
                )}
          </div>
            ) : (
              <div className="bg-darkPurple/60 rounded-lg p-2 border border-limeGreenOpacity/50">
                {!isConnected ? (
                  <div className="text-center">
                    <p className="text-xs text-lightPurple mb-2">
                      Connect wallet for AI commentary
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <button
                      onClick={() => setShowBuyScoresModal(true)}
                      className="text-xs text-lightPurple hover:text-fontRed transition-colors flex items-center justify-center gap-1 w-full"
                    >
                      <span>🔒</span>
                      <span className="text-notWhite">Unlock AI Commentary</span>
                      <span className="text-fontRed">→</span>
                    </button>
                    <p className="text-xs text-gray-400 mt-1">
                      Holding: {balance.toLocaleString()}/{MIN_REQUIRED_SCORES.toLocaleString()} $SCORES
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="border border-limeGreenOpacity/50 rounded-lg bg-darkPurple/60">
            <ForYouWhosPlaying eventId={eventId} />
          </div>
          
          {/* AI Commentary Display */}
          {aiCommentary && (
            <div className="mt-2 p-3 bg-gradient-to-r from-purple-900/80 to-pink-900/80 rounded-lg border border-limeGreenOpacity/30">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-xs text-limeGreen mb-1">
                    🎤 {currentCommentator?.displayName || selectedCommentator} Commentary
                  </div>
                  <div className="text-sm text-white italic leading-relaxed">
                    &ldquo;{aiCommentary}&rdquo;
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAiCommentary("");
                    setCurrentCommentator(null);
                  }}
                  className="text-gray-400 hover:text-white text-xs"
                  title="Clear commentary"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Room casts */}
      <div
        ref={chatContainerRef}
        className="w-full px-4"
        style={{ height: viewportHeight || undefined, paddingTop: 8 }}
      >
        {/* Bottom-anchored cast column with overflow hidden to create IRC-like vibe */}
        <div className="h-full flex flex-col justify-end overflow-hidden space-y-3">
      {enrichedChat.map((cast) => (
        <div key={`${cast.author?.fid}-${cast.timestamp}`} className="flex items-start text-sm text-white space-x-3 transition-all duration-300 ease-out">
          <div className="relative w-6 h-6">
                <img src={cast.author.pfp_url} alt="pfp" className="w-6 h-6 rounded-full" />
                {cast.teamBadgeUrl && (
                  <img
                    src={cast.teamBadgeUrl}
                    alt="team badge"
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-[0.5px] border-white"
                  />
                )}
              </div>
              <div className="flex-1 text-lightPurple break-words">
                <span className="font-bold text-notWhite">{cast.author.username}</span>{" "}
                {cast.text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                  part.match(/https?:\/\/[^\s]+/) ? (
                    <a
                      key={i}
                      href={part}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fontRed underline break-all"
                    >
                      [Link]
                    </a>
                  ) : (
                    renderMessageWithEmojis(shortenLongWords(part), availableEmojiPacks).map((node, j) => (
                      <React.Fragment key={j}>{node}</React.Fragment>
                    ))
                  )
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Neynar signer controls intentionally hidden in miniapp mode. Approval is opened automatically when needed. */}
      
      
      {/* Desktop footer removed for miniapp-only UI */}

      {/* Footer Mobile version - fixed to bottom of screen */}
      <div ref={footerRef} className="md:hidden fixed bottom-0 left-0 right-0 bg-darkPurple border-t border-limeGreenOpacity z-20">
        <div className="px-10 py-2 ml-3">       {/* hack need to fix when containers get wider */}
          {
            /* Read-only: still render input UI but submission is a no-op for now */
          }
          <ChatInput
              message={message}
              setMessage={setMessage}
              onSubmit={postMessage}
              showEmojiPanel={showEmojiPanel}
              setShowEmojiPanel={setShowEmojiPanel}
              selectedPack={selectedPack}
              setSelectedPack={setSelectedPack}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              showPackDropdown={showPackDropdown}
              setShowPackDropdown={setShowPackDropdown}
              addEmoji={addEmoji}
              isPosting={isPosting}
                emojiPacks={availableEmojiPacks}
            />
        </div>
      </div>

      {/* ScoresInfo Modal */}
      {showScoresInfo && <ScoresInfo defaultOpen onClose={() => setShowScoresInfo(false)} />}
      
      {/* BuyScoresModal */}
      <BuyScoresModal
        isOpen={showBuyScoresModal}
        onClose={() => setShowBuyScoresModal(false)}
        featureName="AI Commentary"
        requiredAmount={MIN_REQUIRED_SCORES}
        currentBalance={balance}
        onPurchaseSuccess={handlePurchaseSuccess}
      />
    </div>
  );
};

export default ContentLiveChat;