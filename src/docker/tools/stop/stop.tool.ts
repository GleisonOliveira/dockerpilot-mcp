import { z } from "zod";
import Dockerode from "dockerode";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DockerClient } from "../../../docker/client.js";
import { BaseTool } from "../../shared/base.tool.js";
import { tryCatch } from "../../../utils/try-catch.js";

const schema = z.object({
  names: z.array(z.string()).optional().describe("Container names to stop (partial match, case-insensitive). Omit to stop all running containers."),
  ids: z.array(z.string()).optional().describe("Container IDs to stop (prefix match). Omit to stop all running containers."),
  exclude: z.array(z.string()).optional().describe("Container names or IDs to exclude from stopping."),
  timeout: z.number().int().min(0).optional().default(10).describe("Seconds to wait before killing the container (default: 10)."),
  force: z.boolean().optional().default(false).describe("Force stop by sending SIGKILL immediately."),
  stopDependents: z.boolean().optional().default(false).describe("Also stop containers that depend on the targets (via Docker Compose depends_on labels). Only works for Compose-managed containers."),
  dryRun: z.boolean().optional().default(true).describe("Preview which containers would be stopped without actually stopping them. Default is true — set to false to actually stop containers."),
});

type Input = z.infer<typeof schema>;

type StopResult = {
  id: string;
  name: string;
  dependent: boolean;
  stopped: boolean;
  error?: string;
};

export class StopContainersTool extends BaseTool {
  constructor(private readonly client: DockerClient) {
    super();
  }

  #isExcluded(excluded: Set<string>, id: string, names: string[]): boolean {
    const shortId = id.slice(0, 12).toLowerCase();
    if (excluded.has(shortId) || excluded.has(id.toLowerCase())) return true;
    return names.some((n) => {
      const clean = n.replace(/^\//, "").toLowerCase();
      return excluded.has(clean) || excluded.has(n.toLowerCase());
    });
  }

  #getService(c: Dockerode.ContainerInfo): string {
    return (c.Labels?.["com.docker.compose.service"] ?? "").toLowerCase();
  }

  #getProject(c: Dockerode.ContainerInfo): string {
    return (c.Labels?.["com.docker.compose.project"] ?? "").toLowerCase();
  }

  #resolvePrimaryTargets(
    all: Dockerode.ContainerInfo[],
    excluded: Set<string>,
    names: string[] | undefined,
    ids: string[] | undefined,
  ): Dockerode.ContainerInfo[] {
    const hasFilters = (names && names.length > 0) || (ids && ids.length > 0);

    return all.filter((c) => {
      if (this.#isExcluded(excluded, c.Id, c.Names)) return false;
      if (!hasFilters) return true;

      const matchesName = names?.some((n) =>
        c.Names.some((cn) => cn.toLowerCase().includes(n.toLowerCase()))
      ) ?? false;

      const matchesId = ids?.some((id) =>
        c.Id.toLowerCase().startsWith(id.toLowerCase())
      ) ?? false;

      return matchesName || matchesId;
    });
  }

  #resolveDependents(
    all: Dockerode.ContainerInfo[],
    primaryTargets: Dockerode.ContainerInfo[],
    targetIds: Set<string>,
    excluded: Set<string>,
  ): Dockerode.ContainerInfo[] {
    return all.filter((c) => {
      if (targetIds.has(c.Id)) return false;
      if (this.#isExcluded(excluded, c.Id, c.Names)) return false;

      const raw = c.Labels?.["com.docker.compose.depends_on"] ?? "";
      if (!raw) return false;

      const deps = raw.split(",").map((s) => s.trim().split(":")[0].toLowerCase());
      const cProject = this.#getProject(c);

      return primaryTargets.some(
        (t) => this.#getProject(t) === cProject && deps.includes(this.#getService(t))
      );
    });
  }

  async #handle(input: Input) {
    const outcome = await tryCatch(async () => {
      await this.client.checkConnection();

      const docker = this.client.getDocker();

      const allRunning = await docker.listContainers({ all: false });

      const excluded = new Set((input.exclude ?? []).map((e) => e.toLowerCase()));

      const primaryTargets = this.#resolvePrimaryTargets(allRunning, excluded, input.names, input.ids);

      const targetIds = new Set(primaryTargets.map((c) => c.Id));

      const dependents = (input.stopDependents ?? false)
        ? this.#resolveDependents(allRunning, primaryTargets, targetIds, excluded)
        : [];

      const targets = [
        ...primaryTargets,
        ...dependents.filter((d) => !targetIds.has(d.Id)),
      ];

      const dependentIds = new Set(dependents.map((d) => d.Id));

      if (input.dryRun ?? true) {
        return {
          dryRun: true,
          force: input.force ?? false,
          timeout: input.force ? null : (input.timeout ?? 10),
          stopDependents: input.stopDependents ?? false,
          wouldStop: targets.map((c) => ({
            id: c.Id.slice(0, 12),
            name: c.Names[0]?.replace(/^\//, "") ?? c.Id.slice(0, 12),
            dependent: dependentIds.has(c.Id),
          })),
        };
      }

      const results: StopResult[] = await Promise.all(
        targets.map(async (c) => {
          const name = c.Names[0]?.replace(/^\//, "") ?? c.Id.slice(0, 12);
          const id = c.Id.slice(0, 12);
          const dependent = dependentIds.has(c.Id);

          if (input.force) {
            const r = await tryCatch(() => docker.getContainer(c.Id).kill());
            return r.success
              ? { id, name, dependent, stopped: true }
              : { id, name, dependent, stopped: false, error: r.error };
          }

          const r = await tryCatch(() =>
            docker.getContainer(c.Id).stop({ t: input.timeout ?? 10 })
          );
          return r.success
            ? { id, name, dependent, stopped: true }
            : { id, name, dependent, stopped: false, error: r.error };
        })
      );

      return { dryRun: false, results };
    });

    if (!outcome.success) {
      return {
        content: [{ type: "text" as const, text: `Error stopping containers: ${outcome.error}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(outcome.result, null, 2) }],
    };
  }

  register(server: McpServer): void {
    server.registerTool(
      "stop_containers",
      {
        description:
          "Stop running Docker containers. " +
          "Pass names (partial match) or ids (prefix match) to target specific containers; omit both to stop all running containers. " +
          "Use exclude to protect containers by name or ID. " +
          "Use timeout to set the grace period before SIGKILL (default 10s). " +
          "Use force to send SIGKILL immediately. " +
          "Use stopDependents=true to also stop containers that declare a Compose depends_on on any target (same project only). " +
          "Use dryRun=true to preview what would be stopped without taking action.",
        inputSchema: schema.shape,
      },
      this.#handle.bind(this)
    );
  }
}
