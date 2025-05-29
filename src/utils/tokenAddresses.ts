// Define supported networks
type SupportedNetwork = 'ethereum' | 'base' | 'polygon' | 'arbitrum'; // Extend as needed

// Define token database type
interface TokenDatabase {
  [symbol: string]: {
    [network in SupportedNetwork]?: string;
  };
}

// Token database - add your actual token addresses here
const TOKEN_DATABASE: TokenDatabase = {
  ETH: {
    ethereum: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // Native token representation
    base: '0x4200000000000000000000000000000000000006', // WETH on Base
    arbitrum: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
  },
  USDC: {
    ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
  },
  DAI: {
    ethereum: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    base: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
  },
  // Add more tokens as needed
};

/**
 * Get contract address for a token symbol
 * @param symbol - Token symbol (case insensitive)
 * @param network - Network name (default: 'base')
 * @returns Contract address
 * @throws Error if symbol or network is not found
 */
export function getTokenAddress(
  symbol: string,
  network: SupportedNetwork = 'base'
): string {
  const upperSymbol = symbol.toUpperCase();
  
  if (!TOKEN_DATABASE[upperSymbol]) {
    throw new Error(`Token symbol not found: ${symbol}`);
  }

  const address = TOKEN_DATABASE[upperSymbol][network];
  
  if (!address) {
    throw new Error(`Token ${symbol} not available on ${network} network`);
  }

  return address;
}

/**
 * Check if a token symbol is supported
 * @param symbol - Token symbol to check
 * @param network - Network to check (optional)
 * @returns boolean indicating whether the token is supported
 */
export function isTokenSupported(
  symbol: string,
  network?: SupportedNetwork
): boolean {
  try {
    const upperSymbol = symbol.toUpperCase();
    
    if (!network) {
      return upperSymbol in TOKEN_DATABASE;
    }
    
    return !!TOKEN_DATABASE[upperSymbol]?.[network];
  } catch {
    return false;
  }
}