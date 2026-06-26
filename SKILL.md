---
name: fc-footy-dev
description: >-
  Developer guide for the FC-Footy Farcaster Mini App. Use whenever working in
  this repo — adding features, fixing bugs, writing API routes, components,
  notifications, ScoreSquare on-chain logic, FPL analytics, or AI commentary.
  Covers the stack, directory layout, conventions, storage, and common workflows.
metadata:
  type: project
---

# FC-Footy Developer Guide

FC-Footy ("Footy App") is a Farcaster Mini App for football fans, live at
https://fc-footy.vercel.app/ (repo: `footy-fc/FC-Footy`). It brings fans
together with team fan clubs/chat, live scores, goal notifications, an on-chain
prediction game (ScoreSquare), Fantasy Premier League (FPL) analytics, and
AI-generated match commentary ("Peter Drury").

## Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS.
- **Node**: 22.x. **Package manager**: Yarn (`nodeLinker: node-modules`). Use
  `yarn`, not `npm`.
- **Import alias**: `~/*` → `./src/*` (e.g. `import { kv } from "~/lib/kv"`).
- **Farcaster**: `@farcaster/miniapp-sdk`, `@farcaster/auth-kit`,
  `@farcaster/frame-node`, `@farcaster/miniapp-wagmi-connector`,
  `@farcaster/quick-auth`.
- **Auth**: Privy (`@privy-io/react-auth`) inside the Mini App, with Farcaster
  AuthKit as the browser fallback.
- **Blockchain**: wagmi + viem/ox, targeting Base (plus Optimism / mainnet /
  Degen). ScoreSquare contract source is `scoresquare.sol`.
- **Storage**: Upstash Redis (KV) for notification tokens and team preferences;
  Supabase for relational data; QStorage (custom, S3-backed) for media.
- **AI**: Google Generative AI + LangChain/OpenAI for commentary and RAG.
- **3rd-party APIs**: Neynar (Farcaster data), ESPN (match data), Hypersnap
  (profiles), Revnet, a subgraph (The Graph) for on-chain data.

## Directory layout (`src/`)

- `app/` — Next.js App Router. `page.tsx` builds the `fc:frame` embed metadata;
  `app.tsx` loads `Main` dynamically (SSR disabled); `layout.tsx`,
  `providers.tsx` wire global providers. `app/api/` holds all route handlers.
- `components/` — ~87 React components. Tab content lives in `*Tab.tsx` and
  `Content*.tsx`; ScoreSquare UI in `BlockchainScoreSquare*.tsx`; FPL in
  `FPL*` / `Fantasy*` / `Contest*`.
- `lib/` — core helpers: `kv*.ts` (Redis), `notifications*.ts`, `teamService.ts`,
  `qstorage.ts`, `subgraphClient.ts`, `apollo-client.ts`, `farcaster/`,
  `fanclubs/`, `graphql/`.
- `services/` — AI commentary pipeline (`CommentaryPipeline.ts`,
  `CommentatorFactory.ts`, `commentators/`).
- `hooks/` — shared React hooks (`useMiniAppDetection`, `useSubgraphData`,
  `useScoresTokenGate`, etc.).
- `config/` (e.g. `privileged.ts` for admin FIDs), `constants/`
  (`contracts.ts`), `context/`, `data/`, `types/`, `utils/`.
- `scripts/` — standalone `.mjs` tools (FPL, gameweek summaries, Drury,
  RAG, ScoreSquare players). Run via the `yarn` scripts below.

## API routes (`src/app/api/`)

Each subfolder is a `route.ts` handler. Notable groups: `scores`,
`match-data`, `match-events`, `match-rooms`, `fanclubs`, `fanclub-chat`,
`scoresquare-leaderboard`, `fpl-*` / `manager-picks` / `managers-gw-summary`,
`peter-drury-commentary` / `commentator`, `goal-notification` / `notify-all` /
`send-notification` / `notification-users`, `webhook` (Farcaster lifecycle),
`neynar`, `og` (dynamic images), `cron`, `revnet` / `proxyRevnet`, `admin`.

When adding an API route, follow the existing pattern: create
`src/app/api/<name>/route.ts` exporting `GET`/`POST`, read shared logic from
`src/lib`, and use the `~/` import alias.

## Farcaster Mini App integration

- Embed metadata: `src/app/page.tsx` emits the `fc:frame` metatag (version
  `next`). Splash uses `/public/defifa_spinner.gif` on background `#010513`.
- Runtime detection: `src/lib/farcaster/useFootyFarcaster.ts` (and
  `hooks/useMiniAppDetection.ts`) decide Mini App vs. standalone browser and
  drive the auth gate in `components/Main.tsx`.
- Webhook: `src/app/api/webhook/route.ts` handles `miniapp_added`,
  `miniapp_removed`, `notifications_enabled`, `notifications_disabled`, storing
  notification tokens per FID in Redis.
- Notifications: `src/lib/notifications.ts` (`sendFrameNotification`) plus
  `notificationsBatch.ts`; tokens/preferences via `lib/kv.ts` /
  `kvPerferences.ts`.

## Storage conventions

- **Redis (Upstash KV)** is the source of truth for notification details and
  team/fan preferences — use the `kv*.ts` helpers, don't hit Redis directly.
  See `KV_ONLY_STORAGE_SUMMARY.md` and `FPL_PICKS_STORAGE_STRATEGY.md`.
- **Supabase** (`supabase.ts`) for relational data.
- **QStorage** (`lib/qstorage.ts`) for media/uploads (S3 under the hood).
- On-chain data is queried via the subgraph (`lib/subgraphClient.ts`,
  Apollo/GraphQL). See `SUBGRAPH.md`.

## Common commands

```bash
yarn install            # setup (then cp env.example .env.local)
yarn dev                # local dev at http://localhost:3000
yarn build              # production build
yarn check              # lint + tsc (run before pushing)
yarn lint               # eslint only
yarn compile            # tsc only

# Subgraph
yarn subgraph:codegen / subgraph:build / subgraph:deploy

# Data / AI scripts (scripts/*.mjs)
yarn gameweek:summary           # FPL gameweek summary
yarn manager:picks:points       # manager picks → points
yarn managers:chips             # list managers' chips
yarn drury:test                 # Peter Drury commentary test
yarn rag:test[:<preset>]        # RAG commentary tests (arsenal, man-utd, ...)
yarn scoresquare:players        # ScoreSquare players test
```

## Working in this repo

- Always run `yarn check` (lint + typecheck) before considering a change done.
- Reuse existing `lib/` and `services/` helpers instead of duplicating logic
  (KV access, notifications, team lookups, subgraph queries).
- Keep secrets in `.env.local` (template in `env.example`); never commit them.
- Reference docs in the repo root: `FANCLUB_API.md`, `SCORES_API_INSTRUCTIONS.md`,
  `TEAM_MANAGEMENT_README.md`, `PETER_DRURY_README.md`, `HOW_TO_PLAY.md`,
  `CLI_COMMANDS_README.md`, plus storage/subgraph docs noted above.
