import { z } from "zod";
import Dockerode from "dockerode";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DockerClient } from "../../../docker/client.js";
import { BaseTool } from "../../shared/base.tool.js";
import { tryCatch } from "../../../utils/try-catch.js";

const schema = z.object({
  name: z.string().optional().describe("Filter volumes by name (partial match, case-insensitive)."),
  driver: z.string().optional().describe("Filter volumes by driver (e.g. local)."),
  includeContainers: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include containers using each volume (id and name, includes stopped). Default: false."),
  includeUsage: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include size and ref count (requires Docker to compute usage — may be slow). Default: false."),
  dangling: z
    .boolean()
    .optional()
    .default(false)
    .describe("Show only dangling volumes (not used by any container). Default: false."),
});

type Input = z.infer<typeof schema>;

export class ListVolumesTool extends BaseTool {
  constructor(private readonly client: DockerClient) {
    super();
  }

  #buildListOptions(input: Input) {
    const filters: Record<string, string[]> = {};
    if (input.dangling) filters["dangling"] = ["true"];
    if (input.driver) filters["driver"] = [input.driver];
    return { filters: Object.keys(filters).length ? JSON.stringify(filters) : undefined };
  }

  #filterByName(volumes: Dockerode.VolumeInspectInfo[], name?: string) {
    return name ? volumes.filter((v) => v.Name.toLowerCase().includes(name.toLowerCase())) : volumes;
  }

  async #enrichVolume(v: Dockerode.VolumeInspectInfo, docker: ReturnType<DockerClient["getDocker"]>, input: Input) {
    const base: Record<string, unknown> = {
      name: v.Name,
      driver: v.Driver,
      mountpoint: v.Mountpoint,
      scope: v.Scope,
      labels: v.Labels ?? {},
      options: v.Options ?? {},
    };

    if (input.includeUsage && v.UsageData != null) {
      base["usage"] = {
        size_bytes: v.UsageData.Size,
        size_mb: Math.round((v.UsageData.Size / (1024 * 1024)) * 100) / 100,
        ref_count: v.UsageData.RefCount,
      };
    }

    if (input.includeContainers) {
      const related = await docker
        .listContainers({ all: true, filters: JSON.stringify({ volume: [v.Name] }) })
        .catch(() => []);
      base["containers"] = related.map((c) => ({
        id: c.Id.slice(0, 12),
        name: c.Names[0]?.replace(/^\//, "") ?? c.Id.slice(0, 12),
        state: c.State,
      }));
    }

    return base;
  }

  async #handle(input: Input) {
    const outcome = await tryCatch(async () => {
      await this.client.checkConnection();
      const docker = this.client.getDocker();
      const { Volumes: volumes } = await docker.listVolumes(this.#buildListOptions(input));
      const filtered = this.#filterByName(volumes, input.name);
      return Promise.all(filtered.map((v) => this.#enrichVolume(v, docker, input)));
    });

    if (!outcome.success) {
      return {
        content: [{ type: "text" as const, text: `Error listing volumes: ${outcome.error}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(outcome.result, null, 2) }],
    };
  }

  register(server: McpServer): void {
    server.registerTool(
      "list_volumes",
      {
        description:
          "List Docker volumes. " +
          "Use name to filter by volume name (partial match, case-insensitive). " +
          "Use driver to filter by driver name (e.g. local). " +
          "Use includeContainers=true to see which containers (running or stopped) use each volume. " +
          "Use includeUsage=true to include size and ref count (may be slow). " +
          "Use dangling=true to show only volumes not used by any container.",
        inputSchema: schema.shape,
      },
      this.#handle.bind(this),
    );
  }
}
