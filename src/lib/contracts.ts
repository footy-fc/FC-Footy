import { Address } from 'viem';

// Contract addresses for different versions
export const CONTRACT_ADDRESSES = {
  v1: {
    scoreSquare: '0x6147b9AB63496aCE7f3D270F8222e09038FD0870' as Address, // Current deployed address
  },
  v2: {
    scoreSquare: '0x0000000000000000000000000000000000000000' as Address, // Replace with V2 address when deployed
  },
} as const;

// Contract ABIs
export const CONTRACT_ABIS = {
  v1: {
    scoreSquare: [
      // V1 ABI - you can extract this from the contract
      'function createGame(uint256 _squarePrice, string calldata _eventId, address _referee, uint8 _deployerFeePercent) external returns (uint256 gameId)',
      'function buyTickets(uint256 gameId, uint8 numTickets) external payable',
      'function finalizeGame(uint256 gameId, uint8[] calldata _winningSquares, uint8[] calldata _winnerPercentages) external',
      'function distributeWinnings(uint256 gameId) external',
      'function getGame(uint256 gameId) external view returns (address, address, uint256, bool, bool, uint256, string, uint8, uint8, uint8[], uint8[], address[], bool)',
      'event GameCreated(uint256 gameId, address deployer, uint256 squarePrice, string eventId, address referee, uint8 deployerFeePercent)',
      'event TicketsPurchased(uint256 gameId, address buyer, uint8 numTickets)',
      'event GameFinalized(uint256 gameId, uint8[] winningSquares, uint8[] winnerPercentages)',
      'event PrizesDistributed(uint256 gameId, address distributor)',
      'event TicketsRefunded(uint256 gameId, uint8 ticketsRefunded)',
    ],
  },
  v2: {
    scoreSquare: [
      // V2 ABI - includes new fields like createdAt, finalizedAt, and VERSION
      'function createGame(uint256 _squarePrice, string calldata _eventId, address _referee, uint8 _deployerFeePercent) external returns (uint256 gameId)',
      'function buyTickets(uint256 gameId, uint8 numTickets) external payable',
      'function finalizeGame(uint256 gameId, uint8[] calldata _winningSquares, uint8[] calldata _winnerPercentages) external',
      'function distributeWinnings(uint256 gameId) external',
      'function getGame(uint256 gameId) external view returns (address, address, uint256, bool, bool, uint256, string, uint8, uint8, uint8[], uint8[], address[], bool, uint256, uint256)',
      'function isSquareClaimed(uint256 gameId, uint8 square) external view returns (bool)',
      'function VERSION() external view returns (uint256)',
      'event GameCreated(uint256 gameId, address deployer, uint256 squarePrice, string eventId, address referee, uint8 deployerFeePercent, uint256 version)',
      'event TicketsPurchased(uint256 gameId, address buyer, uint8 numTickets)',
      'event GameFinalized(uint256 gameId, uint8[] winningSquares, uint8[] winnerPercentages)',
      'event PrizesDistributed(uint256 gameId, address distributor)',
      'event TicketsRefunded(uint256 gameId, uint8 ticketsRefunded)',
    ],
  },
} as const;

// Environment-based contract version selection
export const getActiveContractVersion = (): 'v1' | 'v2' => {
  // You can control this via environment variable
  return (process.env.NEXT_PUBLIC_CONTRACT_VERSION as 'v1' | 'v2') || 'v1';
};

// Get contract address for current version
export const getScoreSquareAddress = (): Address => {
  const version = getActiveContractVersion();
  return CONTRACT_ADDRESSES[version].scoreSquare;
};

// Get contract ABI for current version
export const getScoreSquareABI = () => {
  const version = getActiveContractVersion();
  return CONTRACT_ABIS[version].scoreSquare;
};

// Type for game data based on version
export interface GameDataV1 {
  deployer: Address;
  referee: Address;
  squarePrice: bigint;
  active: boolean;
  prizeClaimed: boolean;
  prizePool: bigint;
  eventId: string;
  deployerFeePercent: number;
  ticketsSold: number;
  winningSquares: number[];
  winnerPercentages: number[];
  squareOwners: Address[];
  refunded: boolean;
}

export interface GameDataV2 extends GameDataV1 {
  createdAt: bigint;
  finalizedAt: bigint;
}

export type GameData = GameDataV1 | GameDataV2;

// Helper to check if game data includes V2 fields
export const isGameDataV2 = (gameData: GameData): gameData is GameDataV2 => {
  return 'createdAt' in gameData && 'finalizedAt' in gameData;
};
