"use client";
import React, { useEffect, useMemo, useState } from 'react';

type League = { id: string; name: string };
type Team = { id: string; name: string; shortName?: string; abbreviation: string; country?: string; logoUrl?: string };

const GroupChatsTab: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [memberships, setMemberships] = useState<Record<string, string[]>>({});

  const [leagueId, setLeagueId] = useState<string>("eng.1");
  const [teamId, setTeamId] = useState<string>("");

  const [desc, setDesc] = useState("");
  const [genInvite, setGenInvite] = useState(true);
  const [messageTTL, setMessageTTL] = useState<number>(30);
  const [membersCanInvite, setMembersCanInvite] = useState<boolean>(true);
  const [invitees, setInvitees] = useState<Array<{ fid: string; role: 'member' | 'admin' }>>([]);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<string>("");
  // Override mapping state
  const [overrideGroupId, setOverrideGroupId] = useState<string>("");
  const [overrideInvite, setOverrideInvite] = useState<string>("");
  const [overrideStatus, setOverrideStatus] = useState<string>("");

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [leaguesRes, teamsRes, membershipsRes] = await Promise.all([
          fetch('/api/leagues'),
          fetch('/api/teams', { headers: { 'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || '' } }),
          fetch('/api/memberships/all', { headers: { 'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || '' } }),
        ]);
        const leaguesJson = await leaguesRes.json();
        const teamsJson = await teamsRes.json();
        const membershipsJson = await membershipsRes.json();
        setLeagues(leaguesJson.leagues || []);
        setTeams(teamsJson.teams || []);
        setMemberships(membershipsJson.memberships || {});
      } catch (e) {
        console.warn('Failed to load leagues/teams', e);
      }
    };
    fetchMeta();
  }, []);

  const leagueTeams = useMemo(() => {
    const ids = memberships[leagueId] || [];
    return ids.length ? teams.filter(t => ids.includes(t.id)) : teams;
  }, [memberships, leagueId, teams]);

  const selectedTeam = useMemo(() => leagueTeams.find(t => t.id === teamId) || null, [leagueTeams, teamId]);
  const groupName = selectedTeam ? `${selectedTeam.name} Fan Chat` : '';
  const imageUrl = selectedTeam?.logoUrl || '';
  const uniqueTeamId = selectedTeam ? `${leagueId}-${selectedTeam.abbreviation.toLowerCase()}` : '';

  return (
    <div>
      <h3 className="text-lg font-semibold text-notWhite mb-4">Group Chats</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs text-lightPurple">League</label>
          <select value={leagueId} onChange={(e)=>{ setLeagueId(e.target.value); setTeamId(""); }} className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple">
            {leagues.length === 0 ? (
              <option value="eng.1">EPL</option>
            ) : (
              leagues.map(l => <option key={l.id} value={l.id}>{l.name} ({l.id})</option>)
            )}
          </select>
        </div>
        <div>
          <label className="text-xs text-lightPurple">Club</label>
          <select value={teamId} onChange={(e)=>setTeamId(e.target.value)} className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple">
            <option value="">Select team</option>
            {leagueTeams.sort((a,b)=>a.name.localeCompare(b.name)).map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.abbreviation.toUpperCase()})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-lightPurple">Group Name</label>
          <input value={groupName} readOnly className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple" />
        </div>
        <div>
          <label className="text-xs text-lightPurple">Image URL</label>
          <input value={imageUrl} readOnly className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-lightPurple">Description (optional)</label>
          <input value={desc} onChange={(e)=>setDesc(e.target.value)} maxLength={128} className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple" />
        </div>
        <div>
          <label className="text-xs text-lightPurple">Message TTL (days)</label>
          <select value={messageTTL} onChange={(e)=>setMessageTTL(Number(e.target.value))} className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple">
            <option value={1}>1</option>
            <option value={7}>7</option>
            <option value={30}>30</option>
            <option value={365}>365</option>
          </select>
        </div>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 text-lightPurple text-sm">
            <input type="checkbox" checked={genInvite} onChange={(e)=>setGenInvite(e.target.checked)} />
            Generate Invite Link
          </label>
          <label className="flex items-center gap-2 text-lightPurple text-sm">
            <input type="checkbox" checked={membersCanInvite} onChange={(e)=>setMembersCanInvite(e.target.checked)} />
            Members Can Invite
          </label>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-xs text-lightPurple mb-1">Invitees (optional)</div>
        {invitees.map((inv, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <input placeholder="fid" value={inv.fid} onChange={(e)=>{ const v=[...invitees]; v[idx]={...v[idx], fid:e.target.value}; setInvitees(v); }} className="w-40 p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple" />
            <select value={inv.role} onChange={(e)=>{ const v=[...invitees]; v[idx]={...v[idx], role:e.target.value as 'member'|'admin'}; setInvitees(v); }} className="w-32 p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple">
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            <button className="px-2 border border-fontRed text-fontRed rounded" onClick={()=> setInvitees(invitees.filter((_,i)=>i!==idx))}>Remove</button>
          </div>
        ))}
        <button className="px-3 py-1 border border-limeGreenOpacity text-lightPurple rounded" onClick={()=> setInvitees([...invitees, { fid: '', role: 'member'}])}>+ Add Invitee</button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          disabled={creating || !selectedTeam}
          onClick={async ()=>{
            if (!selectedTeam) return;
            setCreating(true);
            setResult("");
            try {
              interface Invitee { fid: number; role: 'member'|'admin' }
              interface CreatePayload {
                name: string;
                description?: string;
                imageUrl?: string;
                generateInviteLink: boolean;
                settings: { messageTTLDays: number; membersCanInvite: boolean };
                teamId: string;
                invitees?: Invitee[];
              }
              const payload: CreatePayload = {
                name: `${selectedTeam.name} Fan Chat`,
                description: desc.trim() || undefined,
                imageUrl: selectedTeam.logoUrl || undefined,
                generateInviteLink: genInvite,
                settings: { messageTTLDays: messageTTL, membersCanInvite },
                teamId: uniqueTeamId,
              };
              const invs = invitees.filter(i=>i.fid && !Number.isNaN(Number(i.fid))).map(i=>({ fid: Number(i.fid), role: i.role }));
              if (invs.length) payload.invitees = invs;
              const res = await fetch('/api/admin/create-group', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
              const json = await res.json();
              if (res.ok) {
                const gid = json?.result?.groupId || json?.groupId;
                const invite = json?.result?.inviteLinkUrl || json?.inviteLinkUrl;
                setResult(`Created group ${gid || ''} ${invite ? '• Invite: '+invite : ''}`.trim());
              } else {
                setResult(`Failed: ${json?.error || res.status}`);
              }
            } catch (e) {
              setResult(e instanceof Error ? e.message : 'Error creating group');
            } finally {
              setCreating(false);
            }
          }}
          className={`px-4 py-2 rounded ${creating || !selectedTeam ? 'bg-purple-900 text-gray-500' : 'bg-deepPink text-white hover:bg-fontRed'}`}
        >
          {creating ? 'Creating…' : 'Create Group'}
        </button>
        {result && <div className="text-xs text-lightPurple">{result}</div>}
      </div>

      {/* Override existing mapping */}
      <div className="mt-8 border-t border-limeGreenOpacity pt-4">
        <h3 className="text-lg font-semibold text-notWhite mb-2">Rooms • Override Fan Club Mapping</h3>
        <div className="grid gap-2 md:grid-cols-2">
          <div>
            <label className="text-xs text-lightPurple">Team (League • Club)</label>
            <div className="text-xs text-gray-400">{uniqueTeamId || 'Select league and club above'}</div>
          </div>
          <div>
            <label className="text-xs text-lightPurple">Group ID</label>
            <input value={overrideGroupId} onChange={e=>setOverrideGroupId(e.target.value)} className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-lightPurple">Invite Link (optional)</label>
            <input value={overrideInvite} onChange={e=>setOverrideInvite(e.target.value)} className="w-full p-2 border border-limeGreenOpacity rounded bg-darkPurple text-lightPurple" />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            className="px-3 py-1 border border-limeGreenOpacity text-lightPurple rounded"
            onClick={async ()=>{
              if (!uniqueTeamId) return;
              setOverrideStatus('');
              try {
                const res = await fetch(`/api/fanclub-chat?teamId=${encodeURIComponent(uniqueTeamId)}`);
                const j = await res.json();
                if (res.ok) {
                  setOverrideGroupId(j.groupId || '');
                  setOverrideInvite(j.inviteLinkUrl || '');
                  setOverrideStatus('Loaded current mapping');
                } else {
                  setOverrideGroupId('');
                  setOverrideInvite('');
                  setOverrideStatus('No mapping found');
                }
              } catch { setOverrideStatus('Lookup failed'); }
            }}
          >Load Current</button>
          <button
            className="px-3 py-1 border border-deepPink text-deepPink rounded"
            onClick={async ()=>{
              if (!uniqueTeamId || !overrideGroupId.trim()) { setOverrideStatus('Provide team and groupId'); return; }
              try {
                const res = await fetch('/api/admin/fanclub-group', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || '' },
                  body: JSON.stringify({ teamId: uniqueTeamId, groupId: overrideGroupId.trim(), inviteLinkUrl: overrideInvite.trim() || undefined }),
                });
                const j = await res.json();
                if (res.ok) setOverrideStatus('Saved override');
                else setOverrideStatus(j?.error || 'Save failed');
              } catch { setOverrideStatus('Save failed'); }
            }}
          >Save Override</button>
          {overrideStatus && <div className="text-xs text-lightPurple self-center">{overrideStatus}</div>}
        </div>
      </div>
    </div>
  );
};

export default GroupChatsTab;
