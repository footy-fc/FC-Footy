export const BASE_URL = process.env.NEXT_PUBLIC_URL

// Testing environment flag - set to true to bypass conditional rendering
export const IS_TESTING = false

// Mock first-time user experience toggle. When true, For You will
// treat the viewer as a first-time user (FTUE) and default to the
// Fan Clubs subview regardless of install status or preferences.
export const MOCK_FIRST_TIME_USER = false

// Contract addresses for different networks
export const CONTRACTS = {
  // Base network contract address
  BASE: {
    SCORE_SQUARE_ADDRESS: "0x6147b9AB63496aCE7f3D270F8222e09038FD0870"
  },
  // Previous sepolia contract address (keeping for reference)
  PREVIOUS: {
    SCORE_SQUARE_ADDRESS: "0x9c6D9edc87edCeE21FDF7de2B8f215C1F0e362ee"
  }
};

// Export the current active contract address
export const SCORE_SQUARE_ADDRESS = CONTRACTS.BASE.SCORE_SQUARE_ADDRESS;
