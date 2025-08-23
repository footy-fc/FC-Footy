import { useState, useEffect, useCallback } from 'react';
import { MatchEvent } from '~/types/commentatorTypes';
import { commentatorFactory } from '~/services/CommentatorFactory';

export function useCommentator() {
  const [selectedCommentator, setSelectedCommentator] = useState<string>('peter-drury');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commentators = commentatorFactory.getAllCommentators();
  const currentCommentator = commentatorFactory.getCommentator(selectedCommentator);

  const generateCommentary = useCallback(async (matchEvent: MatchEvent): Promise<string> => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const commentary = await commentatorFactory.generateCommentary(selectedCommentator, matchEvent);
      return commentary;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate commentary';
      setError(errorMessage);
      return '';
    } finally {
      setIsGenerating(false);
    }
  }, [selectedCommentator]);

  const switchCommentator = useCallback((commentatorId: string) => {
    if (commentatorFactory.getCommentator(commentatorId)) {
      setSelectedCommentator(commentatorId);
      commentatorFactory.setUserPreference(commentatorId);
    }
  }, []);

  useEffect(() => {
    // Load user preference on mount
    const userPreference = commentatorFactory.getUserPreference();
    if (userPreference && userPreference !== selectedCommentator) {
      setSelectedCommentator(userPreference);
    }
  }, [selectedCommentator]);

  return {
    commentators,
    currentCommentator,
    selectedCommentator,
    isGenerating,
    error,
    generateCommentary,
    switchCommentator,
  };
}
