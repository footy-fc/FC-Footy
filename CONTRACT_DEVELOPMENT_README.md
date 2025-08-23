# Contract Development Guide

This repository is now organized to support multiple contract versions and frontend development simultaneously.

## 📁 **Repository Structure**

```
FC-Footy/
├── contracts/                    # Smart contract development
│   ├── v1/                      # Legacy contracts
│   │   └── scoresquare.sol      # Original ScoreSquare contract
│   ├── v2/                      # New contract version
│   │   └── ScoreSquareV2.sol    # Upgraded ScoreSquare contract
│   ├── scripts/                 # Deployment scripts
│   │   └── deploy-v2.js
│   ├── test/                    # Contract tests
│   │   ├── v1/
│   │   └── v2/
│   ├── hardhat.config.js        # Hardhat configuration
│   └── package.json             # Contract dependencies
├── subgraphs/                   # GraphQL subgraphs
│   ├── v1/                      # Legacy subgraph
│   └── v2/                      # New subgraph for V2
├── src/                         # Frontend (Next.js)
└── package.json                 # Frontend dependencies
```

## 🚀 **Getting Started**

### **1. Install Contract Dependencies**
```bash
cd contracts
yarn install
```

### **2. Set Up Environment Variables**
Create `.env` file in the `contracts/` directory:
```env
PRIVATE_KEY=your_private_key_here
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key
```

### **3. Compile Contracts**
```bash
cd contracts
yarn compile
```

### **4. Deploy V2 Contract**
```bash
# Deploy to Base Sepolia (testnet)
yarn deploy:base-sepolia

# Deploy to Base Mainnet
yarn deploy:base
```

## 🔄 **Version Management**

### **Contract Versions**
- **V1**: Original ScoreSquare contract (deployed at `0x6147b9AB63496aCE7f3D270F8222e09038FD0870`)
- **V2**: Upgraded contract with new features:
  - `createdAt` and `finalizedAt` timestamps
  - `VERSION` constant for version tracking
  - Enhanced `getGame` function with V2 fields
  - `isSquareClaimed` helper function

### **Frontend Version Control**
The frontend automatically switches between contract versions based on environment variables:

```typescript
// src/lib/contracts.ts
export const getActiveContractVersion = (): 'v1' | 'v2' => {
  return (process.env.NEXT_PUBLIC_CONTRACT_VERSION as 'v1' | 'v2') || 'v1';
};
```

**Environment Variables:**
- `NEXT_PUBLIC_CONTRACT_VERSION=v1` - Use V1 contract
- `NEXT_PUBLIC_CONTRACT_VERSION=v2` - Use V2 contract

## 📊 **Subgraph Management**

### **Deploy Subgraph V2**
```bash
cd subgraphs/v2
yarn install
yarn codegen
yarn build
yarn deploy
```

### **Update Subgraph Address**
After deploying V2 contract, update the address in:
- `subgraphs/v2/subgraph.yaml`
- `src/lib/contracts.ts`

## 🧪 **Testing**

### **Contract Tests**
```bash
cd contracts
yarn test
```

### **Frontend Tests**
```bash
# From root directory
yarn test
```

## 🔧 **Development Workflow**

### **1. Contract Development**
1. Make changes to `contracts/v2/ScoreSquareV2.sol`
2. Compile: `yarn compile`
3. Test: `yarn test`
4. Deploy to testnet: `yarn deploy:base-sepolia`
5. Test on testnet
6. Deploy to mainnet: `yarn deploy:base`

### **2. Frontend Integration**
1. Update contract address in `src/lib/contracts.ts`
2. Test with V2: `NEXT_PUBLIC_CONTRACT_VERSION=v2`
3. Update components to handle V2 data structure
4. Deploy frontend changes

### **3. Subgraph Updates**
1. Update `subgraphs/v2/schema.graphql` if needed
2. Update `subgraphs/v2/src/mapping.ts`
3. Deploy subgraph: `yarn deploy`

## 🔍 **Key Differences: V1 vs V2**

| Feature | V1 | V2 |
|---------|----|----|
| Timestamps | ❌ | ✅ `createdAt`, `finalizedAt` |
| Version Tracking | ❌ | ✅ `VERSION` constant |
| Square Claim Check | ❌ | ✅ `isSquareClaimed()` |
| Enhanced Events | ❌ | ✅ Version in `GameCreated` |
| Emergency Withdraw | ❌ | ✅ `emergencyWithdraw()` |

## 🚨 **Important Notes**

1. **Backward Compatibility**: V2 maintains the same core functionality as V1
2. **Address Management**: Always update addresses in both contract configs and frontend
3. **Environment Variables**: Use different env files for different environments
4. **Testing**: Always test on testnet before mainnet deployment
5. **Documentation**: Update this README when adding new versions

## 📞 **Support**

For questions about contract development or deployment, check:
- Hardhat documentation: https://hardhat.org/
- Base network docs: https://docs.base.org/
- The Graph docs: https://thegraph.com/docs/
