import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ToolContainer } from "./di/tool-container.js";
import { PromptContainer } from "./di/prompt-container.js";

export class DockerPilotServer {
  private readonly server: McpServer;

  constructor(
    private readonly toolContainer: ToolContainer,
    private readonly promptContainer: PromptContainer,
  ) {
    this.server = new McpServer({
      name: "dockerpilot-mcp",
      version: "0.1.0",
    });

    this.registerTools();
    this.registerPrompts();
  }

  private registerTools(): void {
    for (const tool of this.toolContainer.getTools()) {
      tool.register(this.server);
    }
  }

  private registerPrompts(): void {
    for (const prompt of this.promptContainer.getPrompts()) {
      prompt.register(this.server);
    }
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
