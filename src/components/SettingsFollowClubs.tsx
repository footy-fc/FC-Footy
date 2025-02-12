"use client";

import React, { useState, useEffect } from "react";
import { useFarcasterSigner, usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import { fetchTeamLogos } from "./utils/fetchTeamLogos";
import {
  getTeamPreferences,
  setTeamPreferences,
} from "../lib/kvPerferences";
import * as Account from "fhub/Account";
import { useUserUpdateMutation } from "~/hooks/fhub/useUserUpdateMutation";
import uploadFilesToIPFS from "./utils/pinToIPFS";
import userProfileTemplate from "../lib/profileMetaData";
import { fetchFanUserData } from "../components/utils/fetchFCProfile";

// Define interfaces for team and user profile data.
// (Adjust or extend these interfaces as needed based on your actual schema.)
interface Team {
  name: string;
  abbreviation: string;
  league: string;
  logoUrl: string;
}

interface AppData {
  name: string;
  value: any;
}

interface App {
  appName: string;
  domain: string;
  data: AppData[];
}

interface UserProfile {
  FID: string;
  version: string;
  schemaVersion: string;
  userName: string;
  personalInfo: any;
  apps: App[];
}

// We'll use UserProfile as our profile type from IPFS.
const getTeamId = (team: Team) => `${team.league}-${team.abbreviation}`;

// Define the key that holds the URL in the IPFS data.
const USER_DATA_TYPE_URL = "USER_DATA_TYPE_URL";

const Settings = () => {
  const userUpdateMutation = useUserUpdateMutation();
  const { getFarcasterSignerPublicKey, signMessageHash: signFarcasterMessage } = useFarcasterSigner();
  const [teams, setTeams] = useState<Team[]>([]);
  const [favTeams, setFavTeams] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loadingTeamIds, setLoadingTeamIds] = useState<string[]>([]);
  // userProfile holds the backup profile fetched from IPFS.
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { user } = usePrivy();
  const farcasterAccount = user?.linkedAccounts.find(
    (account) => account.type === "farcaster"
  );

  useEffect(() => {
    const fetchData = async () => {
      if (farcasterAccount) {
        try {
          const fid = Number(farcasterAccount.fid);
          // Fetch favorite teams from the KV database (source of truth)
          const teamsFromRedis = await getTeamPreferences(fid);
          console.log("Existing team preferences:", teamsFromRedis);
          if (teamsFromRedis) {
            setFavTeams(teamsFromRedis);
            // Fetch backup profile data from IPFS
            const ipfsProfile = await fetchFanUserData(Number(farcasterAccount.fid));
            // Assume fetchFanUserData returns a full UserProfile object.
            console.log("IPFS profile data:", ipfsProfile);
            setUserProfile(ipfsProfile);
          }
        } catch (err) {
          console.error("Error fetching team preferences or user data:", err);
        }
      }
      // Fetch team logos
      try {
        const logos = await fetchTeamLogos();
        setTeams(logos);
      } catch (err) {
        console.error("Error fetching team logos:", err);
      }
    };

    fetchData();
  }, [farcasterAccount]);

  const handleRowClick = async (team: Team) => {
    if (!farcasterAccount) {
      console.error("User not authenticated");
      return;
    }
    const teamId = getTeamId(team);
    const fid = Number(farcasterAccount.fid);

    // Prevent concurrent updates.
    if (loadingTeamIds.length > 0) return;
    setLoadingTeamIds((prev) => [...prev, teamId]);

    let updatedFavTeams: string[];

    if (favTeams.includes(teamId)) {
      console.log(`Removing ${team.name} (${teamId}) from notifications`);
      updatedFavTeams = favTeams.filter((id) => id !== teamId);
    } else {
      console.log(`Adding ${team.name} (${teamId}) as favorite`);
      updatedFavTeams = [...favTeams, teamId];

      // Pin the updated favorite team to IPFS (this is our backup)
      // Here we pass a URL representing the favorite team backup.
      const cid = await uploadFilesToIPFS("https://defifa.net");
      console.log("IPFS CID:", cid);
      console.log("userProfile", userProfile);
      // Update the backup profile in IPFS with the new favorite team CID.
      if (userProfile) {
        // Ensure the apps array exists.
        if (!userProfile.apps) {
          userProfile.apps = [];
        }
        // Look for an existing "fc-footy" app.
        let fcFootyApp = userProfile.apps.find((app) => app.appName === "fc-footy");

        if (fcFootyApp) {
          // Look for an existing USER_DATA_TYPE_URL entry.
          const urlDataIndex = fcFootyApp.data.findIndex(
            (item) => item.name === USER_DATA_TYPE_URL
          );
          if (urlDataIndex !== -1) {
            // Update the URL with the new CID.
            fcFootyApp.data[urlDataIndex].value = `https://ipfs.io/ipfs/${cid}`;
          } else {
            // Add a new entry if not present.
            fcFootyApp.data.push({
              name: USER_DATA_TYPE_URL,
              value: `https://ipfs.io/ipfs/${cid}`,
            });
          }
        } else {
          // If the fc-footy app doesn't exist, create a new app object.
          const newApp: App = {
            appName: "fc-footy",
            domain: "fc-footy.example.com",
            data: [
              {
                name: USER_DATA_TYPE_URL,
                value: `https://ipfs.io/ipfs/${cid}`,
              },
            ],
          };
          userProfile.apps.push(newApp);
        }

        // Execute the mutation to update the backup profile with the new URL.
        userUpdateMutation.mutate({
          account: Account.fromEd25519Signer({
            fid: BigInt(fid),
            signer: {
              getSignerKey: getFarcasterSignerPublicKey,
              signMessageHash: signFarcasterMessage,
            },
          }),
          data: {
            type: "url",
            value: `https://ipfs.io/ipfs/${cid}/well-known/farcaster-preferences.json`,
          },
        });
      } else {
        // If no profile was fetched from IPFS, use the template.
        let newUserProfile: UserProfile = { ...userProfileTemplate };
        // Ensure the apps array exists.
        if (!newUserProfile.apps) {
          newUserProfile.apps = [];
        }
        const newApp: App = {
          appName: "fc-footy",
          domain: "fc-footy.example.com",
          data: [
            {
              name: USER_DATA_TYPE_URL,
              value: `https://ipfs.io/ipfs/${cid}/well-known/farcaster-preferences.json`,
            },
          ],
        };
        newUserProfile.apps.push(newApp);
        setUserProfile(newUserProfile);
        userUpdateMutation.mutate({
          account: Account.fromEd25519Signer({
            fid: BigInt(fid),
            signer: {
              getSignerKey: getFarcasterSignerPublicKey,
              signMessageHash: signFarcasterMessage,
            },
          }),
          data: {
            type: "url",
            value: `https://ipfs.io/ipfs/${cid}/well-known/farcaster-preferences.json`,
          },
        });
      }
    }

    // Update the favorite teams in the KV database (source of truth).
    await setTeamPreferences(fid, updatedFavTeams);
    setFavTeams(updatedFavTeams);

    // Remove the team from the loading state.
    setLoadingTeamIds((prev) => prev.filter((id) => id !== teamId));

    // Clear the search term if present.
    if (searchTerm.trim() !== "") {
      setSearchTerm("");
    }
  };

  // Filter and order teams based on the search term and favorite teams.
  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const orderedTeams =
    searchTerm.trim() === ""
      ? [...filteredTeams].sort((a, b) => {
          const aFav = favTeams.includes(getTeamId(a));
          const bFav = favTeams.includes(getTeamId(b));
          if (aFav === bFav) return 0;
          return aFav ? -1 : 1;
        })
      : filteredTeams;

  const favTeamObj =
    favTeams.length > 0
      ? teams.find((team) => getTeamId(team) === favTeams[0])
      : null;

  return (
    <div className="w-full h-full overflow-y-auto">
      {favTeams.length > 0 && (
        <div className="mb-2 text-center text-notWhite font-semibold">
          Favorite Team: {favTeamObj ? favTeamObj.name : favTeams[0]}{" "}
          {favTeamObj && (
            <Image
              src={favTeamObj.logoUrl}
              alt={favTeamObj.name}
              width={30}
              height={30}
              className="inline-block ml-2"
            />
          )}
        </div>
      )}

      {/* Search Input */}
      <div className="mb-4 w-full">
        <input
          type="text"
          placeholder="Search clubs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-darkPurple p-2 border rounded-md border-limeGreenOpacity focus:outline-none focus:ring-2 focus:ring-darkPurple"
        />
      </div>

      {/* Teams Table */}
      <div className="w-full h-[500px] overflow-y-auto">
        <table className="w-full bg-darkPurple">
          {favTeams.length === 0 && (
            <thead className="bg-darkPurple">
              <tr className="text-fontRed text-center border-b border-limeGreenOpacity">
                <th className="py-1 text-left font-medium">
                  Select clubs to get notifications
                </th>
                <th className="py-1 text-center font-medium"></th>
                <th className="py-1 text-right font-medium"></th>
              </tr>
            </thead>
          )}
          <tbody>
            {orderedTeams.map((team) => {
              const teamId = getTeamId(team);
              const isLoading = loadingTeamIds.includes(teamId);
              return (
                <tr
                  key={teamId}
                  onClick={() => {
                    if (!isLoading && loadingTeamIds.length === 0) {
                      handleRowClick(team);
                    }
                  }}
                  className={`hover:bg-purplePanel transition-colors text-lightPurple text-sm cursor-pointer ${
                    favTeams.includes(teamId) ? "bg-purplePanel" : ""
                  }`}
                >
                  <td className="py-1 px-4 border-b border-limeGreenOpacity text-left">
                    <div className="flex items-center space-x-2">
                      <span>{team.name}</span>
                      {favTeams.includes(teamId) && (
                        <span role="img" aria-label="notification" className="ml-2">
                          🔔
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-1 px-4 border-b border-limeGreenOpacity text-center">
                    {isLoading ? (
                      <Image
                        src="/defifa_spinner.gif"
                        alt="loading"
                        width={30}
                        height={30}
                      />
                    ) : (
                      <Image
                        src={team.logoUrl}
                        alt={team.name}
                        width={30}
                        height={30}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Settings;
