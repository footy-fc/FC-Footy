// ESPN Logo Service for FC-Footy
// Handles ESPN logo URLs with validation and fallback mechanisms

import { ESPNLogoData } from '../types/teamTypes';

export class ESPNLogoService {
  private static readonly BASE_URL = 'https://a.espncdn.com/i/teamlogos/soccer/500';
  private static readonly FALLBACK_LOGO = '/defifa_spinner.gif';
  
  /**
   * Get ESPN logo URL for a team abbreviation
   */
  static getLogoUrl(abbreviation: string): string {
    if (!abbreviation) return this.FALLBACK_LOGO;
    return `${this.BASE_URL}/${abbreviation.toLowerCase()}.png`;
  }
  
  /**
   * Validate if ESPN logo exists for a team abbreviation
   */
  static async validateLogo(abbreviation: string): Promise<boolean> {
    if (!abbreviation) return false;
    
    try {
      const response = await fetch(this.getLogoUrl(abbreviation), { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch (error) {
      console.warn(`Failed to validate ESPN logo for ${abbreviation}:`, error);
      return false;
    }
  }
  
  /**
   * Get logo data with validation status
   */
  static async getLogoData(abbreviation: string): Promise<ESPNLogoData> {
    const url = this.getLogoUrl(abbreviation);
    const isValid = await this.validateLogo(abbreviation);
    
    return {
      abbreviation: abbreviation.toLowerCase(),
      url,
      isValid,
      fallbackUrl: isValid ? undefined : this.FALLBACK_LOGO
    };
  }
  
  /**
   * Get fallback logo URL
   */
  static getFallbackLogo(): string {
    return this.FALLBACK_LOGO;
  }
  
  /**
   * Batch validate multiple team logos
   */
  static async validateMultipleLogos(abbreviations: string[]): Promise<ESPNLogoData[]> {
    const results: ESPNLogoData[] = [];
    
    // Process in batches to avoid overwhelming the server
    const batchSize = 10;
    for (let i = 0; i < abbreviations.length; i += batchSize) {
      const batch = abbreviations.slice(i, i + batchSize);
      const batchPromises = batch.map(abbr => this.getLogoData(abbr));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < abbreviations.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }
  
  /**
   * Get alternative logo sources for a team
   */
  static getAlternativeLogoSources(abbreviation: string): string[] {
    const alternatives = [
      // Supabase storage (existing pattern)
      `https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/generic/${abbreviation.toLowerCase()}.png`,
      // Local assets
      `/assets/logos/${abbreviation.toLowerCase()}.png`,
      // Fallback
      this.FALLBACK_LOGO
    ];
    
    return alternatives;
  }
} 