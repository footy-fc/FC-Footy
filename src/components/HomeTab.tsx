import React from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useFootyFarcaster } from "~/lib/farcaster/useFootyFarcaster";

interface HomeTabProps {
  onNavigate: (tab: string) => void;
  viewerFid?: number;
}

const homeActions = [
  {
    tab: "scores",
    title: "Live Scores",
    description: "Follow Premier League fixtures and match rooms.",
    action: "Open Scores",
  },
  {
    tab: "fantasy",
    title: "Fantasy EPL",
    description: "Check the Farcaster Fantasy EPL league table.",
    action: "Open Fantasy",
  },
  {
    tab: "fanClubs",
    title: "Fan Clubs",
    description: "Pick clubs, find supporters, and join matchday chats.",
    action: "Open Fan Clubs",
  },
];

const HomeTab: React.FC<HomeTabProps> = ({ onNavigate }) => {
  const { ready, authenticated } = usePrivy();
  const { hasFarcaster, runtime } = useFootyFarcaster();

  return (
    <div className="mb-4">
      <div className="mb-4">
        <div className="app-eyebrow mb-2">Home</div>
        <h2 className="app-title">Footy matchday</h2>
        <div className="app-micro mt-1">
          Scores, fan clubs, and the Farcaster Fantasy EPL table.
        </div>
      </div>

      {ready && authenticated && runtime !== "miniapp" && !hasFarcaster ? (
        <div className="mb-4 rounded-[22px] border border-deepPink/30 bg-purplePanel p-4 text-lightPurple">
          <div className="app-card-title mb-2">Finish your Footy profile</div>
          <div className="mb-3 text-sm text-lightPurple">
            Profile handles account creation inside Footy, including your Farcaster identity and signer.
          </div>
          <button
            type="button"
            onClick={() => onNavigate("profile")}
            className="rounded-xl bg-deepPink px-4 py-3 text-sm font-semibold text-notWhite transition-colors hover:bg-deepPink/85"
          >
            Open Profile setup
          </button>
        </div>
      ) : null}

      <div className="space-y-3">
        {homeActions.map((item) => (
          <section
            key={item.tab}
            className="rounded-[22px] border border-limeGreenOpacity bg-purplePanel p-4 text-lightPurple"
          >
            <div className="mb-2 app-section-title">{item.title}</div>
            <p className="mb-4 text-sm leading-5 text-lightPurple">{item.description}</p>
            <button
              type="button"
              onClick={() => onNavigate(item.tab)}
              className="rounded-xl bg-darkPurple px-4 py-3 text-sm font-semibold text-notWhite transition-colors hover:bg-deepPink/80"
            >
              {item.action}
            </button>
          </section>
        ))}
      </div>
    </div>
  );
};

export default HomeTab;
