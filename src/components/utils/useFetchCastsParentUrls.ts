import { useEffect, useState } from 'react';
import { Message } from '@farcaster/core';
import axios from "axios";
 
export function useFetchCastsParentUrl(
  url: string | null,
  FarcasterHub: string,
  pageSize: number = 10,
  parentCast?: { fid: number; hash: string }
) {
  const [casts, setCasts] = useState<Message[]>([]); // Provide a type annotation for casts
  const [loading, setLoading] = useState(true);

  /* const bytesToHex = (bytes: Uint8Array): string =>
    '0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
 */
  useEffect(() => {
    let cancelled = false;
    const fetchCasts = async () => {
      try {
        if (parentCast?.hash) {
          const resp = await axios.get(`/api/farcaster/conversation?hash=${encodeURIComponent(parentCast.hash)}&reply_depth=2`);
          if (!cancelled) {
            if (resp.status === 200) {
              type ConversationReply = {
                cast?: { timestamp?: string | number; author?: { fid?: number }; text?: string };
                replies?: ConversationReply[];
              };

              const rootReplies = (resp.data?.conversation?.replies || resp.data?.replies || []) as ConversationReply[];
              const flattenReplies = (replies: ConversationReply[]): ConversationReply[] =>
                replies.flatMap((reply) => [reply, ...flattenReplies(reply.replies || [])]);

              const directReplies = flattenReplies(rootReplies);
              // @ts-expect-error shaping external API into Farcaster Message dat
              const messages: Message[] = directReplies
                .filter((reply) => reply.cast)
                .map((reply: ConversationReply) => ({
                data: {
                  // Farcaster hub Message.data expects timestamp number
                  timestamp: new Date(reply.cast?.timestamp || 0).getTime(),
                  fid: reply.cast?.author?.fid as number,
                  castAddBody: { text: String(reply.cast?.text || '') },
                } as unknown as Message['data'],
              }));
              // Oldest first so newest is bottom in UI
              const sorted = (messages || []).sort((a, b) => (a.data?.timestamp ?? 0) - (b.data?.timestamp ?? 0));
              setCasts(sorted.slice(-pageSize));
            } else {
              console.error('Failed to fetch conversation (HyperSnap):', resp.statusText);
            }
          }
        } else if (url) {
          // Fallback to Hub REST via URL
          console.log('You should not see this. Falling back to Hub REST via URL:', url);
          const endpoint = `${FarcasterHub}/v1/castsByParent?pageSize=${pageSize}&reverse=false&url=${encodeURIComponent(url)}`;
          const castsResult = await axios.get(endpoint, {
            headers: { "Content-Type": "application/json" },
          });
          if (!cancelled) {
            if (castsResult.status === 200) {
              const messages = (castsResult.data?.messages || []) as Message[];
              const sorted = (messages || []).sort((a, b) => (a.data?.timestamp ?? 0) - (b.data?.timestamp ?? 0));
              setCasts(sorted.slice(-pageSize));
            } else {
              console.error('Failed to fetch casts (Hub URL):', castsResult.statusText);
            }
          }
        } else {
          setCasts([]);
          return;
        }
      } catch (e) {
        console.error('Failed to fetch casts:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCasts();
    const intervalId = setInterval(fetchCasts, 3000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [FarcasterHub, url, pageSize, parentCast?.fid, parentCast?.hash]);

  return {
    casts,
    loading,
  };
}
