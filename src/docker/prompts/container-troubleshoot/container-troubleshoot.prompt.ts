import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BasePrompt } from "../../shared/base.prompt.js";
import { buildContainerTroubleshootMessages } from "./container-troubleshoot.template.js";

const schema = z.object({
  container_name: z.string().optional().describe("Name of the container with the issue (optional)"),
  symptom: z.string().optional().describe("Observed symptom or error (optional)"),
});

export class ContainerTroubleshootPrompt extends BasePrompt {
  register(server: McpServer): void {
    server.registerPrompt(
      "container_troubleshoot",
      {
        description:
          "Diagnostic guide for Docker container problems. " +
          "Activate when the user reports a container is not working, " +
          "not starting, throwing errors, port conflicts, or any unexpected behavior.",
        argsSchema: schema.shape,
      },
      (args) => ({ messages: buildContainerTroubleshootMessages(args) })
    );
  }
}
