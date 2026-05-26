import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DockerClient } from "../../../docker/client.js";
import { BaseTool } from "../../shared/base.tool.js";
import { tryCatch } from "../../../utils/try-catch.js";

const VALID_DRIVERS = ["local", "nfs", "tmpfs", "overlay2"] as const;

const schema = z.object({
  containerId: z.string().describe("Container ID (full or prefix) to associate the volume with. [all drivers]"),
  name: z.string().optional().describe("Volume name. If omitted, Docker generates a random name. [all drivers]"),

  // driver select
  driver: z
    .enum(VALID_DRIVERS)
    .optional()
    .default("local")
    .describe(
      "Volume driver to use. Select one: local (default, host filesystem), nfs (network share), tmpfs (in-memory, not persisted), overlay2 (layered fs). [all drivers]",
    ),

  // mount path inside container
  containerPath: z
    .string()
    .optional()
    .describe(
      "Absolute path inside the container where the volume will be mounted (e.g. /app/data, /var/lib/mysql). [all drivers]",
    ),

  // mount options (checkboxes)
  readOnly: z
    .boolean()
    .optional()
    .default(false)
    .describe("Mount the volume as read-only inside the container (adds 'ro' mount option). [all drivers]"),
  nocopy: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Disable copying existing container data into the volume on mount (adds 'nocopy' mount option). [all drivers]",
    ),

  // driver-specific options (text fields)
  mountpoint: z
    .string()
    .optional()
    .describe("Host path to use as volume source via bind mount (e.g. /mnt/data). [driver: local only]"),
  nfsServer: z
    .string()
    .optional()
    .describe("NFS server hostname or IP address (e.g. 192.168.1.10). [driver: nfs only]"),
  nfsShare: z
    .string()
    .optional()
    .describe("Exported share path on the NFS server (e.g. /exports/data). [driver: nfs only]"),
  nfsVersion: z
    .enum(["3", "4"])
    .optional()
    .describe("NFS protocol version to use. Options: 3, 4. Default: 4. [driver: nfs only]"),
  tmpfsSize: z
    .string()
    .optional()
    .describe(
      "Maximum size of the tmpfs volume (e.g. 100m, 1g). If omitted, uses all available memory. [driver: tmpfs only]",
    ),
  tmpfsMode: z
    .string()
    .optional()
    .describe("File permission mode for the tmpfs mount in octal (e.g. 1777, 0755). [driver: tmpfs only]"),

  // labels (text field)
  labels: z
    .record(z.string())
    .optional()
    .describe("Key-value labels to attach to the volume (e.g. { env: prod, app: web }). [all drivers]"),
});

type Input = z.infer<typeof schema>;

export class CreateVolumeTool extends BaseTool {
  constructor(private readonly client: DockerClient) {
    super();
  }

  #findContainer(containers: Awaited<ReturnType<ReturnType<DockerClient["getDocker"]>["listContainers"]>>, id: string) {
    const match = containers.find((c) => c.Id.toLowerCase().startsWith(id.toLowerCase()));
    if (!match) throw new Error(`No container found matching ID prefix: ${id}`);
    return match;
  }

  #buildDriverOpts(input: Input): Record<string, string> {
    const opts: Record<string, string> = {};

    if (input.driver === "local" && input.mountpoint) {
      opts["device"] = input.mountpoint;
      opts["type"] = "none";
      opts["o"] = "bind";
    }

    if (input.driver === "nfs") {
      if (input.nfsServer) opts["addr"] = input.nfsServer;
      if (input.nfsShare) opts["device"] = `:${input.nfsShare}`;
      if (input.nfsVersion) opts["vers"] = input.nfsVersion;
    }

    if (input.driver === "tmpfs") {
      if (input.tmpfsSize) opts["size"] = input.tmpfsSize;
      if (input.tmpfsMode) opts["mode"] = input.tmpfsMode;
    }

    return opts;
  }

  #buildMountOptions(input: Input): string[] {
    const opts: string[] = [];
    if (input.readOnly) opts.push("ro");
    if (input.nocopy) opts.push("nocopy");
    return opts;
  }

  async #handle(input: Input) {
    if (!input.containerId?.trim()) {
      return {
        content: [{ type: "text" as const, text: "Error creating volume: containerId is required." }],
        isError: true,
      };
    }

    const outcome = await tryCatch(async () => {
      await this.client.checkConnection();
      const docker = this.client.getDocker();

      const containers = await docker.listContainers({ all: true });
      const container = this.#findContainer(containers, input.containerId);
      const shortId = container.Id.slice(0, 12);
      const containerName = container.Names[0]?.replace(/^\//, "") ?? shortId;

      const driverOpts = this.#buildDriverOpts(input);
      const mountOpts = this.#buildMountOptions(input);

      const volume = await docker.createVolume({
        Name: input.name,
        Driver: input.driver ?? "local",
        DriverOpts: driverOpts,
        Labels: {
          ...(input.labels ?? {}),
          "mcp.container.id": shortId,
          "mcp.container.name": containerName,
        },
      });

      return {
        created: true,
        volume: {
          name: volume.Name,
          driver: volume.Driver,
          mountpoint: volume.Mountpoint,
          scope: volume.Scope,
          labels: volume.Labels,
          options: volume.Options,
        },
        container: {
          id: shortId,
          name: containerName,
          state: container.State,
        },
        mountOptions: {
          containerPath: input.containerPath ?? null,
          readOnly: input.readOnly ?? false,
          nocopy: input.nocopy ?? false,
          extraOptions: mountOpts,
        },
        note:
          "Volume created and associated via labels. To mount it into the container, " +
          "recreate the container with this volume or use docker update if supported by your runtime." +
          (input.containerPath ? ` Suggested mount path: ${input.containerPath}.` : ""),
      };
    });

    if (!outcome.success) {
      return {
        content: [{ type: "text" as const, text: `Error creating volume: ${outcome.error}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(outcome.result, null, 2) }],
    };
  }

  register(server: McpServer): void {
    server.registerTool(
      "create_volume",
      {
        description:
          "Create a Docker volume associated with a container. " +
          "containerId is required (full or prefix). [all drivers] " +
          "containerPath: absolute path inside the container where the volume should be mounted (e.g. /app/data). [all drivers] " +
          "Checkboxes: readOnly — mount as read-only [all drivers]; nocopy — skip copying container data on mount [all drivers]. " +
          "Driver select: local (host filesystem, default), nfs (network share), tmpfs (in-memory, not persisted), overlay2 (layered fs). " +
          "Text fields: name — volume name [all drivers]; mountpoint — host bind-mount path [local only]; " +
          "nfsServer, nfsShare, nfsVersion (3|4) [nfs only]; tmpfsSize, tmpfsMode [tmpfs only]. " +
          "Labels: key-value pairs attached to the volume [all drivers]. " +
          "Note: Docker does not support hot-mounting volumes into running containers; " +
          "recreating the container is required to apply the mount.",
        inputSchema: schema.shape,
      },
      this.#handle.bind(this),
    );
  }
}
