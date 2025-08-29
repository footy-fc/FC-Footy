import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL!,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN!,
});

export type FanclubGroupRecord = {
  teamId: string;
  groupId: string;
  inviteLinkUrl?: string | null;
  provider?: string; // e.g., 'warpcast' | 'farcaster'
  name?: string;
  imageUrl?: string;
  createdByFid?: number | null;
  createdAt: string;
  settings?: {
    messageTTLDays?: number;
    membersCanInvite?: boolean;
  };
};

function teamKey(teamId: string) {
  return `fc-footy:fanclub-group:${teamId}`;
}
function groupKey(groupId: string) {
  return `fc-footy:fanclub-group:byGroupId:${groupId}`;
}

export async function setFanclubGroup(record: FanclubGroupRecord): Promise<void> {
  const { teamId, groupId } = record;
  await redis.set(teamKey(teamId), record);
  await redis.set(groupKey(groupId), teamId);
}

export async function getFanclubGroupByTeam(teamId: string): Promise<FanclubGroupRecord | null> {
  try {
    const val = await redis.get(teamKey(teamId));
    return (val || null) as FanclubGroupRecord | null;
  } catch {
    return null;
  }
}

export async function getTeamIdByGroupId(groupId: string): Promise<string | null> {
  try {
    const val = await redis.get(groupKey(groupId));
    return (typeof val === 'string' ? val : val ? String(val) : null);
  } catch {
    return null;
  }
}

