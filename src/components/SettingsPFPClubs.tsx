"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { usePrivy, useFarcasterSigner } from "@privy-io/react-auth";
import Image from "next/image";
import { fetchTeamLogos } from "./utils/fetchTeamLogos";
import { getTeamPreferences } from "../lib/kvPerferences";
import * as Account from "fhub/Account";
import { useUserUpdateMutation } from "~/hooks/fhub/useUserUpdateMutation";
import { sdk as frameSdk } from "@farcaster/miniapp-sdk";
import toast, { Toaster } from "react-hot-toast";
import { Rnd } from "react-rnd";

interface Team {
  name: string;
  abbreviation: string;
  league: string;
  logoUrl: string;
}

interface SettingsPFPClubsProps {
  onTabChange: (tab: string) => void;
}

const getTeamId = (team: Team) => `${team.league}-${team.abbreviation}`;
// Fallback image if no team logo is available.
const defaultLogoUrl = "/defifa_spinner.gif";

const SettingsPFPClubs: React.FC<SettingsPFPClubsProps> = ({ onTabChange }) => {
  // FHub update mutation.
  const userUpdateMutation = useUserUpdateMutation();
  const { getFarcasterSignerPublicKey, signFarcasterMessage: signFarcasterMessage } =
    useFarcasterSigner();
  const { user } = usePrivy();
  const { requestFarcasterSignerFromWarpcast } = useFarcasterSigner();
  const farcasterAccount = user?.linkedAccounts.find(
    (account) => account.type === "farcaster"
  );

  // --- Favorite Team State ---
  const [teams, setTeams] = useState<Team[]>([]);
  const [favTeams, setFavTeams] = useState<string[]>([]);
  useEffect(() => {
    if (farcasterAccount) {
      const fid = Number(farcasterAccount.fid);
      getTeamPreferences(fid)
        .then((teamsFromRedis) => {
          // console.log("Existing team preferences:", teamsFromRedis);
          if (teamsFromRedis) {
            setFavTeams(teamsFromRedis);
          }
        })
        .catch((err) =>
          console.error("Error fetching team preferences:", err)
        );
    }
    fetchTeamLogos().then((data) => setTeams(data));
  }, [farcasterAccount]);

  // --- PFP Editing State ---
  const [color] = useState<string>("original");
  const [renderedSrc, setRenderedSrc] = useState<string>(
    user?.farcaster?.pfp || defaultLogoUrl
  );
  // Club sticker is active by default.
  const [footyClubSticker, setFootyClubSticker] = useState({
    visible: true,
    x: 20,
    y: 140,
    width: 100,
    height: 100,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const colorFilters: Record<string, string> = {
    original: "none",
    red: "grayscale(1) sepia(1) saturate(5000%) hue-rotate(0deg)",
    green: "grayscale(1) sepia(1) saturate(5000%) hue-rotate(100deg)",
    blue: "grayscale(1) sepia(1) saturate(5000%) hue-rotate(200deg)",
  };

  // Compute favorite team.
  const favTeamObj =
    favTeams.length > 0
      ? teams.find((team) => getTeamId(team) === favTeams[0])
      : null;
  const favoriteTeamName =
    favTeams.length > 0
      ? favTeamObj
        ? favTeamObj.name
        : favTeams[0]
      : "Default Team";

  useEffect(() => {
    async function renderFinalImage() {
      try {
        // console.log("Applying filter...");
        if (!user?.farcaster?.pfp) throw new Error("No PFP URL found");
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.src = user.farcaster.pfp;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = (err) => reject(err);
        });

        let sx = 0,
          sy = 0,
          sSize = 0;
        if (img.naturalWidth >= img.naturalHeight) {
          sSize = img.naturalHeight;
          sx = (img.naturalWidth - sSize) / 2;
        } else {
          sSize = img.naturalWidth;
          sy = (img.naturalHeight - sSize) / 2;
        }
        const canvas = document.createElement("canvas");
        canvas.width = sSize;
        canvas.height = sSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get 2D context");

        ctx.filter = colorFilters[color];
        ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, sSize, sSize);

        if (footyClubSticker.visible && containerRef.current) {
          const footyImg = new window.Image();
          footyImg.crossOrigin = "anonymous";
          // Use the favorite team's logo URL if available.
          footyImg.src = favTeamObj?.logoUrl || defaultLogoUrl;
          await new Promise<void>((resolve, reject) => {
            footyImg.onload = () => resolve();
            footyImg.onerror = (err) => reject(err);
          });
          const rect = containerRef.current.getBoundingClientRect();
          const factor = sSize / rect.width;
          ctx.drawImage(
            footyImg,
            footyClubSticker.x * factor,
            footyClubSticker.y * factor,
            footyClubSticker.width * factor,
            footyClubSticker.height * factor
          );
        }

        const dataUrl = canvas.toDataURL("image/png");
        setRenderedSrc(dataUrl);
      } catch (err) {
        console.error(err);
        toast.error(
          `Error rendering image: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
    void renderFinalImage();
  }, [color, user?.farcaster?.pfp, footyClubSticker, favTeamObj]);

  // setPfp uses FHub's update mutation.
  const setPfp = useCallback(async () => {
    const toastId = toast.loading("Setting new profile picture...");
    try {
      const response = await fetch("https://images.colorino.site/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: renderedSrc }),
      });
      // console.log("Response:", response);
      if (!response.ok)
        throw new Error(`Upload failed: ${response.statusText}`);
      const json = await response.json();
      const imageUrl = `https://images.colorino.site/${json.hash}.png`;
      const fid = farcasterAccount ? Number(farcasterAccount.fid) : 0;
      // console.log("Setting PFP to:", imageUrl, " for FID: ", fid);
      const signer = {
        getSignerKey: getFarcasterSignerPublicKey,
        signMessageHash: (messageHash: Uint8Array) =>
          signFarcasterMessage(messageHash),
      };
      userUpdateMutation.mutate({
        account: Account.fromEd25519Signer({
          fid: BigInt(fid),
          signer,
        }),
        data: { type: "pfp", value: imageUrl },
      });
      toast.dismiss(toastId);
    } catch (error) {
      console.error("Error setting profile picture:", error);
      toast.error(
        `Error setting profile picture: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      toast.dismiss(toastId);
    }
  }, [
    renderedSrc,
    farcasterAccount,
    userUpdateMutation,
    getFarcasterSignerPublicKey,
    signFarcasterMessage,
  ]);

  let mainContent;
  if (!user?.farcaster?.fid) {
    mainContent = (
      <div>
        Oops! It looks like you aren&apos;t using this website in a Farcaster frame! Please{" "}
        <a href="https://warpcast.com/warpcastadmin.eth/0x696df624">open it in a frame</a>.
      </div>
    );
  } else if (favTeams.length === 0) {
    mainContent = (
      <>
        <div className="mb-4 text-center text-notWhite font-semibold">
          You have not set a favorite team yet.
        </div>
        <button
          onClick={() => onTabChange("followClubs")}
          className="mb-3 flex items-center text-sm text-fontRed hover:underline focus:outline-none"
        >
          Follow your favorite team first
        </button>
      </>
    );
  } else {
    mainContent = (
      <>
        {/* Favorite Team Section */}
        <div className="mb-4 text-center text-notWhite font-semibold">
          Favorite Team: {favoriteTeamName}{" "}
          <Image
            src={favTeamObj?.logoUrl || defaultLogoUrl}
            alt={favTeamObj?.name || "Default Team Logo"}
            width={30}
            height={30}
            className="inline-block ml-2"
          />
        </div>
        {/* PFP Editing Section */}
        <div className="container prose mx-auto max-w-prose p-5">
          <div
            ref={containerRef}
            className="relative inline-block overflow-hidden"
            style={{ marginTop: "1rem" }}
          >
            <img
              className="aspect-square w-full object-cover"
              src={renderedSrc}
              alt="Filtered PFP"
            />
            {footyClubSticker.visible && (
              <Rnd
                lockAspectRatio
                size={{
                  width: footyClubSticker.width,
                  height: footyClubSticker.height,
                }}
                position={{
                  x: footyClubSticker.x,
                  y: footyClubSticker.y,
                }}
                style={{ border: "2px dashed #000" }}
                resizeHandleStyles={{
                  top: { background: "#fff", border: "1px solid #000" },
                  right: { background: "#fff", border: "1px solid #000" },
                  bottom: { background: "#fff", border: "1px solid #000" },
                  left: { background: "#fff", border: "1px solid #000" },
                  topLeft: { background: "#fff", border: "1px solid #000" },
                  topRight: { background: "#fff", border: "1px solid #000" },
                  bottomLeft: { background: "#fff", border: "1px solid #000" },
                  bottomRight: { background: "#fff", border: "1px solid #000" },
                }}
                onDragStop={(e, d) =>
                  setFootyClubSticker((prev) => ({ ...prev, x: d.x, y: d.y }))
                }
                onResizeStop={(e, direction, ref, delta, position) =>
                  setFootyClubSticker({
                    x: position.x,
                    y: position.y,
                    width: ref.offsetWidth,
                    height: ref.offsetHeight,
                    visible: true,
                  })
                }
              >
                <img
                  src={favTeamObj?.logoUrl || defaultLogoUrl}
                  alt={favTeamObj?.name || "Default Team Logo"}
                  style={{
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                  }}
                />
              </Rnd>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {farcasterAccount && !farcasterAccount.signerPublicKey ? (
              <button
                onClick={() => requestFarcasterSignerFromWarpcast()}
                className="w-full sm:w-38 bg-deepPink text-white py-2 px-4 rounded-lg transition-colors hover:bg-fontRed"
              >
                Authorize pfp update
              </button>
            ) : (
              <button
                onClick={setPfp}
                className="w-full sm:w-38 bg-deepPink text-white py-2 px-4 rounded-lg transition-colors hover:bg-fontRed"
              >
                Update profile pic
              </button>
            )}
            <button
              className="text-sm"
              onClick={() =>
                frameSdk.actions.viewProfile({ fid: 1356 })
              }
            >
              Follow @warpcastadmin.eth they did the heavy lifting on this!
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto">
      <Toaster />
      {mainContent}
    </div>
  );
};

export default SettingsPFPClubs;
