/* eslint-disable @typescript-eslint/no-unused-vars */
// utils/fetchPrice.ts
type Currency = 'ETH' | 'MATIC' | string; // Add other currencies as needed

export async function fetchNativeTokenPrice(network: 'ethereum' | 'base' | 'polygon' | 'arbitrum'): Promise<number> {
  try {
    // Map networks to their Coinbase currency symbols
    const currencyMap = {
      ethereum: 'ETH',
      base: 'ETH', // Base also uses ETH
      polygon: 'MATIC',
      arbitrum: 'ETH'
    };

    const currency = currencyMap[network];
    const response = await fetch(
      `https://api.coinbase.com/v2/exchange-rates?currency=${currency}`
    );

    if (!response.ok) throw new Error('Failed to fetch price');

    const body = await response.json();
    return Number(body.data.rates.USD);
  } catch (error) {
    console.error(`Error fetching ${network} price:`, error);
    throw error;
  }
}