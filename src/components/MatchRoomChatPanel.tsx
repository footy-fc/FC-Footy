"use client";

import React from "react";
import ContentLiveChat from "./ContentLiveChat";

interface MatchRoomRecord {
  parentUrl?: string | null;
  castHash?: string | null;
}

interface MatchRoomChatPanelProps {
  eventId: string;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyCopy?: string;
}

const MatchRoomChatPanel: React.FC<MatchRoomChatPanelProps> = ({
  eventId,
  title = "Match chat",
  description = "Join the Farcaster thread for this fixture.",
  emptyTitle = "Match chat not live yet",
  emptyCopy = "This fixture does not have a room configured yet.",
}) => {
  const [room, setRoom] = React.useState<MatchRoomRecord | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    const loadRoom = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/match-rooms?eventId=${encodeURIComponent(eventId)}`);
        const payload = await response.json();

        if (!cancelled) {
          setRoom(payload?.room || null);
        }
      } catch {
        if (!cancelled) {
          setRoom(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadRoom();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const castHash = room?.castHash || null;
  const parentUrl = room?.parentUrl || null;
  const hasRoom = Boolean(castHash || parentUrl);

  return (
    <section className="rounded-[24px] border border-limeGreenOpacity bg-purplePanel p-4 text-lightPurple">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="app-section-title">{title}</div>
          <div className="app-micro mt-1">{description}</div>
        </div>
        {loading ? (
          <div className="text-[11px] uppercase tracking-[0.14em] text-lightPurple/70">Loading room</div>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-[18px] border border-dashed border-white/10 px-3 py-4 text-sm text-lightPurple">
          Loading the match thread…
        </div>
      ) : hasRoom ? (
        <ContentLiveChat
          eventId={eventId}
          parentCastHash={castHash ?? undefined}
          parentUrl={parentUrl ?? undefined}
          behaviorMode="match-thread"
          layoutMode="embedded"
          showBackButton={false}
          showMatchContextCard={false}
          inputPlaceholder="Reply to the World Cup match thread..."
        />
      ) : (
        <div className="rounded-[18px] border border-dashed border-white/10 px-3 py-4 text-sm text-lightPurple">
          <div className="font-semibold text-notWhite">{emptyTitle}</div>
          <div className="mt-1">{emptyCopy}</div>
        </div>
      )}
    </section>
  );
};

export default MatchRoomChatPanel;
