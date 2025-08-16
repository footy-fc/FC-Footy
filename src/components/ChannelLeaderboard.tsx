import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchFantasyData } from '../components/utils/fetchFantasyData'; // Adjust path as necessary

// https://cura.openrank.com/api/leaderboard-users?rank_timeframe=7d&channel_id=football
// TODO: Replace the below URL with this actual endpoint once CORS issue resolved

interface LeaderboardUser {
  fid: number;
  fname: string;
  username: string;
  pfp: string | null;
  bio: string;
  channel_id: string;
  rank: number | null; // Leaderboard rank
  score: number;
  global_rank: number;
  addresses: string[];
  balance: number;
  token_balance: number | null;
  daily_earnings: number;
  token_daily_earnings: number;
  is_weekly_earnings_available: boolean;
  latest_earnings: number | null;
  token_latest_earnings: number | null;
  weekly_earnings: number;
  token_weekly_earnings: number;
  bal_update_ts: string;
  is_points_launched: boolean;
  is_tokens_launched: boolean;
  memberat: number;
  fantasy_rank?: number | null; // Fantasy rank
  fantasy_team?: string | null; // Fantasy team name
  fantasy_total?: number | null; // Fantasy total points
  fav_team_logo?: string | null; // Favorite team logo
  fav_team_name?: string | null; // Favorite team name
}

const FootballLeaderboardComponent = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch leaderboard data
        const leaderboardResponse = await axios.get<LeaderboardUser[]>(
          'https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/screenshots/leaderboard-users.json'
        );

        // Fetch fantasy data
        const fantasyData = await fetchFantasyData();

        // Merge leaderboard and fantasy data by fid
        const mergedData = leaderboardResponse.data.map((user) => {
          const fantasyInfo = fantasyData.find(
            (entry) => entry.fid === user.fid
          );

          return {
            ...user,
            fantasy_rank: fantasyInfo?.rank || null,
            fantasy_team: fantasyInfo?.entryName || null,
            fantasy_total: fantasyInfo?.totalPoints || null,
            fav_team_logo: fantasyInfo?.team?.logo || null,
            fav_team_name: fantasyInfo?.team?.name || null,
          };
        });

        // Filter out users with rank null or 0 and sort by leaderboard rank ascending
        const filteredAndSortedData = mergedData
          .filter((user) => user.rank && user.rank > 0)
          .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

        setLeaderboardData(filteredAndSortedData);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message || 'Failed to fetch leaderboard or fantasy data.');
        } else {
          setError('An unexpected error occurred.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="leaderboard py-6 bg-background text-foreground">
      <h2 className="text-2xl font-bold text-center mb-6 text-foreground">Cura Leaderboard</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-4">
        {leaderboardData.map((user: LeaderboardUser) => (
          <li key={user.fid} className="leaderboard-item">
            <div className="rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 bg-purplePanel border-deepPink border">
              {/* Header */}
              <div className="p-4 border-b text-center bg-darkPurple border-deepPink">
                <h3 className="text-lg font-semibold text-lightPurple">{user.username}</h3>
                {user.rank && (
                  <p className="text-sm text-foreground">Content Rank: {user.rank}</p>
                )}
                {user.fantasy_rank && (
                  <p className="text-sm text-limeGreen">Fantasy Rank: {user.fantasy_rank}</p>
                )}
                {user.fantasy_team && (
                  <p className="text-sm text-lightPurple">Fantasy Team: {user.fantasy_team}</p>
                )}
                {user.fav_team_logo && (
                  <div className="mt-2 flex justify-center items-center">
                    <img
                      src={user.fav_team_logo}
                      alt={`${user.fav_team_name || 'Favorite Team'} Logo`}
                      className="w-8 h-8 rounded-full"
                    />
                    {user.fav_team_name && (
                      <p className="ml-2 text-sm text-lightPurple">{user.fav_team_name} Supporter</p>
                    )}
                  </div>
                )}
              </div>
              {/* Profile Picture */}
              <a
                href={`https://warpcast.com/~/profiles/${user.fid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4"
              >
                <img
                  src={user.pfp || 'https://via.placeholder.com/50'}
                  alt={`${user.fname || 'Unknown User'}'s profile`}
                  className="w-24 h-24 rounded-full mx-auto border-limeGreen"
                />
              </a>
              {/* Footer */}
              <div className="p-4 border-t text-center bg-darkPurple border-deepPink">
                <p className="text-sm text-lightPurple">Balance: {user.balance.toFixed(2)}</p>
                <p className="text-sm text-limeGreen">Daily Earnings: {user.daily_earnings}</p>
                {user.fantasy_total && (
                  <p className="text-sm text-lightPurple">
                    Fantasy Total Points: {user.fantasy_total}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FootballLeaderboardComponent;
