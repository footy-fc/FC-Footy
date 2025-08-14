"use client";
import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ContentLiveChat from "~/components/ContentLiveChat";

function ChatPageInner() {
  const searchParams = useSearchParams();
  const eventId = searchParams?.get("eventId") || "";
  // const returnTo = searchParams?.get("returnTo") || null;
  const [castHash, setCastHash] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (!eventId) return;
        const res = await fetch(`/api/match-rooms?eventId=${encodeURIComponent(eventId)}`);
        const data = await res.json();
        if (!cancelled) setCastHash(data?.room?.castHash || null);
      } catch {
        if (!cancelled) setCastHash(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [eventId]);

  return (
    <div className="w-[400px] mx-auto py-2 px-2 text-lightPurple">
      {!eventId && <div className="text-fontRed">Missing eventId</div>}
      {eventId && loading && <div>Loading…</div>}
      {eventId && !loading && !castHash && (
        <div className="text-sm">
          No chat room configured for <span className="text-notWhite">{eventId}</span> yet.
        </div>
      )}
      {eventId && castHash && (
        <ContentLiveChat parentCastHash={castHash} eventId={eventId} />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="w-[400px] mx-auto py-2 px-2 text-lightPurple">Loading…</div>}>
      <ChatPageInner />
    </Suspense>
  );
}


