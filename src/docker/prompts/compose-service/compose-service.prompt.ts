import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BasePrompt } from "../../shared/base.prompt.js";
import { buildComposeServiceMessages } from "./compose-service.template.js";

const schema = z.object({
  service_name: z.string().optional().describe("Name of the Compose service to manage (optional)"),
  action: z
    .enum(["start", "stop", "restart"])
    .optional()
    .describe("Action to perform on the service: start, stop, or restart (optional)"),
});

export class ComposeServicePrompt extends BasePrompt {
  register(server: McpServer): void {
    server.registerPrompt(
      "compose_service",
      {
        description:
          "Start, stop, or restart a single Docker Compose service using MCP tools. " +
          "Activate when the user wants to manage one specific service individually — " +
          "not the whole project. Uses list_containers, start_containers, stop_containers, " +
          "restart_container, and container_logs tools.",
        argsSchema: schema.shape,
      },
      (args) => ({ messages: buildComposeServiceMessages(args) }),
    );
  }
}
