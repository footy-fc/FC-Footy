import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import { Database } from '../../../supabase';

const supabaseApiKey = process.env.NEXT_PUBLIC_API_SUP || '';

const supabase = createClient<Database>(
  'https://tjftzpjqfqnbtvodsigk.supabase.co',
  supabaseApiKey
);

interface TeamInfo {
  name: string | null;
  logo: string | null;
}

// Define FantasyEntry type to match the expected data structure
interface FantasyEntry {
  pfp: string | null;
  team: { name: string | null; logo: string | null };
  manager: string;
  entry_name: string | null;
  rank: number | null;
  last_name: string | null;
  fav_team: number | null;
  total: number | null;
  location: string | null;
  fid: number | null;
}

export const fetchFantasyData = async (): Promise<FantasyEntry[]> => {

  try {
    // Query Supabase 'standings' table
    const { data, error } = await supabase
      .from('standings')
      .select('entry_name, rank, last_name, fav_team, total');

    if (error) {
      throw error;
    }

    // Step 1: Fetch additional data (profile, team info) concurrently
    const updatedFantasyData = await Promise.all(
      data.map(async (entry: { entry_name: string | null; rank: number | null; last_name: string | null; fav_team: number | null; total: number | null; }) => {
        const { last_name, fav_team } = entry;
        let pfpUrl = '/defifa_spinner.gif';
        let username = 'anon';
        let location = 'Unknown';
        let fid: number | null = null;

        // Handle last_name being a valid number (fid)
        if (last_name && !isNaN(Number(last_name))) {
          fid = parseInt(last_name, 10);

          if (Number.isInteger(fid)) {
            const server = "https://hub.merv.fun";
            try {
              // Fetch user data by fid
              const response = await axios.get(`${server}/v1/userDataByFid?fid=${fid}`, {
              });

              // Extract profile image, username, and location from response
              const messages = response.data.messages || [];
              for (const message of messages) {
                if (message.data?.userDataBody?.type === 'USER_DATA_TYPE_PFP') {
                  pfpUrl = message.data.userDataBody.value;
                }
                if (message.data?.userDataBody?.type === 'USER_DATA_TYPE_USERNAME') {
                  username = message.data.userDataBody.value;
                }
                if (message.data?.userDataBody?.type === 'USER_DATA_TYPE_LOCATION') {
                  location = message.data.userDataBody.value;
                }
              }
            } catch (e) {
              console.error("Error fetching user data for fid:", fid, e);
            }
          }
        }

        let teamInfo: TeamInfo = { name: null, logo: null };

        // console.log(`Processing entry - fav_team: ${fav_team}, manager: ${username}`); // Debugging

        // Ensure only valid fav_team values trigger the lookup
        if (typeof fav_team === "number" && fav_team > 0) {  
          // console.log(`Fetching team data for fav_team: ${fav_team}`); // Debugging

          const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('name, logo')
            .eq('id', fav_team)
            .single();

            if (!teamError && teamData) {
              // Make sure teamData matches the expected TeamInfo type
              teamInfo = teamData as TeamInfo;
            } else {
              console.error("Error fetching team data", teamError);
            }
        }

        return {
          ...entry,
          pfp: pfpUrl,  // Ensure pfp has a fallback
          team: teamInfo,  // Ensure team info is always provided
          manager: username,  // Ensure manager has a fallback
          location: location,  // Location from geo lookup
          fid: fid // Include FID explicitly
        };
      })
    );

    return updatedFantasyData; // Return the updated data array
  } catch (err) {
    console.error("Error fetching fantasy data:", err);
    throw new Error('Failed to fetch fantasy data');
  }
};
