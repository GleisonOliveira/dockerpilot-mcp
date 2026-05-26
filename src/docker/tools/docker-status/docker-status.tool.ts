import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DockerClient } from "../../../docker/client.js";
import { BaseTool } from "../../shared/base.tool.js";
import { tryCatch } from "../../../utils/try-catch.js";

export class DockerStatusTool extends BaseTool {
  constructor(private readonly client: DockerClient) {
    super();
  }

  async #handle() {
    const outcome = await tryCatch(async () => {
      await this.client.checkConnection();
      const docker = this.client.getDocker();

      const [info, version, df] = await Promise.all([docker.info(), docker.version(), docker.df()]);

      return {
        status: "running",
        version: {
          engine: version.Version,
          api: version.ApiVersion,
          go: version.GoVersion,
          os: version.Os,
          arch: version.Arch,
          kernel: version.KernelVersion,
          build_time: version.BuildTime,
        },
        system: {
          hostname: info.Name,
          os: info.OperatingSystem,
          os_type: info.OSType,
          kernel: info.KernelVersion,
          architecture: info.Architecture,
          cpus: info.NCPU,
          memory_total_bytes: info.MemTotal,
          docker_root_dir: info.DockerRootDir,
          logging_driver: info.LoggingDriver,
          cgroup_driver: info.CgroupDriver,
          cgroup_version: info.CgroupVersion,
        },
        containers: {
          total: info.Containers,
          running: info.ContainersRunning,
          paused: info.ContainersPaused,
          stopped: info.ContainersStopped,
        },
        images: {
          total: info.Images,
        },
        disk_usage: {
          images: {
            count: df.Images?.length ?? 0,
            total_size_bytes: df.Images?.reduce((sum: number, img: { Size?: number }) => sum + (img.Size ?? 0), 0) ?? 0,
            reclaimable_bytes:
              df.Images?.reduce(
                (sum: number, img: { ReclaimableSize?: number; Containers?: number }) =>
                  img.Containers === 0 ? sum + (img.ReclaimableSize ?? 0) : sum,
                0,
              ) ?? 0,
          },
          volumes: {
            count: df.Volumes?.length ?? 0,
            total_size_bytes:
              df.Volumes?.reduce(
                (sum: number, v: { UsageData?: { Size?: number } }) => sum + (v.UsageData?.Size ?? 0),
                0,
              ) ?? 0,
          },
          build_cache: {
            count: df.BuildCache?.length ?? 0,
            total_size_bytes: df.BuildCache?.reduce((sum: number, b: { Size?: number }) => sum + (b.Size ?? 0), 0) ?? 0,
          },
        },
        plugins: {
          volume: info.Plugins?.Volume ?? [],
          network: info.Plugins?.Network ?? [],
          log: info.Plugins?.Log ?? [],
        },
        swarm: {
          active: info.Swarm?.LocalNodeState === "active",
          state: info.Swarm?.LocalNodeState ?? "inactive",
        },
        warnings: info.Warnings ?? [],
      };
    });

    if (!outcome.success) {
      return {
        content: [
          { type: "text" as const, text: JSON.stringify({ status: "unavailable", error: `${outcome.error}` }) },
        ],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(outcome.result, null, 2) }],
    };
  }

  register(server: McpServer): void {
    server.registerTool(
      "docker_status",
      {
        description:
          "Returns Docker daemon health and system information: engine version, API version, OS/arch, " +
          "container counts (running/paused/stopped), total images, disk usage (images, volumes, build cache), " +
          "active plugins, Swarm state, and any daemon warnings. No parameters required.",
        inputSchema: {},
      },
      this.#handle.bind(this),
    );
  }
}
