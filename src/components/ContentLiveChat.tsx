import React, { useEffect, useState, useRef } from "react";
import { usePrivy, useLogin, useFarcasterSigner } from "@privy-io/react-auth";
import {HubRestAPIClient} from '@standard-crypto/farcaster-js';

import { ExternalEd25519Signer } from "@standard-crypto/farcaster-js";
import { emojiPacks } from "~/components/utils/customEmojis";
import { getTeamPreferences } from "~/lib/kv";
import { teamsByLeague, getTeamFullName } from "./utils/fetchTeamLogos";
import { useFetchCastsParentUrl } from "./utils/useFetchCastsParentUrls";
import { fetchFanUserData } from "./utils/fetchFCProfile";
// import TestSubmitCast from "./TestSigner";

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
const renderMessageWithEmojis = (message: string) => {
  const emojiRegex = /([a-zA-Z0-9]+::[a-zA-Z0-9_]+)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  while ((match = emojiRegex.exec(message)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(message.substring(lastIndex, match.index));
    }
    const emojiCode = match[1];
    const foundEmoji = Object.values(emojiPacks).flatMap(pack => pack.emojis).find(emoji => emoji.code === emojiCode);
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

function getTeamLogoFromId(teamId: string): string {
  const abbr = teamId.split("-")[1]; // e.g., "ars" from "eng.1-ars"
  return `/assets/logos/${abbr}.png`;
}

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
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
            <div className="relative inline-block text-left">
              <button
                className="flex items-center gap-2 px-2 py-1 text-sm text-white bg-gray-800 rounded"
                onClick={() => setShowPackDropdown((prev) => !prev)}
              >
                <img
                src={
                    emojiPacks.find((p) => p.name === selectedPack)?.logo ??
                    emojiPacks[0].logo
                }
                alt="Send"
                className="w-6 h-6"
                />
                {emojiPacks.find((p) => p.name === selectedPack)?.label}
              </button>
              {showPackDropdown && (
                <ul className="absolute z-20 top-full mt-2 w-48 bg-gray-800 border border-lightPurple rounded shadow-lg max-h-60 overflow-y-auto">
                  {emojiPacks.map((pack) => (
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
              const basePacks = emojiPacks.filter(pack =>
                pack.name === "footy" || pack.name === selectedPack
              );
              const emojis = basePacks.flatMap((pack) =>
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
        placeholder="Type your cast... (tap ⚽️ for custom emojis)"
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
            emojiPacks.find((p) => p.name === selectedPack)?.logo ??
            emojiPacks[0].logo
          }
          alt="Send"
          className="w-6 h-6"
        />
      </button>
    </div>
  );
};
const DEFAULT_CHANNEL_HASH: `0x${string}` = (process.env.NEXT_PUBLIC_DEFAULT_CHANNEL_HASH || "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0") as `0x${string}`;

const ContentLiveChat = ({ teamId }: { teamId: string }) => {
  const leagueKey = teamId.split("-")[0];
  const abbr = teamId.split("-")[1];
  const teamName = getTeamFullName(abbr, leagueKey);
  const roomHash =
    teamsByLeague[leagueKey]?.find((t) => t.abbr === abbr)?.roomHash ??
    DEFAULT_CHANNEL_HASH;
  // const [casts, setCasts] = useState<CastType[]>([]);  
  const [message, setMessage] = useState("");
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [selectedPack, setSelectedPack] = useState(emojiPacks[0].name);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPackDropdown, setShowPackDropdown] = useState(false);
  const [backgroundLogo, setBackgroundLogo] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  //console.log("ContentLiveChat received roomHash:", roomHash);
  // const [setChannel] = useState(`match:${roomHash}`);
  //console.log("Initial channel state:", `match:${roomHash}`);
  const {casts: footyChat } = useFetchCastsParentUrl("https://d33m.com/gantry", "https://snapchain.pinnable.xyz");
  const [enrichedChat, setEnrichedChat] = useState<CastType[]>([]);

  const { login } = useLogin();
  const { getFarcasterSignerPublicKey, signFarcasterMessage } = useFarcasterSigner();
  const { requestFarcasterSignerFromWarpcast } = useFarcasterSigner();
  const { authenticated, user } = usePrivy();
  const signer = new ExternalEd25519Signer(signFarcasterMessage, getFarcasterSignerPublicKey);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const enrichWithUserData = async () => {
      const enriched = await Promise.all(
        footyChat.map(async (cast): Promise<CastType> => {
          const fan = await fetchFanUserData(cast.data?.fid || 0);
          const fid = cast.data?.fid?.toString() ?? "0";
          const teamIds = await getTeamPreferences(fid);
          const teamId = teamIds?.[0];
          const teamBadgeUrl = teamId ? getTeamLogoFromId(teamId) : null;

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
  }, [footyChat]);
  
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
    const fetchUserTeamLogoAndEmoji = async () => {
      if (user?.farcaster?.fid) {
        const teamIds = await getTeamPreferences(user.farcaster.fid.toString());
        const teamId = teamIds?.[0];
        if (teamId) {
          const logo = getTeamLogoFromId(teamId);
          setBackgroundLogo(logo);
          const matchingPack = emojiPacks.find((pack) => pack.teamId === teamId);
          if (matchingPack) {
            setSelectedPack(matchingPack.name);
          } else {
            console.log("No matching emoji pack found for teamId:", teamId);
          }
        }
      }
    };

    fetchUserTeamLogoAndEmoji();
  }, [user?.farcaster?.fid]);

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
    if (!authenticated) {
      login();
      return;
    }

    const farcasterAccount = user?.linkedAccounts.find((account) => account.type === "farcaster");
    if (!farcasterAccount?.signerPublicKey) {
      console.error("Farcaster signer not authorized yet");
      await requestFarcasterSignerFromWarpcast();
      setIsPosting(false);
      return;
    }

    if (isPosting) return;
    setIsPosting(true);

    try {
      const fid = user?.farcaster?.fid;
      if (!fid) {
        console.error("FID is undefined, cannot submit cast");
        setIsPosting(false);
        return;
      }
/*       const signer = new ExternalEd25519Signer(
        signFarcasterMessage,
        getFarcasterSignerPublicKey
      ); */
      
      const client = new HubRestAPIClient({
        // hubUrl: "https://snapchain-grpc.pinnable.xyz",
        hubUrl: "https://crackle.farcaster.xyz:3381",
      });

      console.log("Submitting cast with", { message, fid, signer });
      const response = await client.submitCast(
        {
          text: message,
          embeds: [],
          // parentUrl: parentCastUrl || undefined, // optional
        },
        fid,
        signer
      );

      console.log("Submitted cast:", response);
      setMessage("");
      setShowEmojiPanel(false);
    } catch (error) {
      console.error("Error sending cast:", error);
    } finally {
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

  // console.log("background logo:", backgroundLogo   );
  return (
    <div className="h-full relative pt-4 pb-0 px-4 rounded-lg flex flex-col bg-darkPurple/80 overflow-hidden">      {backgroundLogo && (
        <div
          className="absolute top-4 left-0 right-0 bottom-0 z-0 bg-no-repeat bg-contain bg-center opacity-20 pointer-events-none"
          style={{
              backgroundImage: `url(${backgroundLogo})`,
              backgroundSize: "50%",
            }}
        />
      )}
      
      {/* Room name - shown above casts */}
      <div className="flex justify-start gap-2 mb-2 text-md">
        {roomHash === DEFAULT_CHANNEL_HASH ? '🏟️ The Gantry' : `🏟️ ${teamName}`}
      </div>

      {/* Room casts */}
      <div ref={chatContainerRef} className="w-full flex-1 overflow-y-auto space-y-3 scroll-pb-44 scroll-smooth overscroll-contain">
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
                    renderMessageWithEmojis(shortenLongWords(part)).map((node, j) => (
                      <React.Fragment key={j}>{node}</React.Fragment>
                    ))
                  )
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
      </div>
      
      {/* Authorize casting */}
      {user?.farcaster && !user.farcaster?.signerPublicKey && (
        <div className="flex flex-col gap-2 mt-4">
          <button
            onClick={() => requestFarcasterSignerFromWarpcast()}
            className="w-full sm:w-38 bg-deepPink text-white py-2 px-4 rounded-lg transition-colors hover:bg-fontRed"
          >
            Authorize casting
          </button>
        </div>
      )}
      
      
      {/* Footer Desktop version - shown above content */}
      <div className="hidden md:block mt-2">
        <div className="flex border-t border-limeGreenOpacity w-full">
          <button className="px-4 py-2 flex-1 text-gray-500">
            Find match
          </button>
          <button className="px-4 py-2 flex-1 text-gray-500">
            Create room
          </button>
          <button className="px-4 py-2 flex-1 text-gray-500">
            Tip host
          </button>
        </div>
      </div>

      {/* Footer Mobile version - fixed to bottom of screen */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-darkPurple border-limeGreenOpacity z-20">
        <div className="px-10 py-2 ml-3">       {/* hack need to fix when containers get wider */}
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
          />
        </div>
           {/*     <TestSubmitCast />

        <div className="flex justify-around">
          <button className="flex-1 py-3 px-2 text-center text-gray-500">
            <div className="flex flex-col items-center">
              <div className="mb-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 9a3 3 0 1 1 6 0c0 1.5-1.5 2.5-2 3l-1 1"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01"></path>
                </svg>
              </div>
              <span className="text-xs">Find match</span>
            </div>
          </button>
          <button className="flex-1 py-3 px-2 text-center text-gray-500">
            <div className="flex flex-col items-center">
              <div className="mb-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 9a3 3 0 1 1 6 0c0 1.5-1.5 2.5-2 3l-1 1"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01"></path>
                </svg>
              </div>
              <span className="text-xs">Create room</span>
            </div>
          </button>
          <button className="flex-1 py-3 px-2 text-center text-gray-500">
            <div className="flex flex-col items-center">
              <div className="mb-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 1.343-3 3 0 .432.112.83.304 1.184M12 8c1.657 0 3 1.343 3 3 0 .432-.112.83-.304 1.184M12 2v2m0 16v2m-4-4h-2m10 0h-2m-4-4H6m12 0h-2"/>
              </svg>
              </div>
              <span className="text-xs">Tip host</span>
            </div>
          </button>
        </div> */}
      </div>
    </div>
  );
};

export default ContentLiveChat;