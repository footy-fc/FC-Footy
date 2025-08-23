import { Commentator, MatchEvent, CommentatorQuote } from '~/types/commentatorTypes';

export abstract class BaseCommentatorService implements Commentator {
  abstract id: string;
  abstract name: string;
  abstract displayName: string;
  abstract description: string;
  abstract style: 'dramatic' | 'analytical' | 'enthusiastic' | 'poetic';
  abstract dataset: string;

  abstract generateCommentary(matchEvent: MatchEvent): Promise<string>;
  
  protected abstract loadCommentatorData(): Promise<CommentatorQuote[]>;
  protected abstract createVectorStore(quotes: CommentatorQuote[]): Promise<unknown>;
  protected abstract retrieveRelevantQuotes(vectorStore: unknown, matchEvent: MatchEvent): Promise<CommentatorQuote[]>;
  protected abstract generateCommentaryFromQuotes(matchEvent: MatchEvent, quotes: CommentatorQuote[]): Promise<string>;
}

export interface CommentatorServiceInterface {
  getCommentator(id: string): Commentator | undefined;
  getAllCommentators(): Commentator[];
  getDefaultCommentator(): Commentator;
  generateCommentary(commentatorId: string, matchEvent: MatchEvent): Promise<string>;
}
