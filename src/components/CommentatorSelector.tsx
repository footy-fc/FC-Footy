import React from 'react';
import { Commentator } from '~/types/commentatorTypes';

interface CommentatorSelectorProps {
  commentators: Commentator[];
  selectedCommentator: string;
  onCommentatorChange: (commentatorId: string) => void;
}

export const CommentatorSelector: React.FC<CommentatorSelectorProps> = ({
  commentators,
  selectedCommentator,
  onCommentatorChange
}) => {

  return (
    <div className="bg-purplePanel rounded-lg p-4 border border-limeGreenOpacity/20">
      <h3 className="text-lg font-bold text-notWhite mb-3">🎤 Choose Your Commentator</h3>
      <div className="grid grid-cols-1 gap-2">
        {commentators.map((commentator) => (
          <button
            key={commentator.id}
            onClick={() => onCommentatorChange(commentator.id)}
            className={`p-3 rounded-lg border transition-all text-left ${
              selectedCommentator === commentator.id
                ? 'border-limeGreenOpacity bg-limeGreenOpacity/10'
                : 'border-limeGreenOpacity/20 bg-darkPurple hover:border-limeGreenOpacity/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-notWhite">{commentator.name}</h4>
                <p className="text-sm text-lightPurple">{commentator.description}</p>
                <span className={`inline-block px-2 py-1 rounded text-xs mt-1 ${
                  commentator.style === 'dramatic' ? 'bg-red-500/20 text-red-300' :
                  commentator.style === 'enthusiastic' ? 'bg-yellow-500/20 text-yellow-300' :
                  commentator.style === 'analytical' ? 'bg-blue-500/20 text-blue-300' :
                  'bg-green-500/20 text-green-300'
                }`}>
                  {commentator.style}
                </span>
              </div>
              {selectedCommentator === commentator.id && (
                <div className="text-limeGreenOpacity">✓</div>
              )}
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Your choice will be used for all match commentary generation.
      </p>
    </div>
  );
};
