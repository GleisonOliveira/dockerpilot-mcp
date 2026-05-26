import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DockerClient } from "../../../docker/client.js";
import { BaseTool } from "../../shared/base.tool.js";
import { tryCatch } from "../../../utils/try-catch.js";

const schema = z.object({
  id: z.string().describe("Image ID (full, short hash, or tag e.g. nginx:latest)."),
  force: z
    .boolean()
    .optional()
    .default(false)
    .describe("Force removal even if image is used by stopped containers. Default: false."),
  confirmed: z
    .boolean()
    .describe("User confirmation that the image should be deleted. Must be explicitly set to true."),
});

type Input = z.infer<typeof schema>;
type ImageInfo = Awaited<ReturnType<ReturnType<DockerClient["getDocker"]>["listImages"]>>[number];

export class DeleteImageTool extends BaseTool {
  constructor(private readonly client: DockerClient) {
    super();
  }

  #findImage(images: Awaited<ReturnType<ReturnType<DockerClient["getDocker"]>["listImages"]>>, id: string) {
    const search = id.toLowerCase();
    const match = images.find((img) => {
      const shortId = img.Id.replace("sha256:", "").slice(0, 12);
      const fullId = img.Id.replace("sha256:", "");
      const tags = img.RepoTags ?? [];
      return (
        shortId.startsWith(search) ||
        fullId.startsWith(search) ||
        img.Id.toLowerCase().startsWith(search) ||
        tags.some((t) => t.toLowerCase() === search || t.toLowerCase().startsWith(search))
      );
    });
    if (!match) throw new Error(`No image found matching: ${id}`);
    return match;
  }

  #buildPreview(match: ImageInfo, force: boolean) {
    return {
      confirmed: false,
      message: "Deletion aborted: confirmed must be true to proceed. Ask the user to confirm before retrying.",
      preview: {
        id: match.Id.replace("sha256:", "").slice(0, 12),
        tags: match.RepoTags ?? [],
        size_mb: Math.round((match.Size / (1024 * 1024)) * 100) / 100,
        created: new Date(match.Created * 1000).toISOString(),
        force,
      },
    };
  }

  async #handle(input: Input) {
    const outcome = await tryCatch(async () => {
      if (!input.id?.trim()) {
        return {
          content: [{ type: "text" as const, text: "Error deleting image: id is required." }],
          isError: true,
        };
      }

      await this.client.checkConnection();
      const docker = this.client.getDocker();
      const images = await docker.listImages({ all: false });
      const match = this.#findImage(images, input.id);

      if (!input.confirmed) return this.#buildPreview(match, input.force ?? false);

      const shortId = match.Id.replace("sha256:", "").slice(0, 12);
      const tags = match.RepoTags ?? [];
      const removed = await docker.getImage(match.Id).remove({ force: input.force ?? false });

      return { deleted: true, id: shortId, tags, removed };
    });

    if (!outcome.success) {
      return {
        content: [{ type: "text" as const, text: `Error deleting image: ${outcome.error}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(outcome.result, null, 2) }],
    };
  }

  register(server: McpServer): void {
    server.registerTool(
      "delete_image",
      {
        description:
          "Delete a Docker image by ID or tag. " +
          "Requires confirmed=true — always ask the user to confirm before calling with confirmed=true. " +
          "Accepts full ID, short hash, or tag (e.g. nginx:latest). " +
          "Use force=true to remove even if used by stopped containers.",
        inputSchema: schema.shape,
      },
      this.#handle.bind(this),
    );
  }
}
