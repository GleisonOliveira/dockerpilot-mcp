import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export abstract class BaseTool {
  abstract register(server: McpServer): void;
}
