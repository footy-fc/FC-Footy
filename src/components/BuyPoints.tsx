import React from "react";

export default function BuyPoints() {
  return (
    <div className="bg-purplePanel rounded shadow-md max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl text-notWhite font-bold">Participate in Footy App</h2>
      </div>
      <div className="bg-gray-800/70 rounded-lg shadow-lg p-4 border border-gray-700 mt-2">
        <div className="text-sm text-lightPurple space-y-3">
          <p>The legacy SCORES purchase flow has been removed from the reduced Footy app.</p>
          <p>This screen remains only as a placeholder for older links that still point to the retired purchase flow.</p>
          <p className="text-xs text-gray-400">
            If paid features return, they should be rebuilt on the current stack rather than the removed Juice integration.
          </p>
        </div>
      </div>
    </div>
  );
}
