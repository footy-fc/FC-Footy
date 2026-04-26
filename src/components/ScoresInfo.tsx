'use client';

import React from 'react';

interface ScoresInfoProps {
  className?: string;
  defaultOpen?: boolean;
  onClose?: () => void;
}

const ScoresInfo: React.FC<ScoresInfoProps> = ({ className = '', defaultOpen, onClose }) => {
  return (
    <div className={`relative ${className}`}>
      {!defaultOpen && (
        <button
          onClick={() => {}}
          className="flex items-center gap-1 px-1 py-4.5 text-fontRed rounded-full text-sm font-medium transition-colors shadow-md"
          aria-label="Open user guide"
        >
          <span aria-hidden="true">?</span>
        </button>
      )}

      {defaultOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white"></h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close guide">
                  Close
                </button>
              </div>

              <div className="space-y-6 text-lightPurple">
                <div>
                  <h3 className="text-lg font-semibold text-notWhite mb-2">What Are SCORES points?</h3>
                  <p>SCORES are legacy Footy points used by older gated flows.</p>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white">1</div>
                  <div>
                    <h4 className="font-semibold text-notWhite">Legacy system</h4>
                    <p className="text-sm">The original onchain points and purchase mechanics are no longer active in the reduced Footy app.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white">2</div>
                  <div>
                    <h4 className="font-semibold text-notWhite">Feature gating removed</h4>
                    <p className="text-sm">Current mini-app flows should not depend on Juice-era issuance, countdowns, or split-hook configuration.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white">3</div>
                  <div>
                    <h4 className="font-semibold text-notWhite">Future rebuild</h4>
                    <p className="text-sm">If points return, they should be reintroduced with a simpler stack that matches the current Footy product.</p>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center mt-4 space-y-2">
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoresInfo;
