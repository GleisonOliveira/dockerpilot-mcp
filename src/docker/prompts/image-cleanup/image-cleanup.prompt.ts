import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BasePrompt } from "../../shared/base.prompt.js";
import { buildImageCleanupMessages } from "./image-cleanup.template.js";

export class ImageCleanupPrompt extends BasePrompt {
  register(server: McpServer): void {
    server.registerPrompt(
      "image_cleanup",
      {
        description:
          "Guide for reclaiming disk space by removing unused Docker images. " +
          "Activate when the user reports low disk space, wants to clean up Docker, " +
          "or asks to remove dangling/unused images.",
      },
      () => ({ messages: buildImageCleanupMessages() }),
    );
  }
}
