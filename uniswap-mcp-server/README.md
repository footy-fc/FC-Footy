# Uniswap V3 MCP Server

This MCP (Model Context Protocol) server provides tools for exploring and querying Uniswap V3 data across multiple networks.

## Features

- **Multi-Network Support**: Ethereum, Base, Optimism, Arbitrum, Polygon
- **Pool Analysis**: Get pool data, liquidity, volume, and pricing
- **Token Information**: Token details, prices, and trading volume
- **Swap History**: Recent swaps and trading activity
- **Schema Exploration**: Full GraphQL schema introspection

## Setup

1. Install dependencies:
```bash
cd uniswap-mcp-server
yarn install
```

2. Build the server:
```bash
yarn build
```

3. Add to your Cursor MCP configuration (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "uniswap-explorer": {
      "command": "node",
      "args": ["/path/to/your/project/uniswap-mcp-server/dist/server.js"],
      "env": {
        "UNISWAP_NETWORK": "ethereum"
      }
    }
  }
}
```

## Supported Networks

- **ethereum**: Mainnet (default)
- **base**: Base network
- **optimism**: Optimism network
- **arbitrum**: Arbitrum network
- **polygon**: Polygon network

## Available Tools

### 1. `introspect_schema`
Introspect the Uniswap V3 GraphQL schema to get available types, queries, and mutations.

### 2. `execute_query`
Execute a custom GraphQL query against the Uniswap V3 endpoint.

### 3. `get_schema_types`
Get all available types from the Uniswap V3 GraphQL schema.

### 4. `get_available_queries`
Get all available queries from the Uniswap V3 GraphQL schema.

### 5. `get_type_details`
Get detailed information about a specific GraphQL type.

### 6. `get_pools`
Get Uniswap V3 pools with filtering and pagination.

**Parameters**:
- `token0` (optional): Token 0 address to filter by
- `token1` (optional): Token 1 address to filter by
- `limit` (optional): Number of pools to return (default: 10)
- `orderBy` (optional): Field to order by (default: totalValueLockedUSD)
- `orderDirection` (optional): Order direction: asc or desc (default: desc)

### 7. `get_pool`
Get a specific Uniswap V3 pool by address.

**Parameters**:
- `poolAddress` (required): Pool address

### 8. `get_tokens`
Get Uniswap V3 tokens with filtering and pagination.

**Parameters**:
- `symbol` (optional): Token symbol to filter by
- `limit` (optional): Number of tokens to return (default: 10)
- `orderBy` (optional): Field to order by (default: totalValueLockedUSD)
- `orderDirection` (optional): Order direction: asc or desc (default: desc)

### 9. `get_token`
Get a specific Uniswap V3 token by address.

**Parameters**:
- `tokenAddress` (required): Token address

### 10. `get_swaps`
Get recent swaps for a specific pool.

**Parameters**:
- `poolAddress` (required): Pool address to get swaps for
- `limit` (optional): Number of swaps to return (default: 10)
- `orderBy` (optional): Field to order by (default: timestamp)
- `orderDirection` (optional): Order direction: asc or desc (default: desc)

### 11. `search_pools_by_tokens`
Search for pools containing specific tokens.

**Parameters**:
- `token0Address` (optional): Token 0 address
- `token1Address` (optional): Token 1 address
- `limit` (optional): Number of pools to return (default: 10)

## Configuration

The server uses the following environment variables:

- `UNISWAP_NETWORK`: The network to query (defaults to "ethereum")

## Example Usage

### Get top pools by TVL:
```json
{
  "tool": "get_pools",
  "arguments": {
    "limit": 5,
    "orderBy": "totalValueLockedUSD",
    "orderDirection": "desc"
  }
}
```

### Get pools for a specific token pair:
```json
{
  "tool": "search_pools_by_tokens",
  "arguments": {
    "token0Address": "0xa0b86a33e6441b8c4c8c8c8c8c8c8c8c8c8c8c8c",
    "token1Address": "0xdac17f958d2ee523a2206206994597c13d831ec7",
    "limit": 10
  }
}
```

### Get recent swaps for a pool:
```json
{
  "tool": "get_swaps",
  "arguments": {
    "poolAddress": "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8",
    "limit": 20
  }
}
```

## Integration with Trading Analysis

This MCP server complements the Bendystraw analysis by providing:

- **Direct DEX Trading Data**: Actual Uniswap swap events
- **Liquidity Pool Information**: TVL, volume, and pricing data
- **Token Trading Activity**: Real-time trading volume and price movements
- **Cross-Network Analysis**: Compare trading activity across different networks

## Data Sources

- **Ethereum**: https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3
- **Base**: https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-base
- **Optimism**: https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-optimism
- **Arbitrum**: https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-arbitrum
- **Polygon**: https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-polygon

