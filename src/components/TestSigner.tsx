import React, { useState } from "react";
import { usePrivy, useLogin, useFarcasterSigner } from "@privy-io/react-auth";
import { ExternalEd25519Signer, HubRestAPIClient } from "@standard-crypto/farcaster-js";

const TestSubmitCast = () => {
  const { authenticated, user } = usePrivy();
  const { login } = useLogin();
  const { getFarcasterSignerPublicKey, signFarcasterMessage, requestFarcasterSignerFromWarpcast } = useFarcasterSigner();

  const [status, setStatus] = useState<"idle" | "posting" | "success" | "error">("idle");

  const handleSubmit = async () => {
    if (!authenticated) {
      login();
      return;
    }

    const farcasterAccount = user?.linkedAccounts.find((account) => account.type === "farcaster");
    if (!farcasterAccount?.signerPublicKey) {
      console.error("Farcaster signer not authorized yet");
      await requestFarcasterSignerFromWarpcast();
      return;
    }

    const fid = user?.farcaster?.fid;
    if (!fid) {
      console.error("FID is undefined, cannot submit cast");
      return;
    }

    const signer = new ExternalEd25519Signer(signFarcasterMessage, getFarcasterSignerPublicKey);

    const client = new HubRestAPIClient({
      hubUrl: "https://snapchain.pinnable.xyz",// 3381 http 3383 grpc
    }); //https://snapchain.pinnable.xyz  https://crackle.farcaster.xyz:3383

    const message = "This is a test cast.";
    setStatus("posting");

    try {
      console.log("Submitting test cast with", { message, fid, signer });
      const response = await client.submitCast({ text: message, embeds: [] }, fid, signer);
      console.log("Test cast submitted successfully:", response);
      setStatus("success");
    } catch (error) {
      console.error("Error submitting test cast:", error);
      setStatus("error");
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={handleSubmit}
        className="bg-purple-600 text-white font-bold py-2 px-4 rounded disabled:opacity-60"
        disabled={status === "posting"}
      >
        {status === "idle" && "Send Test Cast"}
        {status === "posting" && "Posting..."}
        {status === "success" && "✅ Sent!"}
        {status === "error" && "❌ Failed. Try again?"}
      </button>
    </div>
  );
};

export default TestSubmitCast;