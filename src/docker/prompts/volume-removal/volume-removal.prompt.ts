import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BasePrompt } from "../../shared/base.prompt.js";
import { buildVolumeRemovalMessages } from "./volume-removal.template.js";

export class VolumeRemovalPrompt extends BasePrompt {
  register(server: McpServer): void {
    server.registerPrompt(
      "volume_removal",
      {
        description:
          "Safe step-by-step guide for removing a Docker volume. " +
          "Activate when the user asks to remove, delete, or clean up a Docker volume, " +
          "or when any operation requires removing a volume. " +
          "Covers: listing containers using the volume, automated risk assessment (databases, app state, secrets), " +
          "double confirmation for high-risk volumes, explicit data-loss warning, " +
          "force-stopping containers, deleting the volume, and restarting the containers.",
      },
      () => ({ messages: buildVolumeRemovalMessages() }),
    );
  }
}
