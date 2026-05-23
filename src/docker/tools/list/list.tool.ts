import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DockerClient } from "../../../docker/client.js";
import { BaseTool } from "../../shared/base.tool.js";
import { tryCatch } from "../../../utils/try-catch.js";
import { ContainerFieldResolvers } from "./list.resolvers.js";

const VALID_STATES = ["created", "restarting", "running", "removing", "paused", "exited", "dead"] as const;

const schema = z.object({
  all: z.boolean().optional().default(false).describe("Include stopped containers"),
  name: z.string().optional().describe("Filter containers by name (partial match, case-insensitive)"),
  status: z.enum(VALID_STATES).optional().describe("Filter containers by status (e.g. running, exited, paused)"),
  includePorts: z.boolean().optional().default(false).describe("Include port bindings"),
  includeMounts: z.boolean().optional().default(false).describe("Include volume mounts"),
  includeNetworks: z.boolean().optional().default(false).describe("Include network settings"),
  includeUsage: z.boolean().optional().default(false).describe("Include CPU and memory usage (running containers only)"),
  includeLabels: z.boolean().optional().default(false).describe("Include container labels"),
  includeHealthcheck: z.boolean().optional().default(false).describe("Include healthcheck status and last log"),
  includeRestartInfo: z.boolean().optional().default(false).describe("Include restart policy and restart count"),
  includeComposeMetadata: z.boolean().optional().default(false).describe("Include Docker Compose metadata (project, service, config files)"),
  includeDependencyInfo: z.boolean().optional().default(false).describe("Include Compose service dependencies"),
  includeResourceLimits: z.boolean().optional().default(false).describe("Include CPU and memory resource limits"),
  includeStateDetails: z.boolean().optional().default(false).describe("Include detailed state (pid, exit code, started_at, oom_killed, etc.)"),
});

type Input = z.infer<typeof schema>;

export class ListContainersTool extends BaseTool {
  constructor(private readonly client: DockerClient) {
    super();
  }

  async #handle(input: Input) {
    const outcome = await tryCatch(async () => {
      await this.client.checkConnection();

      const docker = this.client.getDocker();

      const listOptions: Record<string, unknown> = { all: input.all };
      if (input.status) listOptions["filters"] = JSON.stringify({ status: [input.status] });

      const containers = await docker.listContainers(listOptions);

      const filtered = input.name
        ? containers.filter((c) =>
            c.Names.some((n) => n.toLowerCase().includes(input.name!.toLowerCase()))
          )
        : containers;

      const needsInspect =
        input.includeHealthcheck ||
        input.includeRestartInfo ||
        input.includeResourceLimits ||
        input.includeStateDetails;

      return Promise.all(
        filtered.map(async (c) => {
          const base = {
            id: c.Id.slice(0, 12),
            names: c.Names,
            image: c.Image,
            status: c.Status,
            state: c.State,
          };

          const inspect = needsInspect
            ? await docker.getContainer(c.Id).inspect().catch(() => null)
            : null;

          const extras = await Promise.all([
            input.includePorts ? ContainerFieldResolvers.ports(c) : null,
            input.includeMounts ? ContainerFieldResolvers.mounts(c) : null,
            input.includeNetworks ? ContainerFieldResolvers.networks(c) : null,
            input.includeUsage ? ContainerFieldResolvers.usage(c, docker) : null,
            input.includeLabels ? ContainerFieldResolvers.labels(c) : null,
            input.includeHealthcheck && inspect ? ContainerFieldResolvers.healthcheck(inspect) : input.includeHealthcheck ? { healthcheck: null } : null,
            input.includeRestartInfo && inspect ? ContainerFieldResolvers.restartInfo(inspect) : input.includeRestartInfo ? { restart_info: null } : null,
            input.includeComposeMetadata ? ContainerFieldResolvers.composeMetadata(c) : null,
            input.includeDependencyInfo ? ContainerFieldResolvers.dependencyInfo(c) : null,
            input.includeResourceLimits && inspect ? ContainerFieldResolvers.resourceLimits(inspect) : input.includeResourceLimits ? { resource_limits: null } : null,
            input.includeStateDetails && inspect ? ContainerFieldResolvers.stateDetails(inspect) : input.includeStateDetails ? { state_details: null } : null,
          ]);

          return Object.assign(base, ...extras.filter(Boolean));
        })
      );
    });

    if (!outcome.success) {
      return {
        content: [{ type: "text" as const, text: `Error listing containers: ${outcome.error}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(outcome.result, null, 2) }],
    };
  }

  register(server: McpServer): void {
    server.registerTool(
      "list_containers",
      {
        description:
          "List Docker containers. By default only running containers; set all=true to include stopped. " +
          "Use name to filter by container name (partial match, case-insensitive). " +
          "Use status to filter by container status (running, exited, paused, etc.). " +
          "Use includeLabels, includeHealthcheck, includeRestartInfo, includeComposeMetadata, " +
          "includeDependencyInfo, includeResourceLimits, includeStateDetails, includePorts, " +
          "includeMounts, includeNetworks, includeUsage to request extra fields.",
        inputSchema: schema.shape,
      },
      this.#handle.bind(this)
    );
  }
}
