import React from 'react';
import { sdk } from '@farcaster/frame-sdk';

const OCaptainFPLPrompt: React.FC = () => {
  const handleOCaptainClick = async () => {
    try {
      await sdk.haptics.impactOccurred('medium');
    } catch {
      // ignore haptics errors
    }
    
    // Navigate to O'Captain tab
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'oCaptain');
    window.history.pushState({}, '', url.toString());
    window.location.reload();
  };

  return (
    <div className="bg-purplePanel p-4 rounded-lg">
      <h3 className="text-lightPurple font-semibold mb-2">O&apos;Captain Challenge</h3>
      <p className="text-gray-400 text-sm mb-3">
        Select your captain and vice-captain from the best players in the league. 
        Stake USDC and compete for prizes!
      </p>
      <button
        onClick={handleOCaptainClick}
        className="w-full bg-limeGreenOpacity text-darkPurple py-2 px-4 rounded-lg font-semibold hover:bg-limeGreenOpacity/80 transition-colors"
      >
        Play O&apos;Captain
      </button>
    </div>
  );
};

export default OCaptainFPLPrompt;
