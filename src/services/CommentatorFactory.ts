import { Commentator, MatchEvent, CommentatorConfig } from '~/types/commentatorTypes';
import { CommentatorServiceInterface } from '~/services/CommentatorService';
import { PeterDruryService, RayHudsonService } from '~/services/commentators';

export class CommentatorFactory implements CommentatorServiceInterface {
  private commentators: Map<string, Commentator> = new Map();
  private config: CommentatorConfig;

  constructor() {
    this.config = {
      defaultCommentator: 'peter-drury',
      availableCommentators: ['peter-drury', 'ray-hudson'],
    };

    // Initialize commentators
    this.commentators.set('peter-drury', new PeterDruryService());
    this.commentators.set('ray-hudson', new RayHudsonService());
  }

  getCommentator(id: string): Commentator | undefined {
    return this.commentators.get(id);
  }

  getAllCommentators(): Commentator[] {
    return Array.from(this.commentators.values());
  }

  getDefaultCommentator(): Commentator {
    const defaultCommentator = this.commentators.get(this.config.defaultCommentator);
    if (!defaultCommentator) {
      throw new Error(`Default commentator ${this.config.defaultCommentator} not found`);
    }
    return defaultCommentator;
  }

  async generateCommentary(commentatorId: string, matchEvent: MatchEvent): Promise<string> {
    const commentator = this.getCommentator(commentatorId);
    if (!commentator) {
      console.warn(`Commentator ${commentatorId} not found, using default`);
      return this.getDefaultCommentator().generateCommentary(matchEvent);
    }

    return commentator.generateCommentary(matchEvent);
  }

  setUserPreference(commentatorId: string): void {
    if (this.commentators.has(commentatorId)) {
      this.config.userPreference = commentatorId;
    } else {
      console.warn(`Commentator ${commentatorId} not available`);
    }
  }

  getUserPreference(): string {
    return this.config.userPreference || this.config.defaultCommentator;
  }

  getAvailableCommentators(): string[] {
    return this.config.availableCommentators;
  }
}

// Create singleton instance
export const commentatorFactory = new CommentatorFactory();
