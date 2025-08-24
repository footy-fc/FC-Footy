import { useAccount, useReadContract } from 'wagmi';

// $SCORES token contract address on Base
const SCORES_TOKEN_ADDRESS = '0xba1afff81a239c926446a67d73f73ec51c37c777' as `0x${string}`;

// ERC20 ABI for balanceOf function
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function useScoresTokenGate() {
  const { address, isConnected } = useAccount();

  // Testing flag - set to true to simulate no tokens
  const TEST_NO_TOKENS = process.env.NEXT_PUBLIC_TEST_NO_TOKENS === 'true';

  const { data: balance, isLoading, error } = useReadContract({
    address: SCORES_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address!],
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Minimum required $SCORES for access (default: 12 million tokens)
  // Convert to wei (18 decimals) for comparison with contract balance
  const MIN_REQUIRED_SCORES_TOKENS = process.env.NEXT_PUBLIC_MIN_REQUIRED_SCORES || '12000000';
  const MIN_REQUIRED_SCORES_WEI = BigInt(MIN_REQUIRED_SCORES_TOKENS) * 10n**18n;
  
  // Override for testing
  const hasScores = TEST_NO_TOKENS ? false : (balance && balance >= MIN_REQUIRED_SCORES_WEI);
  const balanceFormatted = TEST_NO_TOKENS ? 0 : (balance ? Number(balance) / 1e18 : 0);



  return {
    hasScores,
    balance: balanceFormatted,
    isLoading: TEST_NO_TOKENS ? false : isLoading,
    error,
    isConnected,
  };
}
