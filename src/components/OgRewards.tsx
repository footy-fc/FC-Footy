/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { parseEther, formatEther } from "viem";
import { config } from "~/components/providers/WagmiProvider";
import { waitForTransactionReceipt } from "wagmi/actions";
import { FOOTY_SCORES_CLAIM_ABI } from "~/constants/contracts";
import { useSendTransaction } from "wagmi";
import { getDataSuffix, submitReferral } from "@divvi/referral-sdk";

import { encodeFunctionData } from "viem";
import toast from "react-hot-toast";

const FOOTY_SCORES_CLAIM_ADDRESS = "0x727556f2aff622797228cc80cf6af46b10ad126e" as `0x${string}`;

export default function OgRewards() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "confirmed" | "failed">("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
    const { sendTransactionAsync } = useSendTransaction();


  // Fetch eligibility status
  const { data: isEligible, isLoading: isEligibilityLoading } = useReadContract({
    address: FOOTY_SCORES_CLAIM_ADDRESS,
    abi: FOOTY_SCORES_CLAIM_ABI,
    functionName: "isEligible",
    args: [address],
  });

  // Fetch claimable amount
  const { data: claimableAmount, isLoading: isAmountLoading } = useReadContract({
    address: FOOTY_SCORES_CLAIM_ADDRESS,
    abi: FOOTY_SCORES_CLAIM_ABI,
    functionName: "getClaimableAmount",
    args: [address],
  });

  const handleClaimTokens = async () => {
    if (!address || !isEligible) {
      toast.error("Wallet not connected or not eligible");
      return;
    }

    setIsSubmitting(true);
    setTxStatus("pending");

    try {
      // Get Divvi referral data suffix
      let dataSuffix;
      try {
        dataSuffix = getDataSuffix({
          consumer: "0xC5337CeE97fF5B190F26C4A12341dd210f26e17c", 
          providers: [
            "0x0423189886d7966f0dd7e7d256898daeee625dca",
            "0xc95876688026be9d6fa7a7c33328bd013effa2bb",
          ],
        });
      } catch (diviError) {
        console.error("Divvi getDataSuffix error:", diviError);
        throw new Error("Failed to generate referral data");
      }

      const contractData = encodeFunctionData({
        abi: FOOTY_SCORES_CLAIM_ABI,
        functionName: "claimTokens",
        args: [],
      });

      const finalData = dataSuffix ? contractData + dataSuffix : contractData;

      const hash = await sendTransactionAsync({
        to: FOOTY_SCORES_CLAIM_ADDRESS,
        data: finalData as `0x${string}`,
      });

      setTxHash(hash);

      // Report to Divvi
      try {
        await submitReferral({
          txHash: hash,
          chainId: publicClient?.chain.id || 42220, // Use current chain or fallback to Celo mainnet
        });
      } catch (diviError) {
        console.error("Divvi submitReferral error:", diviError);
      }

      await waitForTransactionReceipt(config, { hash });
      setTxStatus("confirmed");
      setTimeout(() => setTxStatus("idle"), 5000);
    } catch (err) {
      console.error("Claim failed", err);
      setTxStatus("failed");
      toast.error(err instanceof Error ? err.message : "Failed to claim tokens");
      setTimeout(() => setTxStatus("idle"), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-purplePanel rounded shadow-md max-w-4xl mx-auto p-4">
      <h2 className="text-xl text-notWhite font-bold mb-4">OG Rewards</h2>
      <div className="bg-gray-800/70 rounded-lg shadow-lg p-4 border border-gray-700">
        {!address ? (
          <p className="text-sm text-lightPurple">Please connect your wallet to check and claim rewards.</p>
        ) : isEligibilityLoading || isAmountLoading ? (
          <p className="text-sm text-lightPurple">Checking eligibility...</p>
        ) : !isEligible ? (
          <p className="text-sm text-lightPurple">
            Your address is not eligible for OG Rewards at this time.
          </p>
        ) : (
          <>
            <p className="text-sm text-notWhite mb-2">
              You are eligible to claim{" "}
              <span className="font-semibold">
                {typeof claimableAmount === "bigint" ? formatEther(claimableAmount) : "0"} $SCORES
              </span>
              !
            </p>
            
            <div className="bg-purple-900/30 rounded-md p-3 mb-4 border border-purple-700">
              <h3 className="text-notWhite font-medium mb-1">Why Hold $SCORES?</h3>
              <p className="text-xs text-lightPurple">
                $SCORES are your permanent, onchain fan credentials. Early supporters get more benefits as the community grows. 
                Use them for Fantasy Leagues, ScoreSquare games, and exclusive features. 
                The supply will be frozen before World Cup 2026 - claim yours now and be part of football&apos;s future!
              </p>
            </div>

            <button
              onClick={handleClaimTokens}
              disabled={isSubmitting || !isEligible}
              className={`w-full mt-4 py-2 px-4 rounded transition-colors ${
                txStatus === "pending" || isSubmitting
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-deepPink text-white hover:bg-fontRed"
              }`}
            >
              {txStatus === "pending"
                ? "Waiting for confirmation..."
                : txStatus === "confirmed"
                ? "Claimed ✅"
                : txStatus === "failed"
                ? "Failed ❌ — Try again"
                : "Claim $SCORES"}
            </button>

            {txHash && (
              <p className="text-xs text-lightPurple mt-2">
                Transaction: {txHash.slice(0, 6)}...{txHash.slice(-4)}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}