import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DockerClient } from "../../../docker/client.js";
import { BaseTool } from "../../shared/base.tool.js";
import { tryCatch } from "../../../utils/try-catch.js";

const schema = z.object({
  force: z
    .boolean()
    .optional()
    .default(false)
    .describe("Force removal even if images are used by stopped containers. Default: false."),
  confirmed: z
    .boolean()
    .describe("User confirmation that all dangling images should be deleted. Must be explicitly set to true."),
});

type Input = z.infer<typeof schema>;
type ImageInfo = Awaited<ReturnType<ReturnType<DockerClient["getDocker"]>["listImages"]>>[number];

export class PruneImagesTool extends BaseTool {
  constructor(private readonly client: DockerClient) {
    super();
  }

  #buildPreview(images: ImageInfo[]) {
    const totalSize = images.reduce((acc, img) => acc + img.Size, 0);
    return {
      confirmed: false,
      message: "Deletion aborted: confirmed must be true to proceed. Ask the user to confirm before retrying.",
      preview: {
        count: images.length,
        total_size_mb: Math.round((totalSize / (1024 * 1024)) * 100) / 100,
        images: images.map((img) => ({
          id: img.Id.replace("sha256:", "").slice(0, 12),
          size_mb: Math.round((img.Size / (1024 * 1024)) * 100) / 100,
          created: new Date(img.Created * 1000).toISOString(),
        })),
      },
    };
  }

  async #handle(input: Input) {
    const outcome = await tryCatch(async () => {
      await this.client.checkConnection();
      const docker = this.client.getDocker();
      const danglingImages = await docker.listImages({ filters: { dangling: ["true"] } });

      if (danglingImages.length === 0) {
        return { deleted: false, message: "No dangling images found." };
      }

      if (!input.confirmed) return this.#buildPreview(danglingImages);

      const results = await Promise.allSettled(
        danglingImages.map(async (img) => {
          const shortId = img.Id.replace("sha256:", "").slice(0, 12);
          const removed = await docker.getImage(img.Id).remove({ force: input.force ?? false });
          return { id: shortId, size_mb: Math.round((img.Size / (1024 * 1024)) * 100) / 100, removed };
        }),
      );

      const succeeded = results
        .filter(
          (r): r is PromiseFulfilledResult<{ id: string; size_mb: number; removed: unknown }> =>
            r.status === "fulfilled",
        )
        .map((r) => r.value);

      const failed = results
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .map((r) => String(r.reason));

      const totalFreed = succeeded.reduce((acc, img) => acc + img.size_mb, 0);

      return {
        deleted: true,
        count: succeeded.length,
        failed_count: failed.length,
        total_freed_mb: Math.round(totalFreed * 100) / 100,
        images: succeeded,
        errors: failed.length > 0 ? failed : undefined,
      };
    });

    if (!outcome.success) {
      return {
        content: [{ type: "text" as const, text: `Error pruning dangling images: ${outcome.error}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(outcome.result, null, 2) }],
    };
  }

  register(server: McpServer): void {
    server.registerTool(
      "prune_images",
      {
        description:
          "Delete all dangling Docker images (untagged images not referenced by any container). " +
          "Requires confirmed=true — always show the preview first (confirmed=false) and ask the user to confirm before calling with confirmed=true. " +
          "Returns count, total freed space in MB, and per-image details.",
        inputSchema: schema.shape,
      },
      this.#handle.bind(this),
    );
  }
}
