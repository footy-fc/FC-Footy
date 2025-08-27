# GraphQL MCP Server for Bendystraw

This MCP (Model Context Protocol) server provides tools for exploring and querying the Bendystraw GraphQL API, which indexes Juicebox protocol data across multiple chains.

## Features

- **Schema Introspection**: Automatically discover the GraphQL schema structure
- **Query Execution**: Execute GraphQL queries with variables
- **Type Exploration**: Browse available types and their details
- **Query Discovery**: List all available queries with their arguments
- **Bendystraw Integration**: Pre-built tools for Juicebox projects, sucker groups, and participants

## Setup

1. Install dependencies:
```bash
cd graphql-mcp-server
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
    "graphql-explorer": {
      "command": "node",
      "args": ["/path/to/your/project/graphql-mcp-server/dist/server.js"],
      "env": {
        "BENDYSTRAW_API_KEY": "your-api-key-here",
        "BENDYSTRAW_BASE_URL": "https://bendystraw.xyz",
        "BENDYSTRAW_TESTNET_URL": "https://testnet.bendystraw.xyz"
      }
    }
  }
}
```

**Note**: You'll need to contact Peri for an API key to access Bendystraw. See [bendystraw.xyz](https://bendystraw.xyz/) for more information.

## Available Tools

### 1. `introspect_schema`
Introspects the GraphQL schema to get available types, queries, and mutations.

**Usage**: No parameters required.

### 2. `execute_query`
Execute a GraphQL query against the configured endpoint.

**Parameters**:
- `query` (required): The GraphQL query to execute
- `variables` (optional): Variables for the GraphQL query

**Example**:
```json
{
  "query": "query GetGames($first: Int = 10) { games(first: $first) { id eventId ticketsSold } }",
  "variables": { "first": 5 }
}
```

### 3. `get_schema_types`
Get all available types from the GraphQL schema.

**Usage**: No parameters required.

### 4. `get_available_queries`
Get all available queries from the GraphQL schema with their descriptions and arguments.

**Usage**: No parameters required.

### 5. `get_type_details`
Get detailed information about a specific GraphQL type.

**Parameters**:
- `typeName` (required): The name of the type to get details for

### 6. `get_bendystraw_projects`
Get Juicebox projects from Bendystraw with pagination support.

**Parameters**:
- `chainId` (optional): Chain ID to filter by (1=Ethereum, 8453=Base, 10=Optimism, 42161=Arbitrum)
- `limit` (optional): Number of projects to return (default: 10)
- `orderBy` (optional): Field to order by (default: createdAt)
- `orderDirection` (optional): Order direction: asc or desc (default: desc)

### 7. `get_bendystraw_project`
Get a specific Juicebox project by projectId and chainId.

**Parameters**:
- `projectId` (required): Project ID
- `chainId` (required): Chain ID (1=Ethereum, 8453=Base, 10=Optimism, 42161=Arbitrum)

### 8. `get_bendystraw_sucker_groups`
Get Juicebox sucker groups (omnichain projects).

**Parameters**:
- `limit` (optional): Number of sucker groups to return (default: 10)
- `orderBy` (optional): Field to order by (default: createdAt)
- `orderDirection` (optional): Order direction: asc or desc (default: desc)

### 9. `get_bendystraw_participants`
Get participants snapshot for a sucker group at a specific timestamp.

**Parameters**:
- `suckerGroupId` (required): Sucker group ID
- `timestamp` (required): Unix timestamp in seconds

## Configuration

The server uses the following environment variables:

- `BENDYSTRAW_API_KEY`: Your Bendystraw API key (required for data queries)
- `BENDYSTRAW_BASE_URL`: Mainnet endpoint (defaults to https://bendystraw.xyz)
- `BENDYSTRAW_TESTNET_URL`: Testnet endpoint (defaults to https://testnet.bendystraw.xyz)

## Example Usage in Cursor

Once configured, you can use the GraphQL explorer in Cursor:

1. **Explore the schema**:
   - Use `introspect_schema` to load the schema
   - Use `get_schema_types` to see all available types
   - Use `get_available_queries` to see all available queries

2. **Execute queries**:
   - Use `execute_query` with your GraphQL query and variables
   - The server will return formatted results

3. **Get type details**:
   - Use `get_type_details` to explore specific types and their fields

## Integration with Bendystraw

This MCP server is configured to work with the Bendystraw GraphQL API, which provides access to:

- **Juicebox Projects**: All projects across Ethereum, Base, Optimism, and Arbitrum
- **Sucker Groups**: Omnichain projects with shared revenue and tokens
- **Participants**: Wallet addresses and their token balances
- **Activity Events**: Protocol interactions and transactions
- **Metadata**: Project names, descriptions, and configuration

The server supports both mainnet and testnet endpoints, and includes pre-built tools for common Juicebox queries.

## Supported Chains

- **Ethereum** (chainId: 1)
- **Base** (chainId: 8453) 
- **Optimism** (chainId: 10)
- **Arbitrum** (chainId: 42161)
- **Testnets**: Sepolia, Base Sepolia, Optimism Sepolia, Arbitrum Sepolia
