/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { parseEther, formatEther } from "viem";
import { config } from "~/components/providers/WagmiProvider";
import { waitForTransactionReceipt } from "wagmi/actions";
import { FOOTY_SCORES_CLAIM_ABI } from "~/constants/contracts";


// Replace with your deployed contract address
const FOOTY_SCORES_CLAIM_ADDRESS = "0x727556f2aff622797228cc80cf6af46b10ad126e" as `0x${string}`;

export default function OgRewards() {
  const { address } = useAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "confirmed" | "failed">("idle");

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

  const { writeContractAsync } = useWriteContract();

  const handleClaimTokens = async () => {
    if (!address || !isEligible) return;

    setIsSubmitting(true);
    setTxStatus("pending");

    try {
      const txHash = await writeContractAsync({
        address: FOOTY_SCORES_CLAIM_ADDRESS,
        abi: FOOTY_SCORES_CLAIM_ABI,
        functionName: "claimTokens",
      });

      await waitForTransactionReceipt(config, { hash: txHash });
      setTxStatus("confirmed");
      setTimeout(() => setTxStatus("idle"), 5000);
    } catch (err) {
      console.error("Claim failed", err);
      setTxStatus("failed");
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
          </>
        )}
      </div>
    </div>
  );
}