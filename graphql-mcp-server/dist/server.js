import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { buildSchema, getIntrospectionQuery, execute, print, parse } from "graphql";
import fetch from "node-fetch";
// GraphQL endpoint configuration for Bendystraw
const BENDYSTRAW_API_KEY = process.env.BENDYSTRAW_API_KEY || "";
const BENDYSTRAW_BASE_URL = process.env.BENDYSTRAW_BASE_URL || "https://bendystraw.xyz";
const BENDYSTRAW_TESTNET_URL = process.env.BENDYSTRAW_TESTNET_URL || "https://testnet.bendystraw.xyz";
// Default to mainnet if no API key provided (for schema introspection)
const GRAPHQL_ENDPOINT = BENDYSTRAW_API_KEY
    ? `${BENDYSTRAW_BASE_URL}/${BENDYSTRAW_API_KEY}/graphql`
    : `${BENDYSTRAW_BASE_URL}/graphql`;
class GraphQLMCPServer {
    server;
    schema = null;
    constructor() {
        this.server = new Server({
            name: "graphql-explorer",
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
                        description: "Introspect the GraphQL schema to get available types, queries, and mutations",
                        inputSchema: {
                            type: "object",
                            properties: {},
                            required: [],
                        },
                    },
                    {
                        name: "execute_query",
                        description: "Execute a GraphQL query against the configured endpoint",
                        inputSchema: {
                            type: "object",
                            properties: {
                                query: {
                                    type: "string",
                                    description: "The GraphQL query to execute",
                                },
                                variables: {
                                    type: "object",
                                    description: "Variables for the GraphQL query",
                                    additionalProperties: true,
                                },
                            },
                            required: ["query"],
                        },
                    },
                    {
                        name: "get_schema_types",
                        description: "Get all available types from the GraphQL schema",
                        inputSchema: {
                            type: "object",
                            properties: {},
                            required: [],
                        },
                    },
                    {
                        name: "get_available_queries",
                        description: "Get all available queries from the GraphQL schema",
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
                        name: "get_bendystraw_projects",
                        description: "Get Juicebox projects from Bendystraw with pagination support",
                        inputSchema: {
                            type: "object",
                            properties: {
                                chainId: {
                                    type: "number",
                                    description: "Chain ID to filter by (1=Ethereum, 8453=Base, 10=Optimism, 42161=Arbitrum)",
                                },
                                limit: {
                                    type: "number",
                                    description: "Number of projects to return (default: 10)",
                                },
                                orderBy: {
                                    type: "string",
                                    description: "Field to order by (default: createdAt)",
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
                        name: "get_bendystraw_project",
                        description: "Get a specific Juicebox project by projectId and chainId",
                        inputSchema: {
                            type: "object",
                            properties: {
                                projectId: {
                                    type: "number",
                                    description: "Project ID",
                                },
                                chainId: {
                                    type: "number",
                                    description: "Chain ID (1=Ethereum, 8453=Base, 10=Optimism, 42161=Arbitrum)",
                                },
                            },
                            required: ["projectId", "chainId"],
                        },
                    },
                    {
                        name: "get_bendystraw_sucker_groups",
                        description: "Get Juicebox sucker groups (omnichain projects)",
                        inputSchema: {
                            type: "object",
                            properties: {
                                limit: {
                                    type: "number",
                                    description: "Number of sucker groups to return (default: 10)",
                                },
                                orderBy: {
                                    type: "string",
                                    description: "Field to order by (default: createdAt)",
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
                        name: "get_bendystraw_participants",
                        description: "Get participants snapshot for a sucker group at a specific timestamp",
                        inputSchema: {
                            type: "object",
                            properties: {
                                suckerGroupId: {
                                    type: "string",
                                    description: "Sucker group ID",
                                },
                                timestamp: {
                                    type: "number",
                                    description: "Unix timestamp in seconds",
                                },
                            },
                            required: ["suckerGroupId", "timestamp"],
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
                    case "get_bendystraw_projects":
                        return await this.getBendystrawProjects(args);
                    case "get_bendystraw_project":
                        if (!args?.projectId || !args?.chainId) {
                            throw new Error("Project ID and Chain ID are required");
                        }
                        return await this.getBendystrawProject(args.projectId, args.chainId);
                    case "get_bendystraw_sucker_groups":
                        return await this.getBendystrawSuckerGroups(args);
                    case "get_bendystraw_participants":
                        if (!args?.suckerGroupId || !args?.timestamp) {
                            throw new Error("Sucker Group ID and timestamp are required");
                        }
                        return await this.getBendystrawParticipants(args.suckerGroupId, args.timestamp);
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
            const response = await fetch(GRAPHQL_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
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
            this.schema = buildSchema(result.data);
            return {
                content: [
                    {
                        type: "text",
                        text: `✅ Schema introspection successful!\n\nEndpoint: ${GRAPHQL_ENDPOINT}\n\nSchema loaded with ${Object.keys(result.data.__schema.types).length} types.`,
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
            const response = await fetch(GRAPHQL_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
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
                        text: `✅ Query executed successfully!\n\nQuery: ${query}\nVariables: ${JSON.stringify(variables, null, 2)}\n\nResult:\n${JSON.stringify(result.data, null, 2)}`,
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
                    text: `📋 Available GraphQL Types (${typeNames.length}):\n\n${typeNames.join("\n")}`,
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
                    text: `📋 Available Queries (${queries.length}):\n\n${queryList}`,
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
    async getBendystrawProjects(args) {
        const chainId = args.chainId;
        const limit = args.limit || 10;
        const orderBy = args.orderBy || "createdAt";
        const orderDirection = args.orderDirection || "desc";
        const whereClause = chainId ? `where: { chainId: ${chainId} }` : "";
        const query = `
      query GetProjects($limit: Int, $orderBy: String, $orderDirection: String) {
        projects(
          ${whereClause}
          orderBy: $orderBy
          orderDirection: $orderDirection
          limit: $limit
        ) {
          items {
            projectId
            chainId
            balance
            volume
            suckerGroupId
            createdAt
            metadata {
              name
              description
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
          totalCount
        }
      }
    `;
        return await this.executeQuery(query, { limit, orderBy, orderDirection });
    }
    async getBendystrawProject(projectId, chainId) {
        const query = `
      query GetProject($projectId: Int!, $chainId: Int!) {
        project(projectId: $projectId, chainId: $chainId) {
          projectId
          chainId
          balance
          volume
          suckerGroupId
          createdAt
          metadata {
            name
            description
          }
        }
      }
    `;
        return await this.executeQuery(query, { projectId, chainId });
    }
    async getBendystrawSuckerGroups(args) {
        const limit = args.limit || 10;
        const orderBy = args.orderBy || "createdAt";
        const orderDirection = args.orderDirection || "desc";
        const query = `
      query GetSuckerGroups($limit: Int, $orderBy: String, $orderDirection: String) {
        suckerGroups(
          orderBy: $orderBy
          orderDirection: $orderDirection
          limit: $limit
        ) {
          items {
            id
            createdAt
            projects {
              projectId
              chainId
              balance
              volume
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
          totalCount
        }
      }
    `;
        return await this.executeQuery(query, { limit, orderBy, orderDirection });
    }
    async getBendystrawParticipants(suckerGroupId, timestamp) {
        // This uses the special /participants endpoint
        const url = `${BENDYSTRAW_BASE_URL}/${BENDYSTRAW_API_KEY}/participants`;
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    suckerGroupId,
                    timestamp,
                }),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return {
                content: [
                    {
                        type: "text",
                        text: `✅ Participants snapshot retrieved successfully!\n\nSucker Group ID: ${suckerGroupId}\nTimestamp: ${timestamp}\n\nParticipants (${result.length}):\n${JSON.stringify(result, null, 2)}`,
                    },
                ],
            };
        }
        catch (error) {
            throw new Error(`Failed to get participants: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("GraphQL MCP Server started");
    }
}
const server = new GraphQLMCPServer();
server.run().catch(console.error);
//# sourceMappingURL=server.js.map