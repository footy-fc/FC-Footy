import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { buildSchema, getIntrospectionQuery, execute, parse, print } from "graphql";
import fetch from "node-fetch";
// Uniswap V3 GraphQL endpoints
const UNISWAP_V3_ENDPOINTS = {
    ethereum: "https://gateway.thegraph.com/api/subgraphs/id/ELUcwgpm14LKPLrBRuVvPvNKHQ9HvwmtKgKSH6123cr7",
    base: "https://gateway.thegraph.com/api/subgraphs/id/HMuAwufqZ1YCRmzL2SfHTVkzZovC9VL2UAKhjvRqKiR1",
    optimism: "https://gateway.thegraph.com/api/subgraphs/id/ELUcwgpm14LKPLrBRuVvPvNKHQ9HvwmtKgKSH6123cr7",
    arbitrum: "https://gateway.thegraph.com/api/subgraphs/id/ELUcwgpm14LKPLrBRuVvPvNKHQ9HvwmtKgKSH6123cr7",
    polygon: "https://gateway.thegraph.com/api/subgraphs/id/ELUcwgpm14LKPLrBRuVvPvNKHQ9HvwmtKgKSH6123cr7",
};
// Alternative DEX and trading data endpoints
const TRADING_ENDPOINTS = {
    // 1inch API for aggregated DEX data
    oneinch_ethereum: "https://api.1inch.dev/swap/v6.0/1",
    oneinch_base: "https://api.1inch.dev/swap/v6.0/8453",
    oneinch_optimism: "https://api.1inch.dev/swap/v6.0/10",
    oneinch_arbitrum: "https://api.1inch.dev/swap/v6.0/42161",
    oneinch_polygon: "https://api.1inch.dev/swap/v6.0/137",
    // 0x API for DEX aggregation
    zeroex_ethereum: "https://api.0x.org/swap/v1/quote",
    zeroex_base: "https://api.0x.org/swap/v1/quote",
    zeroex_optimism: "https://api.0x.org/swap/v1/quote",
    zeroex_arbitrum: "https://api.0x.org/swap/v1/quote",
    zeroex_polygon: "https://api.0x.org/swap/v1/quote",
    // Jupiter API for Solana (alternative)
    jupiter_solana: "https://quote-api.jup.ag/v6/quote",
    // Direct RPC endpoints for blockchain queries
    rpc_ethereum: "https://mainnet.infura.io/v3/YOUR-PROJECT-ID",
    rpc_base: "https://mainnet.base.org",
    rpc_optimism: "https://mainnet.optimism.io",
    rpc_arbitrum: "https://arb1.arbitrum.io/rpc",
    rpc_polygon: "https://polygon-rpc.com",
};
const DEFAULT_NETWORK = process.env.UNISWAP_NETWORK || "base";
const GRAPHQL_API_KEY = process.env.THEGRAPH_API_KEY || "";
const GRAPHQL_ENDPOINT = UNISWAP_V3_ENDPOINTS[DEFAULT_NETWORK] || UNISWAP_V3_ENDPOINTS.base;
class UniswapMCPServer {
    server;
    schema = null;
    constructor() {
        this.server = new Server({
            name: "uniswap-explorer",
            version: "1.0.0",
        });
        this.setupToolHandlers();
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "introspect_schema",
                        description: "Introspect the DEX trading API schema (if available)",
                        inputSchema: {
                            type: "object",
                            properties: {},
                            required: [],
                        },
                    },
                    {
                        name: "execute_query",
                        description: "Execute a query against the DEX trading API",
                        inputSchema: {
                            type: "object",
                            properties: {
                                query: {
                                    type: "string",
                                    description: "The query to execute",
                                },
                                variables: {
                                    type: "object",
                                    description: "Variables for the query",
                                    additionalProperties: true,
                                },
                            },
                            required: ["query"],
                        },
                    },
                    {
                        name: "get_schema_types",
                        description: "Get all available types from the Uniswap V3 GraphQL schema",
                        inputSchema: {
                            type: "object",
                            properties: {},
                            required: [],
                        },
                    },
                    {
                        name: "get_available_queries",
                        description: "Get all available queries from the Uniswap V3 GraphQL schema",
                        inputSchema: {
                            type: "object",
                            properties: {},
                            required: [],
                        },
                    },
                    {
                        name: "get_type_details",
                        description: "Get detailed information about a specific GraphQL type",
                        inputSchema: {
                            type: "object",
                            properties: {
                                typeName: {
                                    type: "string",
                                    description: "The name of the type to get details for",
                                },
                            },
                            required: ["typeName"],
                        },
                    },
                    {
                        name: "get_pools",
                        description: "Get Uniswap pools with filtering and pagination (Universal Router)",
                        inputSchema: {
                            type: "object",
                            properties: {
                                token0: {
                                    type: "string",
                                    description: "Token 0 address to filter by",
                                },
                                token1: {
                                    type: "string",
                                    description: "Token 1 address to filter by",
                                },
                                limit: {
                                    type: "number",
                                    description: "Number of pools to return (default: 10)",
                                },
                                orderBy: {
                                    type: "string",
                                    description: "Field to order by (default: totalValueLockedUSD)",
                                },
                                orderDirection: {
                                    type: "string",
                                    description: "Order direction: asc or desc (default: desc)",
                                },
                            },
                            required: [],
                        },
                    },
                    {
                        name: "get_pool",
                        description: "Get a specific Uniswap pool by address (Universal Router)",
                        inputSchema: {
                            type: "object",
                            properties: {
                                poolAddress: {
                                    type: "string",
                                    description: "Pool address",
                                },
                            },
                            required: ["poolAddress"],
                        },
                    },
                    {
                        name: "get_tokens",
                        description: "Get Uniswap tokens with filtering and pagination (Universal Router)",
                        inputSchema: {
                            type: "object",
                            properties: {
                                symbol: {
                                    type: "string",
                                    description: "Token symbol to filter by",
                                },
                                limit: {
                                    type: "number",
                                    description: "Number of tokens to return (default: 10)",
                                },
                                orderBy: {
                                    type: "string",
                                    description: "Field to order by (default: totalValueLockedUSD)",
                                },
                                orderDirection: {
                                    type: "string",
                                    description: "Order direction: asc or desc (default: desc)",
                                },
                            },
                            required: [],
                        },
                    },
                    {
                        name: "get_token",
                        description: "Get a specific Uniswap token by address (Universal Router)",
                        inputSchema: {
                            type: "object",
                            properties: {
                                tokenAddress: {
                                    type: "string",
                                    description: "Token address",
                                },
                            },
                            required: ["tokenAddress"],
                        },
                    },
                    {
                        name: "get_swaps",
                        description: "Get recent swaps/transactions (Universal Router)",
                        inputSchema: {
                            type: "object",
                            properties: {
                                tokenIn: {
                                    type: "string",
                                    description: "Input token address to filter by",
                                },
                                tokenOut: {
                                    type: "string",
                                    description: "Output token address to filter by",
                                },
                                limit: {
                                    type: "number",
                                    description: "Number of swaps to return (default: 10)",
                                },
                                orderBy: {
                                    type: "string",
                                    description: "Field to order by (default: timestamp)",
                                },
                                orderDirection: {
                                    type: "string",
                                    description: "Order direction: asc or desc (default: desc)",
                                },
                            },
                            required: [],
                        },
                    },
                    {
                        name: "search_pools_by_tokens",
                        description: "Search for pools containing specific tokens",
                        inputSchema: {
                            type: "object",
                            properties: {
                                token0Address: {
                                    type: "string",
                                    description: "Token 0 address",
                                },
                                token1Address: {
                                    type: "string",
                                    description: "Token 1 address",
                                },
                                limit: {
                                    type: "number",
                                    description: "Number of pools to return (default: 10)",
                                },
                            },
                            required: [],
                        },
                    },
                ],
            };
        });
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case "introspect_schema":
                        return await this.introspectSchema();
                    case "execute_query":
                        if (!args?.query) {
                            throw new Error("Query is required");
                        }
                        return await this.executeQuery(args.query, args.variables);
                    case "get_schema_types":
                        return await this.getSchemaTypes();
                    case "get_available_queries":
                        return await this.getAvailableQueries();
                    case "get_type_details":
                        if (!args?.typeName) {
                            throw new Error("Type name is required");
                        }
                        return await this.getTypeDetails(args.typeName);
                    case "get_pools":
                        return await this.getPools(args);
                    case "get_pool":
                        if (!args?.poolAddress) {
                            throw new Error("Pool address is required");
                        }
                        return await this.getPool(args.poolAddress);
                    case "get_tokens":
                        return await this.getTokens(args);
                    case "get_token":
                        if (!args?.tokenAddress) {
                            throw new Error("Token address is required");
                        }
                        return await this.getToken(args.tokenAddress);
                    case "get_swaps":
                        if (!args?.poolAddress) {
                            throw new Error("Pool address is required");
                        }
                        return await this.getSwaps(args);
                    case "search_pools_by_tokens":
                        return await this.searchPoolsByTokens(args);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                };
            }
        });
    }
    async introspectSchema() {
        try {
            const headers = {
                "Content-Type": "application/json",
            };
            if (GRAPHQL_API_KEY) {
                headers["Authorization"] = `Bearer ${GRAPHQL_API_KEY}`;
            }
            const response = await fetch(GRAPHQL_ENDPOINT, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    query: getIntrospectionQuery(),
                }),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.errors) {
                throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
            }
            this.schema = buildSchema(result.data.__schema);
            return {
                content: [
                    {
                        type: "text",
                        text: `✅ Uniswap V3 schema introspection successful!\n\nNetwork: ${DEFAULT_NETWORK}\nEndpoint: ${GRAPHQL_ENDPOINT}\n\nSchema loaded with ${Object.keys(result.data.__schema.types).length} types.`,
                    },
                ],
            };
        }
        catch (error) {
            throw new Error(`Failed to introspect schema: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async executeQuery(query, variables = {}) {
        try {
            const headers = {
                "Content-Type": "application/json",
            };
            if (GRAPHQL_API_KEY) {
                headers["Authorization"] = `Bearer ${GRAPHQL_API_KEY}`;
            }
            const response = await fetch(GRAPHQL_ENDPOINT, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    query,
                    variables,
                }),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.errors) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `❌ GraphQL errors:\n${JSON.stringify(result.errors, null, 2)}\n\nQuery: ${query}\nVariables: ${JSON.stringify(variables, null, 2)}`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: "text",
                        text: `✅ Query executed successfully!\n\nNetwork: ${DEFAULT_NETWORK}\nQuery: ${query}\nVariables: ${JSON.stringify(variables, null, 2)}\n\nResult:\n${JSON.stringify(result.data, null, 2)}`,
                    },
                ],
            };
        }
        catch (error) {
            throw new Error(`Failed to execute query: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getSchemaTypes() {
        if (!this.schema) {
            await this.introspectSchema();
        }
        const introspection = await execute({
            schema: this.schema,
            document: parse(getIntrospectionQuery()),
        });
        if (introspection.errors) {
            throw new Error(`Failed to get schema types: ${JSON.stringify(introspection.errors)}`);
        }
        const types = introspection.data?.__schema.types || [];
        const typeNames = types
            .filter((type) => !type.name.startsWith("__"))
            .map((type) => type.name)
            .sort();
        return {
            content: [
                {
                    type: "text",
                    text: `📋 Available Uniswap V3 Types (${typeNames.length}):\n\n${typeNames.join("\n")}`,
                },
            ],
        };
    }
    async getAvailableQueries() {
        if (!this.schema) {
            await this.introspectSchema();
        }
        const introspection = await execute({
            schema: this.schema,
            document: parse(getIntrospectionQuery()),
        });
        if (introspection.errors) {
            throw new Error(`Failed to get available queries: ${JSON.stringify(introspection.errors)}`);
        }
        const queryType = introspection.data?.__schema.types.find((type) => type.name === "Query");
        if (!queryType) {
            return {
                content: [
                    {
                        type: "text",
                        text: "❌ No Query type found in schema",
                    },
                ],
            };
        }
        const queries = queryType.fields.map((field) => ({
            name: field.name,
            description: field.description || "No description available",
            args: field.args.map((arg) => ({
                name: arg.name,
                type: print(arg.type),
                description: arg.description || "No description available",
            })),
        }));
        const queryList = queries
            .map((query) => `🔍 **${query.name}**\n   Description: ${query.description}\n   Arguments: ${query.args.length > 0 ? query.args.map((arg) => `${arg.name}: ${arg.type}`).join(", ") : "None"}`)
            .join("\n\n");
        return {
            content: [
                {
                    type: "text",
                    text: `📋 Available Uniswap V3 Queries (${queries.length}):\n\n${queryList}`,
                },
            ],
        };
    }
    async getTypeDetails(typeName) {
        if (!this.schema) {
            await this.introspectSchema();
        }
        const introspection = await execute({
            schema: this.schema,
            document: parse(getIntrospectionQuery()),
        });
        if (introspection.errors) {
            throw new Error(`Failed to get type details: ${JSON.stringify(introspection.errors)}`);
        }
        const type = introspection.data?.__schema.types.find((t) => t.name === typeName);
        if (!type) {
            throw new Error(`Type '${typeName}' not found in schema`);
        }
        let details = `📋 **${type.name}** (${type.kind})\n\n`;
        details += `Description: ${type.description || "No description available"}\n\n`;
        if (type.fields) {
            details += `**Fields:**\n`;
            type.fields.forEach((field) => {
                details += `  • ${field.name}: ${print(field.type)}\n`;
                if (field.description) {
                    details += `    ${field.description}\n`;
                }
                if (field.args && field.args.length > 0) {
                    details += `    Arguments: ${field.args.map((arg) => `${arg.name}: ${print(arg.type)}`).join(", ")}\n`;
                }
                details += "\n";
            });
        }
        if (type.inputFields) {
            details += `**Input Fields:**\n`;
            type.inputFields.forEach((field) => {
                details += `  • ${field.name}: ${print(field.type)}\n`;
                if (field.description) {
                    details += `    ${field.description}\n`;
                }
                details += "\n";
            });
        }
        return {
            content: [
                {
                    type: "text",
                    text: details,
                },
            ],
        };
    }
    async getPools(args) {
        const token0 = args.token0;
        const token1 = args.token1;
        const limit = args.limit || 10;
        const orderBy = args.orderBy || "totalValueLockedUSD";
        const orderDirection = args.orderDirection || "desc";
        let whereClause = "";
        if (token0 && token1) {
            whereClause = `where: { token0: "${token0.toLowerCase()}", token1: "${token1.toLowerCase()}" }`;
        }
        else if (token0) {
            whereClause = `where: { token0: "${token0.toLowerCase()}" }`;
        }
        else if (token1) {
            whereClause = `where: { token1: "${token1.toLowerCase()}" }`;
        }
        const query = `
      query GetPools($limit: Int, $orderBy: String, $orderDirection: String) {
        pools(
          ${whereClause}
          orderBy: $orderBy
          orderDirection: $orderDirection
          first: $limit
        ) {
          id
          token0 {
            id
            symbol
            name
            decimals
          }
          token1 {
            id
            symbol
            name
            decimals
          }
          feeTier
          liquidity
          sqrtPrice
          tick
          token0Price
          token1Price
          volumeUSD
          totalValueLockedUSD
          totalValueLockedToken0
          totalValueLockedToken1
        }
      }
    `;
        return await this.executeQuery(query, { limit, orderBy, orderDirection });
    }
    async getPool(poolAddress) {
        const query = `
      query GetPool($poolAddress: ID!) {
        pool(id: $poolAddress) {
          id
          token0 {
            id
            symbol
            name
            decimals
          }
          token1 {
            id
            symbol
            name
            decimals
          }
          feeTier
          liquidity
          sqrtPrice
          tick
          token0Price
          token1Price
          volumeUSD
          totalValueLockedUSD
          totalValueLockedToken0
          totalValueLockedToken1
          swaps(first: 5, orderBy: timestamp, orderDirection: desc) {
            id
            timestamp
            amount0
            amount1
            amountUSD
            origin
          }
        }
      }
    `;
        return await this.executeQuery(query, { poolAddress: poolAddress.toLowerCase() });
    }
    async getTokens(args) {
        const symbol = args.symbol;
        const limit = args.limit || 10;
        const orderBy = args.orderBy || "totalValueLockedUSD";
        const orderDirection = args.orderDirection || "desc";
        let whereClause = "";
        if (symbol) {
            whereClause = `where: { symbol_contains: "${symbol.toUpperCase()}" }`;
        }
        const query = `
      query GetTokens($limit: Int, $orderBy: String, $orderDirection: String) {
        tokens(
          ${whereClause}
          orderBy: $orderBy
          orderDirection: $orderDirection
          first: $limit
        ) {
          id
          symbol
          name
          decimals
          totalSupply
          volume
          volumeUSD
          totalValueLocked
          totalValueLockedUSD
          priceUSD
        }
      }
    `;
        return await this.executeQuery(query, { limit, orderBy, orderDirection });
    }
    async getToken(tokenAddress) {
        const query = `
      query GetToken($tokenAddress: ID!) {
        token(id: $tokenAddress) {
          id
          symbol
          name
          decimals
          totalSupply
          volume
          volumeUSD
          totalValueLocked
          totalValueLockedUSD
          priceUSD
          pools {
            id
            token0Price
            token1Price
            totalValueLockedUSD
          }
        }
      }
    `;
        return await this.executeQuery(query, { tokenAddress: tokenAddress.toLowerCase() });
    }
    async getSwaps(args) {
        const poolAddress = args.poolAddress;
        const limit = args.limit || 10;
        const orderBy = args.orderBy || "timestamp";
        const orderDirection = args.orderDirection || "desc";
        const query = `
      query GetSwaps($poolAddress: String!, $limit: Int, $orderBy: String, $orderDirection: String) {
        swaps(
          where: { pool: $poolAddress }
          orderBy: $orderBy
          orderDirection: $orderDirection
          first: $limit
        ) {
          id
          timestamp
          pool {
            id
            token0 {
              symbol
            }
            token1 {
              symbol
            }
          }
          origin
          amount0
          amount1
          amountUSD
          sqrtPriceX96
          tick
        }
      }
    `;
        return await this.executeQuery(query, {
            poolAddress: poolAddress.toLowerCase(),
            limit,
            orderBy,
            orderDirection
        });
    }
    async searchPoolsByTokens(args) {
        const token0Address = args.token0Address;
        const token1Address = args.token1Address;
        const limit = args.limit || 10;
        let whereClause = "";
        if (token0Address && token1Address) {
            whereClause = `where: { token0: "${token0Address.toLowerCase()}", token1: "${token1Address.toLowerCase()}" }`;
        }
        else if (token0Address) {
            whereClause = `where: { token0: "${token0Address.toLowerCase()}" }`;
        }
        else if (token1Address) {
            whereClause = `where: { token1: "${token1Address.toLowerCase()}" }`;
        }
        else {
            throw new Error("At least one token address is required");
        }
        const query = `
      query SearchPools($limit: Int) {
        pools(
          ${whereClause}
          orderBy: totalValueLockedUSD
          orderDirection: desc
          first: $limit
        ) {
          id
          token0 {
            id
            symbol
            name
          }
          token1 {
            id
            symbol
            name
          }
          feeTier
          liquidity
          totalValueLockedUSD
          volumeUSD
          token0Price
          token1Price
        }
      }
    `;
        return await this.executeQuery(query, { limit });
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("Uniswap V3 MCP Server started");
    }
}
const server = new UniswapMCPServer();
server.run().catch(console.error);
//# sourceMappingURL=server.js.map