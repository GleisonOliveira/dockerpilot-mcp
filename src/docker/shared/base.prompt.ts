import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export abstract class BasePrompt {
  abstract register(server: McpServer): void;
}
