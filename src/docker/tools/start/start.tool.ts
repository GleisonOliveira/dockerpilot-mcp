import { z } from "zod";
import Dockerode from "dockerode";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DockerClient } from "../../../docker/client.js";
import { BaseTool } from "../../shared/base.tool.js";
import { tryCatch } from "../../../utils/try-catch.js";
import { isExcluded, resolveDependencies } from "../../shared/dependency-resolver.js";

const schema = z.object({
  names: z
    .array(z.string())
    .optional()
    .describe("Container names to start (partial match, case-insensitive). Omit to start all stopped containers."),
  ids: z
    .array(z.string())
    .optional()
    .describe("Container IDs to start (prefix match). Omit to start all stopped containers."),
  exclude: z.array(z.string()).optional().describe("Container names or IDs to exclude from starting."),
  startDependencies: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Also start containers that the targets depend on (via Docker Compose depends_on labels), resolved recursively. Only applies within the same Compose project.",
    ),
  summarized: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "When true (default), returns only { success: true } on a successful real run. Set to false to get the full per-container result list.",
    ),
  dryRun: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Preview which containers would be started without actually starting them. Default is false — set to true to preview.",
    ),
});

type Input = z.infer<typeof schema>;

type StartResult = {
  id: string;
  name: string;
  dependency: boolean;
  started: boolean;
  error?: string;
};

export class StartContainersTool extends BaseTool {
  constructor(private readonly client: DockerClient) {
    super();
  }

  #resolvePrimaryTargets(
    all: Dockerode.ContainerInfo[],
    excluded: Set<string>,
    names: string[] | undefined,
    ids: string[] | undefined,
  ): Dockerode.ContainerInfo[] {
    const hasFilters = (names && names.length > 0) || (ids && ids.length > 0);

    return all.filter((c) => {
      if (isExcluded(excluded, c.Id, c.Names)) return false;
      if (!hasFilters) return true;

      const matchesName = names?.some((n) => c.Names.some((cn) => cn.toLowerCase().includes(n.toLowerCase()))) ?? false;

      const matchesId = ids?.some((id) => c.Id.toLowerCase().startsWith(id.toLowerCase())) ?? false;

      return matchesName || matchesId;
    });
  }

  async #handle(input: Input) {
    const outcome = await tryCatch(async () => {
      await this.client.checkConnection();

      const docker = this.client.getDocker();

      const allStopped = await docker.listContainers({
        all: true,
        filters: JSON.stringify({ status: ["exited", "created", "paused"] }),
      });

      const excluded = new Set((input.exclude ?? []).map((e) => e.toLowerCase()));

      const primaryTargets = this.#resolvePrimaryTargets(allStopped, excluded, input.names, input.ids);

      const targetIds = new Set(primaryTargets.map((c) => c.Id));

      const dependencies =
        (input.startDependencies ?? false) ? resolveDependencies(allStopped, primaryTargets, targetIds, excluded) : [];

      const dependencyIds = new Set(dependencies.map((d) => d.Id));

      const targets = input.startDependencies
        ? [...dependencies.filter((d) => !targetIds.has(d.Id)), ...primaryTargets]
        : [...primaryTargets];

      if (input.dryRun ?? false) {
        return {
          dryRun: true,
          startDependencies: input.startDependencies ?? false,
          wouldStart: targets.map((c) => ({
            id: c.Id.slice(0, 12),
            name: c.Names[0]?.replace(/^\//, "") ?? c.Id.slice(0, 12),
            dependency: dependencyIds.has(c.Id),
          })),
        };
      }

      const results: StartResult[] = await Promise.all(
        targets.map(async (c) => {
          const name = c.Names[0]?.replace(/^\//, "") ?? c.Id.slice(0, 12);
          const id = c.Id.slice(0, 12);
          const dependency = dependencyIds.has(c.Id);

          const r = await tryCatch(() => docker.getContainer(c.Id).start());
          return r.success
            ? { id, name, dependency, started: true }
            : { id, name, dependency, started: false, error: r.error };
        }),
      );

      if (input.summarized ?? true) return { success: true };
      return { dryRun: false, results };
    });

    if (!outcome.success) {
      return {
        content: [{ type: "text" as const, text: `Error starting containers: ${outcome.error}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(outcome.result, null, 2) }],
    };
  }

  register(server: McpServer): void {
    server.registerTool(
      "start_containers",
      {
        description:
          "Start stopped Docker containers. " +
          "Pass names (partial match) or ids (prefix match) to target specific containers; omit both to start all stopped containers. Containers are matched regardless of their Compose project. " +
          "Use exclude to protect containers by name or ID. " +
          "Use startDependencies=true to also start containers that the targets depend on, resolved recursively (same Compose project only). " +
          "Use dryRun=true to preview what would be started without taking action.",
        inputSchema: schema.shape,
      },
      this.#handle.bind(this),
    );
  }
}
