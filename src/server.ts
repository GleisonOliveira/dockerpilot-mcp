import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ToolContainer } from "./di/tool-container.js";

export class DockerPilotServer {
  private readonly server: McpServer;

  constructor(private readonly container: ToolContainer) {
    this.server = new McpServer({
      name: "dockerpilot-mcp",
      version: "0.1.0",
    });

    this.registerTools();
  }

  private registerTools(): void {
    for (const tool of this.container.getTools()) {
      tool.register(this.server);
    }
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
