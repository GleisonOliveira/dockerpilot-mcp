import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DockerClient } from "../../../docker/client.js";
import { BaseTool } from "../../shared/base.tool.js";
import { tryCatch } from "../../../utils/try-catch.js";

const schema = z.object({
  image: z
    .string()
    .describe(
      "Image name and optional tag (e.g. nginx:latest, ubuntu:22.04). Defaults to 'latest' if no tag is provided.",
    ),
});

type Input = z.infer<typeof schema>;

export class PullImageTool extends BaseTool {
  constructor(private readonly client: DockerClient) {
    super();
  }

  async #handle(input: Input) {
    if (!input.image?.trim()) {
      return {
        content: [{ type: "text" as const, text: "Error pulling image: image is required." }],
        isError: true,
      };
    }

    const outcome = await tryCatch(async () => {
      await this.client.checkConnection();
      const docker = this.client.getDocker();

      const stream = await docker.pull(input.image.trim());
      await new Promise<void>((resolve, reject) => {
        docker.modem.followProgress(stream, (err: Error | null) => (err ? reject(err) : resolve()));
      });

      const images = await docker.listImages({ filters: JSON.stringify({ reference: [input.image.trim()] }) });
      const pulled = images[0];

      return {
        pulled: true,
        image: input.image.trim(),
        id: pulled?.Id?.slice(7, 19) ?? null,
        tags: pulled?.RepoTags ?? [],
        size_bytes: pulled?.Size ?? null,
      };
    });

    if (!outcome.success) {
      return {
        content: [{ type: "text" as const, text: `Error pulling image: ${outcome.error}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(outcome.result, null, 2) }],
    };
  }

  register(server: McpServer): void {
    server.registerTool(
      "pull_image",
      {
        description:
          "Pull a Docker image from a registry. " +
          "image is required (e.g. nginx:latest, ubuntu:22.04). " +
          "Defaults to 'latest' tag if none is specified. " +
          "Returns the image id, tags, and size after a successful pull.",
        inputSchema: schema.shape,
      },
      this.#handle.bind(this),
    );
  }
}
