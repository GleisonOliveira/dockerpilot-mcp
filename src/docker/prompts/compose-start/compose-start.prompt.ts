import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BasePrompt } from "../../shared/base.prompt.js";
import { buildComposeStartMessages } from "./compose-start.template.js";

const schema = z.object({
  project_dir: z.string().optional().describe("Path to the directory containing docker-compose.yml (optional)"),
});

export class ComposeStartPrompt extends BasePrompt {
  register(server: McpServer): void {
    server.registerPrompt(
      "compose_start",
      {
        description:
          "Start the entire Docker Compose project in detached mode. " +
          "Activate when the user wants to run the project, bring up all services, " +
          "start the application stack, or execute docker compose up.",
        argsSchema: schema.shape,
      },
      (args) => ({ messages: buildComposeStartMessages(args) }),
    );
  }
}
