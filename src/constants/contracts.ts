import { SCORE_SQUARE_ADDRESS } from '../lib/config';

// Re-export the address from config
export { SCORE_SQUARE_ADDRESS };

// constants/contracts.ts
export const CONTRACT_ADDRESS_FEPL = '0xdCc32F6Efce28B595f255363ae6EEAA6Cd4B9499';
export const CONTRACT_ABI_FEPL = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "cid",
        "type": "string"
      }
    ],
    "name": "mintAsWhitelisted",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  }
];

// ScoreSquare contract ABI
export const SCORE_SQUARE_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_communityWallet",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [],
    "name": "CommunityWalletLocked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "newWallet",
        "type": "address"
      }
    ],
    "name": "CommunityWalletUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "deployer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "squarePrice",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "eventId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "referee",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "deployerFeePercent",
        "type": "uint8"
      }
    ],
    "name": "GameCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint8[]",
        "name": "winningSquares",
        "type": "uint8[]"
      },
      {
        "indexed": false,
        "internalType": "uint8[]",
        "name": "winnerPercentages",
        "type": "uint8[]"
      }
    ],
    "name": "GameFinalized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "distributor",
        "type": "address"
      }
    ],
    "name": "PrizesDistributed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "numTickets",
        "type": "uint8"
      }
    ],
    "name": "TicketsPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "ticketsRefunded",
        "type": "uint8"
      }
    ],
    "name": "TicketsRefunded",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "numTickets",
        "type": "uint8"
      }
    ],
    "name": "buyTickets",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "communityWallet",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "communityWalletLocked",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_squarePrice",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_eventId",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "_referee",
        "type": "address"
      },
      {
        "internalType": "uint8",
        "name": "_deployerFeePercent",
        "type": "uint8"
      }
    ],
    "name": "createGame",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      }
    ],
    "name": "distributeWinnings",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      },
      {
        "internalType": "uint8[]",
        "name": "_winningSquares",
        "type": "uint8[]"
      },
      {
        "internalType": "uint8[]",
        "name": "_winnerPercentages",
        "type": "uint8[]"
      }
    ],
    "name": "finalizeGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "gameCounter",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      }
    ],
    "name": "getAllTickets",
    "outputs": [
      {
        "internalType": "uint8[]",
        "name": "",
        "type": "uint8[]"
      },
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getContractBalance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_eventId",
        "type": "string"
      }
    ],
    "name": "getGameIdByEventId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "gameId",
        "type": "uint256"
      }
    ],
    "name": "getGameStatus",
    "outputs": [
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      },
      {
        "internalType": "address",
        "name": "referee",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "squarePrice",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "ticketsSold",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "prizePool",
        "type": "uint256"
      },
      {
        "internalType": "uint8[]",
        "name": "winningSquares",
        "type": "uint8[]"
      },
      {
        "internalType": "uint8[]",
        "name": "winnerPercentages",
        "type": "uint8[]"
      },
      {
        "internalType": "bool",
        "name": "prizeClaimed",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "eventId",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "refunded",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "lockCommunityWallet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newWallet",
        "type": "address"
      }
    ],
    "name": "setCommunityWallet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]; 