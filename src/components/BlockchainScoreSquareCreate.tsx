/* eslint-disable */

import React from "react";
import { useAccount, useConnect } from "wagmi";
import BlockchainScoreSquare from "./BlockchainScoreSquareCreateDetails";

const BlockchainScoreSquareCreate: React.FC = () => {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();

  return (
    <div className="rounded shadow-md max-w-4xl mx-auto p-4">
      {isConnected ? (
        <div>
          <BlockchainScoreSquare home="" away="" sportId="eng.1" onGameCreated={() => {}} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => connect({ connector: connectors[0] })}
          className="px-4 py-2 bg-deepPink text-white rounded hover:bg-fontRed"
        >
          Connect
        </button>
      )}
      <div className="mt-6 text-center text-xs text-gray-400">
        <p>All games are stored on the Base blockchain.</p>
        <p>
          Contract:{" "}
          <a
            href="https://basescan.org/address/0x6147b9AB63496aCE7f3D270F8222e09038FD0870"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-500"
          >
            0x6147b9AB63496aCE7f3D270F8222e09038FD0870
          </a>
        </p>
      </div>
    </div>
  );
};

export default BlockchainScoreSquareCreate;
