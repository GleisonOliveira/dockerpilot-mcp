import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BasePrompt } from "../../shared/base.prompt.js";
import { buildComposeStopMessages } from "./compose-stop.template.js";

const schema = z.object({
  project_dir: z.string().optional().describe("Path to the directory containing docker-compose.yml (optional)"),
});

export class ComposeStopPrompt extends BasePrompt {
  register(server: McpServer): void {
    server.registerPrompt(
      "compose_stop",
      {
        description:
          "Stop the entire Docker Compose project. " +
          "Activate when the user wants to shut down the application, stop all services, " +
          "bring the project down, or execute docker compose down.",
        argsSchema: schema.shape,
      },
      (args) => ({ messages: buildComposeStopMessages(args) }),
    );
  }
}
