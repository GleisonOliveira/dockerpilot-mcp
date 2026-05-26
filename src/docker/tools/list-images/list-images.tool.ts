import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DockerClient } from "../../../docker/client.js";
import { BaseTool } from "../../shared/base.tool.js";
import { tryCatch } from "../../../utils/try-catch.js";

const schema = z.object({
  name: z.string().optional().describe("Filter images by name or tag (partial match, case-insensitive)"),
  all: z.boolean().optional().default(false).describe("Include intermediate images"),
  includeDigests: z.boolean().optional().default(false).describe("Include image digests"),
  includeContainers: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include containers using this image (id and name)"),
  dangling: z
    .boolean()
    .optional()
    .default(false)
    .describe("Show only dangling images (untagged and not used by any container)"),
});

type Input = z.infer<typeof schema>;

export class ListImagesTool extends BaseTool {
  constructor(private readonly client: DockerClient) {
    super();
  }

  #buildListOptions(input: Input) {
    const filters: Record<string, string[]> = {};
    if (input.dangling) filters["dangling"] = ["true"];
    return {
      all: input.all ?? false,
      digests: input.includeDigests ?? false,
      filters: Object.keys(filters).length ? JSON.stringify(filters) : undefined,
    };
  }

  #filterByName(images: Awaited<ReturnType<ReturnType<DockerClient["getDocker"]>["listImages"]>>, name?: string) {
    if (!name) return images;
    const search = name.toLowerCase();
    return images.filter((img) => {
      const tags = img.RepoTags ?? [];
      const digests = img.RepoDigests ?? [];
      return (
        tags.some((t) => t.toLowerCase().includes(search)) || digests.some((d) => d.toLowerCase().includes(search))
      );
    });
  }

  async #enrichImage(
    img: Awaited<ReturnType<ReturnType<DockerClient["getDocker"]>["listImages"]>>[number],
    docker: ReturnType<DockerClient["getDocker"]>,
    input: Input,
  ) {
    const base: Record<string, unknown> = {
      id: img.Id.replace("sha256:", "").slice(0, 12),
      tags: img.RepoTags ?? [],
      created: new Date(img.Created * 1000).toISOString(),
      size_mb: Math.round((img.Size / (1024 * 1024)) * 100) / 100,
      virtual_size_mb: Math.round((img.VirtualSize / (1024 * 1024)) * 100) / 100,
      containers: img.Containers,
    };

    if (input.includeDigests) base["digests"] = img.RepoDigests ?? [];

    if (input.includeContainers ?? false) {
      const related = await docker
        .listContainers({ all: true, filters: JSON.stringify({ ancestor: [img.Id] }) })
        .catch(() => []);
      base["running_containers"] = related.map((c) => ({ id: c.Id.slice(0, 12), name: c.Names[0] ?? "" }));
    }

    return base;
  }

  async #handle(input: Input) {
    const outcome = await tryCatch(async () => {
      await this.client.checkConnection();
      const docker = this.client.getDocker();
      const images = await docker.listImages(this.#buildListOptions(input));
      const filtered = this.#filterByName(images, input.name);
      return Promise.all(filtered.map((img) => this.#enrichImage(img, docker, input)));
    });

    if (!outcome.success) {
      return {
        content: [{ type: "text" as const, text: `Error listing images: ${outcome.error}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(outcome.result, null, 2) }],
    };
  }

  register(server: McpServer): void {
    server.registerTool(
      "list_images",
      {
        description:
          "List Docker images installed locally. " +
          "Use name to filter by image name or tag (partial match, case-insensitive). " +
          "Use all=true to include intermediate images. " +
          "Use includeDigests=true to include image digests. " +
          "Use includeContainers=true to include containers using each image (id and name, includes stopped). " +
          "Use dangling=true to show only dangling images (untagged and unused).",
        inputSchema: schema.shape,
      },
      this.#handle.bind(this),
    );
  }
}
