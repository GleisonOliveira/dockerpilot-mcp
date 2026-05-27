import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BasePrompt } from "../../shared/base.prompt.js";
import { buildComposeRestartMessages } from "./compose-restart.template.js";

const schema = z.object({
  project_dir: z.string().optional().describe("Path to the directory containing docker-compose.yml (optional)"),
});

export class ComposeRestartPrompt extends BasePrompt {
  register(server: McpServer): void {
    server.registerPrompt(
      "compose_restart",
      {
        description:
          "Restart the entire Docker Compose project. " +
          "Activate when the user wants to restart all services, reboot the application stack, " +
          "or apply configuration changes by cycling the project.",
        argsSchema: schema.shape,
      },
      (args) => ({ messages: buildComposeRestartMessages(args) }),
    );
  }
}
