import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DockerClient } from "../../../docker/client.js";
import { BaseTool } from "../../shared/base.tool.js";
import { tryCatch } from "../../../utils/try-catch.js";
import { ContainerFieldResolvers } from "../../shared/list.resolvers.js";

const VALID_STATES = ["created", "restarting", "running", "removing", "paused", "exited", "dead"] as const;

const schema = z.object({
  all: z.boolean().optional().default(false).describe("Include stopped containers"),
  id: z.string().optional().describe("Filter by container ID (partial match, takes precedence over name)"),
  name: z.string().optional().describe("Filter containers by name (partial match, case-insensitive)"),
  status: z.enum(VALID_STATES).optional().describe("Filter containers by status (e.g. running, exited, paused)"),
  includePorts: z.boolean().optional().default(false).describe("Include port bindings"),
  includeMounts: z.boolean().optional().default(false).describe("Include volume mounts"),
  includeNetworks: z.boolean().optional().default(false).describe("Include network settings"),
  includeUsage: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include CPU and memory usage (running containers only)"),
  includeLabels: z.boolean().optional().default(false).describe("Include container labels"),
  includeHealthcheck: z.boolean().optional().default(false).describe("Include healthcheck status and last log"),
  includeRestartInfo: z.boolean().optional().default(false).describe("Include restart policy and restart count"),
  includeComposeMetadata: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include Docker Compose metadata (project, service, config files)"),
  includeDependencyInfo: z.boolean().optional().default(false).describe("Include Compose service dependencies"),
  includeResourceLimits: z.boolean().optional().default(false).describe("Include CPU and memory resource limits"),
  includeStateDetails: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include detailed state (pid, exit code, started_at, oom_killed, etc.)"),
});

type Input = z.infer<typeof schema>;

export class ListContainersTool extends BaseTool {
  constructor(private readonly client: DockerClient) {
    super();
  }

  #buildListOptions(input: Input): Record<string, unknown> {
    const opts: Record<string, unknown> = { all: input.all };
    if (input.status) opts["filters"] = JSON.stringify({ status: [input.status] });
    return opts;
  }

  #applyClientFilter(
    containers: Awaited<ReturnType<ReturnType<DockerClient["getDocker"]>["listContainers"]>>,
    input: Input,
  ) {
    if (input.id) return containers.filter((c) => c.Id.toLowerCase().startsWith(input.id!.toLowerCase()));
    if (input.name)
      return containers.filter((c) => c.Names.some((n) => n.toLowerCase().includes(input.name!.toLowerCase())));
    return containers;
  }

  async #enrichContainer(
    c: Awaited<ReturnType<ReturnType<DockerClient["getDocker"]>["listContainers"]>>[number],
    docker: ReturnType<DockerClient["getDocker"]>,
    input: Input,
  ) {
    const base = { id: c.Id.slice(0, 12), names: c.Names, image: c.Image, status: c.Status, state: c.State };

    const needsInspect =
      input.includeHealthcheck || input.includeRestartInfo || input.includeResourceLimits || input.includeStateDetails;
    const inspect = needsInspect
      ? await docker
          .getContainer(c.Id)
          .inspect()
          .catch(() => null)
      : null;

    const extras = await Promise.all([
      input.includePorts ? ContainerFieldResolvers.ports(c) : null,
      input.includeMounts ? ContainerFieldResolvers.mounts(c) : null,
      input.includeNetworks ? ContainerFieldResolvers.networks(c) : null,
      input.includeUsage ? ContainerFieldResolvers.usage(c, docker) : null,
      input.includeLabels ? ContainerFieldResolvers.labels(c) : null,
      input.includeHealthcheck && inspect
        ? ContainerFieldResolvers.healthcheck(inspect)
        : input.includeHealthcheck
          ? { healthcheck: null }
          : null,
      input.includeRestartInfo && inspect
        ? ContainerFieldResolvers.restartInfo(inspect)
        : input.includeRestartInfo
          ? { restart_info: null }
          : null,
      input.includeComposeMetadata ? ContainerFieldResolvers.composeMetadata(c) : null,
      input.includeDependencyInfo ? ContainerFieldResolvers.dependencyInfo(c) : null,
      input.includeResourceLimits && inspect
        ? ContainerFieldResolvers.resourceLimits(inspect)
        : input.includeResourceLimits
          ? { resource_limits: null }
          : null,
      input.includeStateDetails && inspect
        ? ContainerFieldResolvers.stateDetails(inspect)
        : input.includeStateDetails
          ? { state_details: null }
          : null,
    ]);

    return Object.assign(base, ...extras.filter(Boolean));
  }

  async #handle(input: Input) {
    const outcome = await tryCatch(async () => {
      await this.client.checkConnection();
      const docker = this.client.getDocker();
      const containers = await docker.listContainers(this.#buildListOptions(input));
      const filtered = this.#applyClientFilter(containers, input);
      return Promise.all(filtered.map((c) => this.#enrichContainer(c, docker, input)));
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
          "Use id to filter by container ID (partial match, takes precedence over name). " +
          "Use name to filter by container name (partial match, case-insensitive). " +
          "Use status to filter by container status (running, exited, paused, etc.). " +
          "Use includeLabels, includeHealthcheck, includeRestartInfo, includeComposeMetadata, " +
          "includeDependencyInfo, includeResourceLimits, includeStateDetails, includePorts, " +
          "includeMounts, includeNetworks, includeUsage to request extra fields.",
        inputSchema: schema.shape,
      },
      this.#handle.bind(this),
    );
  }
}
